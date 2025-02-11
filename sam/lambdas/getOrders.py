import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
CUSTOMER_ORDERS_DATA_TABLE ='CustomerOrders'
CUSTOMER_DATA_TABLE = 'Customers'
def lambda_handler(event, context):
    print(event)

    tbl_customer_orders = dynamodb.Table(CUSTOMER_ORDERS_DATA_TABLE)
    tbl_customers = dynamodb.Table(CUSTOMER_DATA_TABLE)
    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_customer_orders = dynamodb.Table(f"dev_{CUSTOMER_ORDERS_DATA_TABLE}")
        tbl_customers = dynamodb.Table(f"dev_{CUSTOMER_DATA_TABLE}")
    
    if 'queryStringParameters' in event:
        
        # Example: Accessing a specific query parameter named 'example'
        id = query_params.get('id', 'none')
        customer = tbl_customers.scan(
            FilterExpression='id = :id',
            ExpressionAttributeValues={':id': id}
        )['Items']
        print("customer")
        print(customer)
        if(len(customer) > 0):
            customer = customer[0]
            orders = tbl_customer_orders.scan(
                FilterExpression='customer_id = :id',
                ExpressionAttributeValues={':id': customer['id']}
            )['Items']
            print("fetched orders")
            print(orders)
        else:
            print("no customer id matched")
            orders = []
        return orders
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