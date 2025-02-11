import json
from datetime import datetime, timedelta
import boto3


code = {
    "id": 0,
    "customer_id": "",
    "code": "",
    "expires_at": "",
    "order_id": "",
    "promo_id": ""
}

dynamodb = boto3.resource('dynamodb')

CODES_DATA_TABLE       ='RedeemCodes'

def lambda_handler(event, context):
    body        = json.loads(event['body'])

    customer_id     = body['customer_id']
    code            = body['code']
    order_id        = body['order_id']
    promo_id        = body['promo_id']

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    tbl_prefix = "dev_" if env == 'dev' else ""

    tbl_redeem_codes = dynamodb.Table(f"{tbl_prefix}{CODES_DATA_TABLE}")
    
    # Use the scan operation to count items in the table
    scan_response = tbl_redeem_codes.scan(Select='COUNT')

    # Retrieve the count from the scan response
    item_count = scan_response.get('Count', 0)
    
    tbl_redeem_codes.put_item(
        Item={
            'id': int(item_count),
            'customer_id': str(customer_id),
            'code': str(code),
            'order_id': str(order_id),
            'promo_id': str(promo_id),
            'expires_at': str(datetime.now() + timedelta(days=30))
        }
    )
    
    return {
        'status_code': 200
    }

