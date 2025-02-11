import json
import boto3
from decimal import Decimal

RESTAURANT_PROMOS_DATA_TABLE ='Promotions'

def lambda_handler(event, context):
    print(event)
    
    if 'queryStringParameters' in event:
        # Access the query string parameters
        query_params = event['queryStringParameters']
        print(query_params)
        
        # Example: Accessing a specific query parameter named 'example'
        rest_id = query_params.get('id', 'none')
    
        dynamodb = boto3.resource('dynamodb')
        orders = dynamodb.Table(RESTAURANT_PROMOS_DATA_TABLE).scan(    
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