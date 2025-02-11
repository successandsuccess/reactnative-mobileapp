import json
import boto3

RESTAURANTS_DATA_TABLE ='Restaurants'
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    tbl_restaurants = dynamodb.Table(RESTAURANTS_DATA_TABLE)

    
    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_restaurants = dynamodb.Table(f"dev_{RESTAURANTS_DATA_TABLE}")

    promos = tbl_restaurants.scan()
    
    return promos['Items']
