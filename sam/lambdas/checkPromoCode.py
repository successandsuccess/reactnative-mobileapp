import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
PROMO_CODES_DATA_TABLE ='PromotionCodes'

def lambda_handler(event, context):
    body        = json.loads(event['body'])
    print(body)

    promoCode = body['promo_code']

    tbl_promo_codes = dynamodb.Table(PROMO_CODES_DATA_TABLE)

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_promo_codes = dynamodb.Table(f"dev_{PROMO_CODES_DATA_TABLE}")
    
    return checkPromoCode(promoCode, tbl_promo_codes)
    
    
class DecimalEncoder(json.JSONEncoder):
  def default(self, obj):
    if isinstance(obj, Decimal):
      return str(obj)
    return json.JSONEncoder.default(self, obj)


def checkPromoCode(promoCode, table):
    response = table.get_item(
      Key = {
        'code': promoCode
      }  
    )
    
    if response['Item']:
        promoCodeObj = response['Item']
        
        toReturn = {
            'valid': True,
            'promo_id': promoCodeObj['promo_id'],
            'customer_id': promoCodeObj['customer_id'],
            'promo_code': promoCodeObj['code'],
            'times_used': int(promoCodeObj['times_used']),
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps(toReturn, cls=DecimalEncoder)
        }
        
    else:
        toReturn = {
            'valid': False
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps(toReturn, cls=DecimalEncoder)
        }