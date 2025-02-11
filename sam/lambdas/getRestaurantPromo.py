import json
from decimal import Decimal, getcontext, ROUND_HALF_UP
import boto3
import uuid
import stripe
import math
import time

client = boto3.client('secretsmanager')
dynamodb = boto3.resource('dynamodb')

PROMOS_DATA_TABLE               = 'Promotions'
getcontext().prec = 2

promoStruct = {
    'id': '',
    'title': '',
    'budget': 0,
    'content_id': '',
    'description': '',
    'limit': 0,
    'cost': 0,
    'discount': 0,
    'start_time': 0,
    'end_time': 0,
    'max_uses': 0,
    'apply_to': '',
    'restaurant_id': '',
    'product_id': '',
    'si_id': '',
    'stripe_id': '',
    'total_purchased': 0,
    'total_ref_created': 0,
    'total_ref_used': 0,
    'created_at': 0,
    'updated_at': 0
}


def lambda_handler(event, context):
    print(event['body'])
    body        = json.loads(event['body'])
    response    = {}

    tbl_promos = dynamodb.Table(PROMOS_DATA_TABLE)

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    
    if (env == 'prd'):
        secret_key = keys['stripe-secret']
    else:
        tbl_promos = dynamodb.Table(f"dev_{PROMOS_DATA_TABLE}")
        secret_key = keys['stripe-secret']
        
    stripe.api_key = secret_key
    
    
    fields = list(promoStruct.keys())
    promoStruct.update({field: body.get(field, promoStruct[field]) for field in fields})
    
    restaurantEmail    = body['email'] if 'email' in body else ''
    restaurantPhone    = body['phone'] if 'phone' in body else ''
    restaurantStripeId = body['user_stripe_id'] if 'user_stripe_id' in body else ''

    # get stripe customer first
    customerId = restaurantStripeId if len(restaurantStripeId) > 0 else getCustomerInformation(restaurantEmail, restaurantPhone)
    
    if (customerId):
        # if customer is found, THEN we search for the promo
        if (len(promoStruct['id']) > 0):
            found = getPromo(promoStruct, tbl_promos)
        # elif (testing):
        #     found = createPromoInJustDB(promoStruct['restaurant_id'], promoStruct)
        else:
            found = createPromo(promoStruct['restaurant_id'], promoStruct, customerId, tbl_promos)
        
        if (found):
            response = {
                'statusCode': 200,
                'promo': found
            }
        else: 
            response = {
                'statusCode': 500,
                'message': 'Something went wrong. Please check logs.'
            }
    else:
        response = {
            'statusCode': 422,
            'message': 'Stripe customer not found.'
        }

    return json.dumps(response, default=default)



# Used to handle Decimals in database, JSON serializer has issues otherwise
def default(obj):
  if isinstance(obj, Decimal):
    return str(obj)
  raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)

    
def getPromo(promoDetails, tbl_promos):
    response = tbl_promos.get_item(
      Key={
          'id': promoDetails['id']
      }
    )
    
    if 'Item' in response:
        return response['Item']
    else:
        return None



def createPromo(restaurantId, promoDetails, stripeCustomerId, tbl_promos):
    fee = float('{:.4f}'.format((float(promoDetails['discount']) * 0.3) * 100))

    limit_fee = float("{:.2f}".format(float(promoDetails['discount']) * 0.3))
    limit = math.floor((float(promoDetails['budget'])) / limit_fee)
    
    des = f'''
{promoDetails['description']}.
    
0 out of {limit} sold.
    '''
    product = stripe.Product.create(name=promoDetails['title'])
    
    price = stripe.Price.create(
      currency='usd',
      recurring={
          'interval': 'month',
          'usage_type':'metered'
      },
      unit_amount_decimal=fee,
      product=product['id'],
    )
    
    subscription = stripe.Subscription.create(
      customer=stripeCustomerId,
      description=des,
      items=[
          {
              'price': price['id']
          }
        ],
      metadata={
          'restaurantId': restaurantId,
          'promotionId': promoDetails['id'],
          'title':promoDetails['title'],
          'content_id':promoDetails['content_id']
      },
    )

    pID = str(uuid.uuid1())
    now = int(time.time() * 1000)
    try:
        tbl_promos.put_item(
            Item={
                'id': pID,
                'title': promoDetails['title'],
                'budget': Decimal(promoDetails['budget']),
                'content_id': promoDetails['content_id'],
                'description': promoDetails['description'],
                'limit': limit,
                'cost': Decimal(str(round((float(promoDetails['discount']) / 0.9), 2))),
                'discount': Decimal(promoDetails['discount']),
                'start_time': int(promoDetails['start_time']),
                'end_time': int(promoDetails['end_time']),
                'max_uses': int(promoDetails['max_uses']),
                'apply_to': promoDetails['apply_to'],
                'restaurant_id': restaurantId,
                'product_id': product['id'],
                'si_id': subscription['items']['data'][0]['id'],
                'stripe_id': subscription['id'],
                'total_purchased': int(promoDetails['total_purchased']),
                'total_ref_created': int(promoDetails['total_ref_created']),
                'total_ref_used': int(promoDetails['total_ref_used']),
                'created_at': now,
                'updated_at': now
            }
        )
        promoDetails['id'] = pID
        return getPromo(promoDetails, tbl_promos)
    except Exception as e:
        print(f'An exception of type {type(e).__name__} occurred: {e}')


def getCustomerInformation(email, phone):
    if (not phone):
        existing = stripe.Customer.search(
            query=f'email:\'{email}\'',
        )
    else:
        existing = stripe.Customer.search(
          query=f'email:\'{email }\' OR phone:\'{phone}\'',
        )
    
    return existing.get('data', [{}])[0].get('id')
    
    
def createPromoInJustDB(restaurantId, promoDetails, tbl_promos):
    limit_fee = float("{:.2f}".format(float(promoDetails['discount']) * 0.3))
    limit = math.floor(promoDetails['budget'] / limit_fee)

    pID = str(uuid.uuid1())
    now = int(time.time() * 1000)
    try:
        tbl_promos.put_item(
            Item={
                'id': pID,
                'title': promoDetails['title'],
                'budget': int(promoDetails['budget']),
                'content_id': promoDetails['content_id'],
                'description': promoDetails['description'],
                'limit': limit,
                'discount': int(promoDetails['discount']),
                'start_time': int(promoDetails['start_time']),
                'end_time': int(promoDetails['end_time']),
                'max_uses': int(promoDetails['max_uses']),
                'apply_to': promoDetails['apply_to'],
                'restaurant_id': restaurantId,
                'total_purchased': int(promoDetails['total_purchased']),
                'total_ref_created': int(promoDetails['total_ref_created']),
                'total_ref_used': int(promoDetails['total_ref_used']),
                'created_at': now,
                'updated_at': now
            }
        )   
        return getPromo(promoDetails, tbl_promos)
    except Exception as e:
        print(f'An exception of type {type(e).__name__} occurred: {e}')