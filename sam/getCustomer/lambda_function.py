import json
from decimal import Decimal
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key, Attr
import uuid
# import stripe


customerProfile = {
    "id": "",
    "credit": 0,
    "credit_on_hold": 0,
    "email": "",
    "first_time": True,
    "accepted_terms": False,
    "picture": "",
    "preferred_name": "",
    "street": "",
    "state": "",
    "zipcode": "",
    "used_promo_list": {},
    "stripe_id": ""
}

CUSTOMER_DATA_TABLE     ='Customers'
RESTAURANT_DATA_TABLE   ='Restaurants'
PROMOS_DATA_TABLE       ='Promotions'

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb') 
    tbl_customer = dynamodb.Table(CUSTOMER_DATA_TABLE)
    tbl_restaurant = dynamodb.Table(RESTAURANT_DATA_TABLE)
    tbl_promos = dynamodb.Table(PROMOS_DATA_TABLE)
    
    body        = json.loads(event['body'])
    print(body)
    
    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env))
    if env == 'dev':
        tbl_customer = dynamodb.Table(f"dev_{CUSTOMER_DATA_TABLE}")
        tbl_restaurant = dynamodb.Table(f"dev_{RESTAURANT_DATA_TABLE}")
        tbl_promos = dynamodb.Table(f"dev_{PROMOS_DATA_TABLE}")
    
    incoming_id = body['incoming_id']
    email       = body['email']
    name        = body['preferred_name']
    street      = body['street']
    state       = body['state']
    zipcode     = body['zipcode']
    access_code = body.get('access_code')
    user_type   = body.get('user_type')
    
    print(event['body'])
    
    
    customer    = getCustomer(incoming_id, email, name, street, state, zipcode, access_code, user_type, tbl_customer)
    promos      = getPromos(tbl_promos)
    
    response = {
        "user": customer,
        "promos": promos,
    }
    
    return json.dumps(response, default=default)


# Used to handle Decimals in database, JSON serializer has issues otherwise
def default(obj):
  if isinstance(obj, Decimal):
    return float(obj)
  raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)


def getCustomer(cognito_id, email, name, street, state, zipcode, access_code, user_type, table):
    response = table.get_item(
        Key={
            'id': cognito_id
        }
    )
    
    
    if 'Item' in response:
        return response['Item']
    else:
        return createNewUser(cognito_id, email, name, street, state, zipcode, access_code, user_type, table)


def createNewUser(cognito_id, email, name,  street, state, zipcode, access_code, user_type, table):
    table.put_item(
        Item={
            'id': cognito_id,
            'email': email,
            'preferred_name': name,
            'street': street,
            'state': state,
            'zipcode': zipcode,
            'picture': '',
            'used_promo_list': {},
            'credit': int(0),
            'credit_on_hold': int(0),
            'stripe_id': '',
            'first_time': True,
            'access_code': access_code,
            'user_type': user_type
        }
    )

    return getCustomer(cognito_id, email, name, street, state, zipcode, access_code, user_type, table)


# def getRestaurants(table):
#     restaurants = table.scan()
    
#     return restaurants


def getPromos(table):
    promos = table.scan()
    return promos['Items']