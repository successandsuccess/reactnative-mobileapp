import json
import boto3
from decimal import Decimal
from datetime import datetime, timedelta

CODES_DATA_TABLE            = 'RedeemCodes'
ORDERS_DATA_TABLE           = 'CustomerOrders'

def lambda_handler(event, context):
    body            = json.loads(event['body'])
    customer_id     = body['customer_id']
    promo_id        = body['promo_id']
    code            = body['code']
    
    order_id, code_id = checkCode(code, customer_id, promo_id)

    if order_id:
        updated = updatePromoOrder(order_id, code_id, customer_id)
        if updated:
            toReturn = {
                'success': True
            }
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
    else:
        toReturn = {
            'success': False
        }
        return {
            'statusCode': 200,
            'body': json.dumps(toReturn, cls=DecimalEncoder)
        }
    
    
class DecimalEncoder(json.JSONEncoder):
  def default(self, obj):
    if isinstance(obj, Decimal):
      return str(obj)
    return json.JSONEncoder.default(self, obj)


def checkCode(code, customer_id, promo_id, dynamodb=None):
    if not dynamodb:
        dynamodb = boto3.resource('dynamodb')
    codesTable = dynamodb.Table(CODES_DATA_TABLE)
    
    response = codesTable.scan(
        FilterExpression='code = :c AND customer_id = :cid',
        ExpressionAttributeValues={
            ':c': code,
            ':cid': customer_id,
        }
    )

    codeOptions = response.get('Items', [])

    codeList = [obj for obj in codeOptions if obj.get('promo_id') == promo_id and obj.get('code') == code]
    
    if (codeList):
        code = max(codeList, key=lambda x: x.get('expires_at')) if len(codeList) > 1 else codeList[0]
        expires_at = code.get('expires_at') 
        if str(datetime.now()) <= expires_at:
            return code.get('order_id'), code.get('id')
        else:
            return '', ''
    else:
        return '', ''


def updatePromoOrder(order_id, code_id, customer_id, dynamodb=None):
    if not dynamodb:
        dynamodb = boto3.resource('dynamodb')
    ordersTable = dynamodb.Table(ORDERS_DATA_TABLE)
    codesTable  = dynamodb.Table(CODES_DATA_TABLE)
    
    update_expression = 'SET used = :u'
    expression_attribute_values = {
        ':u': True,
    }
    
    response = ordersTable.update_item(
        Key={
            'id': order_id,
            'customer_id': customer_id
        },
        UpdateExpression=update_expression,
        ExpressionAttributeValues=expression_attribute_values,
    )
    
    if response['ResponseMetadata']['HTTPStatusCode'] == 200:
        r = codesTable.delete_item(
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