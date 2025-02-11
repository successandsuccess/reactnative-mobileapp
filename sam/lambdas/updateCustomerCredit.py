import json
import boto3
from decimal import Decimal
import math

dynamodb = boto3.resource('dynamodb')
CUSTOMER_DATA_TABLE           = 'Customers'

def lambda_handler(event, context):
    tbl_customer = dynamodb.Table(CUSTOMER_DATA_TABLE)

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_customer = dynamodb.Table(f"dev_{CUSTOMER_DATA_TABLE}")

    incoming_id = event['incoming_id']
    credit = event['credit']
    code = updateCustomer(incoming_id, credit, tbl_customer)
    
    # TODO implement
    return {
        'status_code': code
    }


def updateCustomer(incoming_id, credit, table):
    customer = table.get_item(
      Key={
        'id': incoming_id
      }  
    )
    
    if 'Item' in customer:
        currentCredit = customer['Item']['credit']
        newCredit =round((currentCredit + Decimal(credit)), 2)
        
        response = table.update_item(
            Key = {
                'id':incoming_id
            },
            UpdateExpression="set credit=:m",
            ExpressionAttributeValues={
                ':m': newCredit
            },
            ReturnValues="UPDATED_NEW"
        )
        
        return 200
    else:
        return 422
        