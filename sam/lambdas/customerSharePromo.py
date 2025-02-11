import json
from decimal import Decimal
from datetime import datetime
import boto3
import hashlib
import uuid

dynamodb = boto3.resource('dynamodb')
dynamodb_client = boto3.client('dynamodb')

PROMOS_DATA_TABLE ='Promotions'
PROMO_CODES_DATA_TABLE ='PromotionCodes'

def lambda_handler(event, context):
    body   = json.loads(event['body'])
    print(body)

    tbl_promos_name = PROMOS_DATA_TABLE
    tbl_promo_codes_name = PROMO_CODES_DATA_TABLE

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_promos_name = f"dev_{PROMOS_DATA_TABLE}"
        tbl_promo_codes_name = f"dev_{PROMO_CODES_DATA_TABLE}"
    
    tbl_promos = dynamodb.Table(tbl_promos_name)
    tbl_promo_codes = dynamodb.Table(tbl_promo_codes_name)
    
    retVal, timesUsed = promo_update(body['promo_id'], body['cust_id'], tbl_promo_codes_name, tbl_promo_codes, tbl_promos)

    return {
        'body': json.dumps({
            'code': retVal,
            'times_used': timesUsed
        }),
        'statusCode': 200,
    }


def promo_update(promoId, userId, tbl_promo_codes_name, tbl_promo_codes, tbl_promos):
    code = ''
    print(promoId)
    print(userId)
    
    promoCodeEntry = dynamodb_client.query(
        TableName=tbl_promo_codes_name,
        IndexName='promo_id-customer_id-index',  # Replace with the actual name of your secondary index
        KeyConditionExpression='promo_id = :promoId AND customer_id = :userId',
        ExpressionAttributeValues={
            ':promoId': {'S': promoId},
            ':userId': {'S': userId}
        }
    )
    
    print(promoCodeEntry)
    
    if 'Items' in promoCodeEntry and len(promoCodeEntry['Items']) > 0:
        return promoCodeEntry['Items'][0]['code']['S'], promoCodeEntry['Items'][0]['times_used']['N']
        
    else:
        pId = str(uuid.uuid1())
        
        # Take a portion of the UUIDs
        promo_part = promoId[:4]
        user_part = userId[:4]
    
        # Concatenate the parts
        combined = promo_part + user_part
    
        # Use hashlib to hash the combined string
        hashed_code = hashlib.md5(combined.encode()).hexdigest()
        promo_code = (hashed_code[:4]+'-'+hashed_code[4:8]).upper()
        
        tbl_promo_codes.put_item(
            Item={
                'id': pId,
                'code': promo_code,
                'promo_id': promoId,
                'customer_id': userId,
                'times_used': 0,
                'created_at': datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f'),
                'updated_at': datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
            }    
        )
        tbl_promos.update_item(
            Key={
                'id': promoId
            },    
            UpdateExpression="set total_ref_created = total_ref_created + :val1",
            ExpressionAttributeValues={":val1": 1},
        )
        
        return promo_code, 0