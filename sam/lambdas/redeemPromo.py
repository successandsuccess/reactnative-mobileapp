import json
import boto3
from decimal import Decimal
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
CODES_DATA_TABLE            = 'RedeemCodes'
ORDERS_DATA_TABLE           = 'CustomerOrders'

# Initialize the API Gateway management client for sending messages back to WebSocket clients
stage = 'dev'

def lambda_handler(event, context):
    print(event['body'])
    body            = json.loads(event['body'])
    customer_id     = body['customer_id']
    promo_id        = body['promo_id']
    code            = body['code']
    reject          = body.get('reject', False)

    tbl_codes = dynamodb.Table(CODES_DATA_TABLE)
    tbl_orders = dynamodb.Table(ORDERS_DATA_TABLE)

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_codes = dynamodb.Table(f"dev_{CODES_DATA_TABLE}")
        tbl_orders = dynamodb.Table(f"dev_{ORDERS_DATA_TABLE}")
    
    order_id, code_id = checkCode(code, customer_id, promo_id, tbl_codes)

    # if order_id exists
    if order_id and not reject:
        updated = updatePromoOrder(order_id, code_id, customer_id, tbl_codes, tbl_orders)
        if updated:
            toReturn = {
                'success': True
            }
            
            response_message = {'message': 'Order Updated!', 'order': updated}
            sendWebsocketResponse(response_message)
            return {
                'statusCode': 200,
                'body': json.dumps(toReturn, cls=DecimalEncoder)
            }
        else:
            toReturn = {
                'success': False
            }
            
            response_message = {'message': 'Promo code not valid!'}
            sendWebsocketResponse(response_message)
            return {
                'statusCode': 200,
                'body': json.dumps(toReturn, cls=DecimalEncoder)
            }
    elif order and reject:
        deleted = deletePromoOrder(order_id, customer_id, tbl_orders)
        if deleted:
            toReturn = {
                'success': True
            }
            response_message = {'message': 'Order Rejected!', 'order': deleted}
            sendWebsocketResponse(response_message)
            return {
                'statusCode': 200,
                'body': json.dumps(toReturn, cls=DecimalEncoder)
            }
        else:
            toReturn = {
                'success': False
            }
            
            response_message = {'message': 'Failed to Reject Promo Order!'}
            sendWebsocketResponse(response_message)
            return {
                'statusCode': 200,
                'body': json.dumps(toReturn, cls=DecimalEncoder)
            }
    else:
        toReturn = {
            'success': False
        }
        return {
            'statusCode': 200,
            'body': json.dumps(toReturn, cls=DecimalEncoder)
        }
    
def sendWebsocketResponse(response_message):
    response_message_json = json.dumps(response_message, default=default)
    try:
        apigateway_management.post_to_connection(
            ConnectionId=connection_id,
            Data=response_message_json
        )
    except apigateway_management.exceptions.GoneException:
        print(f'Connection {connection_id} is no longer available.')
    except Exception as e:
        print("Exception: ")
        print(e)
    
class DecimalEncoder(json.JSONEncoder):
  def default(self, obj):
    if isinstance(obj, Decimal):
      return str(obj)
    return json.JSONEncoder.default(self, obj)


def checkCode(code, customer_id, promo_id, tbl_codes):
    # No need to scan for code, just find customer_id in the promo table
    response = tbl_codes.scan(
        FilterExpression='customer_id = :cid', # code = :c AND 
        ExpressionAttributeValues={
            # ':c': code,
            ':cid': customer_id,
        }
    )

    codeOptions = response.get('Items', [])

    # Find the customers associated promo_id they claimed
    codeList = [obj for obj in codeOptions if obj.get('promo_id') == promo_id] # and obj.get('code') == code (not needed without verification code check, just need to find the promo_id that matches with the user)
    
    if (codeList):
        code = max(codeList, key=lambda x: x.get('expires_at')) if len(codeList) > 1 else codeList[0]
        expires_at = code.get('expires_at') 
        if str(datetime.now()) <= expires_at:
            return code.get('order_id'), code.get('id')
        else:
            return '', ''
    else:
        return '', ''


def updatePromoOrder(order_id, code_id, customer_id, tbl_codes, tbl_orders):
    update_expression = 'SET used = :u'
    expression_attribute_values = {
        ':u': True,
    }
    
    response = tbl_orders.update_item(
        Key={
            'id': order_id,
            'customer_id': customer_id
        },
        UpdateExpression=update_expression,
        ExpressionAttributeValues=expression_attribute_values,
    )
    
    if response['ResponseMetadata']['HTTPStatusCode'] == 200:
        r = tbl_codes.delete_item(
            Key={
                'id': code_id,
                'customer_id': customer_id
            }
        )
        if r['ResponseMetadata']['HTTPStatusCode'] == 200:
            return True
        else:
            return False
    else:
        return False

def deletePromoOrder(order_id, customer_id, tbl_orders):
    response = tbl_orders.delete_item(
        Key={
            'id': order_id,
            'customer_id': customer_id
        }
    )

    if response['ResponseMetadata']['HTTPStatusCode'] == 200:
        return True
    else:
        return False