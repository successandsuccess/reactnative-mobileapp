import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
PROMOS_DATA_TABLE ='Promotions'

def lambda_handler(event, context):
    print(event)

    tbl_promos = dynamodb.Table(PROMOS_DATA_TABLE)

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 

    if env == 'dev':
       tbl_promos = dynamodb.Table(f"dev_{PROMOS_DATA_TABLE}")
    
    if 'queryStringParameters' in event:
        # Access the query string parameters
        query_params = event['queryStringParameters']
        print(query_params)
        
        # Example: Accessing a specific query parameter named 'example'
        rest_id = query_params.get('id', 'none')
    
        orders = tbl_promos.scan(    
            FilterExpression='restaurant_id = :id',
            ExpressionAttributeValues={':id': rest_id}
        )['Items']

        return json.dumps({
            'promos': orders
        }, default=default)
    else:
        return json.dumps({
            'promos': []
        }, default=default)
    
    return []
    
    
# Used to handle Decimals in database, JSON serializer has issues otherwise
def default(obj):
  if isinstance(obj, Decimal):
    return str(obj)
  raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)