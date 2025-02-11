import json
from decimal import Decimal
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key, Attr
import uuid
# import stripe


CUSTOMER_DATA_TABLE     ='Customers'

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(CUSTOMER_DATA_TABLE)
    
    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        table = dynamodb.Table(f"dev_{CUSTOMER_DATA_TABLE}")
    
    body            = json.loads(event['body'])
    
    id              = body['incoming_id']
    credit          = round(Decimal(body['credit']), 2)
    creditOnHold    = round(Decimal(body['credit_on_hold']), 2)
    picture         = body['picture']
    name            = body['preferred_name']
    usedPromoList   = body['used_promo_list']
    email           = body['email']
    street          = body['street']
    state           = body['state']
    zipcode         = body['zipcode']
    first_time      = body['first_time']
    accepted_terms  = body['accepted_terms']

    response = ''
    
    try: 
        response = table.update_item(
            Key={
                'id': id
            },
            UpdateExpression="set credit=:c,credit_on_hold=:coh,picture=:p,preferred_name=:pn,used_promo_list=:upl,email=:u,street=:s,#s=:st,zipcode=:z,first_time=:ft,accepted_terms=:at",
            ExpressionAttributeNames={
                '#s': 'state',
            },
            ExpressionAttributeValues={
                ':c': credit,
                ':coh': creditOnHold,
                ':p': picture,
                ':pn': name,
                ':upl': usedPromoList,
                ':u': email,
                ':s': street,
                ':st': state,
                ':z': zipcode,
                ':ft': first_time,
                ':at': accepted_terms
            },
            ReturnValues="UPDATED_NEW"
        )
        print(response)
    except Exception as e:
        # Code to handle the exception
        print(f"An exception of type {type(e).__name__} occurred: {str(e)}")
        response = e
    
    return json.dumps(response, default=default)


# Used to handle Decimals in database, JSON serializer has issues otherwise
def default(obj):
  if isinstance(obj, Decimal):
    return str(obj)
  raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)