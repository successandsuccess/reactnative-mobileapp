import json
import boto3
from decimal import Decimal

CUSTOMER_ORDERS_DATA_TABLE ='CustomerOrders'
CUSTOMER_DATA_TABLE ='Customers'

def lambda_handler(event, context):
    print(event)
    
    if 'queryStringParameters' in event:
        # Access the query string parameters
        query_params = event['queryStringParameters']
        print(query_params)
        
        # Example: Accessing a specific query parameter named 'example'
        rest_id = query_params.get('id', 'none')
    
        dynamodb = boto3.resource('dynamodb')
        orders = dynamodb.Table(CUSTOMER_ORDERS_DATA_TABLE).scan(    
            FilterExpression='restaurant_id = :id',
            ExpressionAttributeValues={':id': rest_id}
        )['Items']

        customerNames = {}
        
        for o in orders:
            cust_id = o['customer_id']
            if cust_id in customerNames:
                o["customer_name"] = customerNames[cust_id]
            else:
                customer = dynamodb.Table(CUSTOMER_DATA_TABLE).get_item(
                  Key={
                      'id': cust_id
                  }
                )['Item']
                customerNames[cust_id] = customer['preferred_name']
                o["customer_name"] = customer['preferred_name']
        
        print(orders)
        return json.dumps({
            'orders': orders
        }, default=default)
    else:
        return json.dumps({
            'orders': []
        }, default=default)
    
    return []
    
    
# Used to handle Decimals in database, JSON serializer has issues otherwise
def default(obj):
  if isinstance(obj, Decimal):
    return str(obj)
  raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)