import json
from decimal import Decimal
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key, Attr
import uuid
import stripe

secret_key = ''

restaurantProfile = {
    "id": "",
    "name": "",
    "username": "",
    "email": "",
    "picture": "",
    "address": "",
    "city": "",
    "state": "",
    "zipcode": "",
    "phone_number": "",
    "admin": False,
    "reset_password": False,
    "accepted_terms": False,
    "active_subscription": False,
    "facebook": "",
    "instagram": "",
    "stripe_id": "",
    "first_time": True,
}

dynamodb = boto3.resource('dynamodb')
RESTAURANT_DATA_TABLE           = 'Restaurants'
RESTAURANT_SUBSCRIPTION_TABLE   = 'RestaurantSubscriptions'
PROMOS_DATA_TABLE               = 'Promotions'

def lambda_handler(event, context):
    client = boto3.client('secretsmanager')
    
    body        = json.loads(event['body'])
    print(json.dumps(body))

    tbl_restaurant = dynamodb.Table(RESTAURANT_DATA_TABLE)
    tbl_promos = dynamodb.Table(PROMOS_DATA_TABLE)

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_restaurant = dynamodb.Table(f"dev_{RESTAURANT_DATA_TABLE}")
        tbl_promos = dynamodb.Table(f"dev_{PROMOS_DATA_TABLE}")
    
    if (env == 'prd'):
        secret_key = keys['stripe-secret']
    else:
        secret_key = keys['stripe-secret']
    
    print("1:" + secret_key)
    stripe.api_key = secret_key
    
    fields = list(restaurantProfile.keys())
    restaurantProfile.update({field: body.get(field, restaurantProfile[field]) for field in fields})
    print(restaurantProfile)
    
    restaurant          = getRestaurant(restaurantProfile, tbl_restaurant)
    promos              = getPromos(restaurant, tbl_promos)

    response = {
        "user": restaurant,
        "promos": promos
    }
    
    return json.dumps(response, default=default)



# Used to handle Decimals in database, JSON serializer has issues otherwise
def default(obj):
  if isinstance(obj, Decimal):
    return str(obj)
  raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)



def getRestaurant(restaurantProfile, table):
    id = restaurantProfile["id"]

    response = table.get_item(
      Key={
          'id': id
      }
    )
    
    if 'Item' in response:
        # subscriptionStatus = getSubscriptionStatus(id)
        
        return response['Item']
    else:
        return createNewUser(restaurantProfile, table)
    


def createNewUser(restaurantProfile, table):
    stripeObject = stripe.Customer.create(
       description=restaurantProfile['name'],
       email=restaurantProfile['email']
    )
    
    restaurantProfile["stripe_id"] = stripeObject['id']
    
    table.put_item(
        Item = restaurantProfile
    )

    return getRestaurant(restaurantProfile, table)
    


def getPromos(restaurantProfile, table):
    promotion_response = table.scan(FilterExpression=Attr('restaurant_id').eq(restaurantProfile['id']))

    return promotion_response['Items']