import json
import boto3
from decimal import Decimal
import math

def lambda_handler(event, context):
    body        = json.loads(event['body'])
    print(body)
    
    change =  body['change']
    promo = body['id']
    
    code = updatePromo(promo, change)
    
    # TODO implement
    return {
        'status_code': code
    }


def updatePromo(promoId, change, dynomodb = None):
    if not dynomodb:
        dynomodb = boto3.resource("dynamodb")
    
    table = dynomodb.Table("Promotions")
    
    try:
        response = table.update_item(
            Key={
                'id': promoId
            },
            UpdateExpression="set total_ref_created=total_ref_created + :v",
            ExpressionAttributeValues={
                ':v': change
            },
            ReturnValues="UPDATED_NEW"
        )
        return 200
    except Exception as e:
        print(e)
        return 422
        