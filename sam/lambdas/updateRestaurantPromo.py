import json
from decimal import Decimal, getcontext, ROUND_HALF_UP
import boto3
import uuid
import stripe
import math
import time

client = boto3.client('secretsmanager')
dynamodb = boto3.resource('dynamodb')

secret_key = ''
getcontext().prec = 2

PROMOS_DATA_TABLE               = 'Promotions'

promoStruct = {
    "id": "",
    "title": "",
    "budget": 0,
    "content_id": "",
    "description": "",
    "limit": 0,
    "cost": 0,
    "discount": 0,
    "start_time": 0,
    "end_time": 0,
    "max_uses": 0,
    "apply_to": "",
    "restaurant_id": "",
    "product_id": "",
    "si_id": "",
    "stripe_id": "",
    "total_purchased": 0,
    "total_ref_created": 0,
    "total_ref_used": 0,
    "created_at": 0,
    "updated_at": 0
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
    customer            = restaurantStripeId if len(restaurantStripeId) > 0 else getCustomerInformation(restaurantEmail, restaurantPhone)
    
    if (customer):
        # if customer is found, THEN we search for the promo
        found       = getPromo(promoStruct, customer, tbl_promos)

        if (found):
            response = {
                "statusCode": 200
            }
        else: 
            response = {
                "statusCode": 500,
                "message": "Something went wrong. Please check logs."
            }
    else:
        response = {
            "statusCode": 422,
            "message": "Stripe customer not found."
        }
        
    return json.dumps(response, default=default)



# Used to handle Decimals in database, JSON serializer has issues otherwise
def default(obj):
  if isinstance(obj, Decimal):
    return str(obj)
  raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)


    
def getPromo(promoDetails, stripeCustomerInfo, tbl_promos, updated=False):
    response = tbl_promos.get_item(
      Key={
          'id': promoDetails["id"]
      }
    )
    
    if 'Item' in response:
        if updated:
            return response['Item']
        else:
            oldPromoDetails = response['Item']
            priceChange     = oldPromoDetails['discount'] != promoDetails['discount'] or oldPromoDetails['budget'] != promoDetails['budget']
            updatedPromo    = updatePromo(oldPromoDetails, promoDetails['restaurant_id'], promoDetails, priceChange, stripeCustomerInfo, tbl_promos)
            
            return updatedPromo
    else:
        return None


def updatePromo(oldPromoDetails, restaurantId, promoDetails, priceChange, stripeCustomerInfo, tbl_promos):
    print(promoDetails)
    print(oldPromoDetails)
    si_id = promoDetails['si_id']
    limit = oldPromoDetails['limit']
    cost = oldPromoDetails['cost']

    if (priceChange and stripeCustomerInfo):
        fee = float("{:.2f}".format(float(promoDetails['discount']) * 0.3))
        limit = math.floor(float(promoDetails['budget']) / fee)
        cost = Decimal(str(round((float(promoDetails['discount']) * 1.1), 2)))
        print(fee)
        des = f"""
    {promoDetails['description']}.
    {promoDetails["total_purchased"]} sold.
        """
        price = stripe.Price.create(
          currency="usd",
          recurring={
              "interval": "month",
              "usage_type":"metered"
          },
          unit_amount_decimal=fee,
          product=promoDetails['product_id'],
        )
        subscription = stripe.Subscription.modify(
          promoDetails["stripe_id"],
          description=des,
          items=[
              {
                  "price": price['id']
              }
            ]
        )
        listOfItems = subscription['items']['data']
        index = len(listOfItems) - 1
        si_id = subscription['items']['data'][index]['id']
    
    
    expression_attribute_names = {'#limit': 'limit'}  
    try:
        tbl_promos.update_item(
            Key={
                'id': promoDetails['id']
            },    
            UpdateExpression="set title=:val1, budget=:val2, content_id=:val3, description=:val4, discount=:val5, cost=:val16, start_time=:val6, end_time=:val7, max_uses=:val8, apply_to=:val9, si_id=:val10, total_purchased=:val11, total_ref_created=:val12, total_ref_used=:val13, updated_at=:val14, #limit=:val15",
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues={
                ':val1': promoDetails['title'],
                ':val2': promoDetails['budget'],
                ':val3': promoDetails['content_id'],
                ':val4': promoDetails['description'],
                ':val15': limit,
                ':val5': promoDetails['discount'],
                ':val16': cost,
                ':val6': promoDetails['start_time'],
                ':val7': promoDetails['end_time'],
                ':val8': promoDetails['max_uses'],
                ':val9': promoDetails['apply_to'],
                ':val10': si_id,
                ':val11': promoDetails['total_purchased'],
                ':val12': promoDetails['total_ref_created'],
                ':val13': promoDetails['total_ref_used'],
                ':val14': int(time.time() * 1000),
            },
        )
        return getPromo(promoDetails, stripeCustomerInfo, tbl_promos, True)
    except Exception as e:
        print(f"An exception of type {type(e).__name__} occurred: {e}")
        return None


def getCustomerInformation(email, phone):
    if (not phone):
        existing = stripe.Customer.search(
            query=f'email:\'{email}\'',
        )
    else:
        existing = stripe.Customer.search(
          query=f'email:\'{email}\' OR phone:\'{phone}\'',
        )
    
    return existing['data'][0]