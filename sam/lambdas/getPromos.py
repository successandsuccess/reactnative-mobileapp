import json
import boto3

dynamodb = boto3.resource('dynamodb')
PROMOS_DATA_TABLE ='Promotions'

def lambda_handler(event, context):
    
    tbl_promos = dynamodb.Table(PROMOS_DATA_TABLE)

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_promos = dynamodb.table(f"dev_{PROMOS_DATA_TABLE}")
    
    promos = tbl_promos.scan()
    
    return promos['Items']
