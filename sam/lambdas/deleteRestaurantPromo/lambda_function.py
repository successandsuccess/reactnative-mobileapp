import json
import boto3
import stripe
import math

client = boto3.client('secretsmanager')

PROMOS_DATA_TABLE               = 'Promotions'

promoStruct = {
    "id": "",
    "title": "",
    "budget": 0,
    "content_id": "",
    "description": "",
    "discount": 0,
    "start_time": 0,
    "end_time": 0,
    "max_uses": 0,
    "apply_to": "",
    "restaurant_id": "",
    "product_id": "",
    "si_id": "",
    "stripe_id": "",
    "total_purchased": 0,
    "total_ref_created": 0,
    "total_ref_used": 0,
    "created_at": 0,
    "updated_at": 0
}


def lambda_handler(event, context):
    body   = json.loads(event['body'])
    fields = list(promoStruct.keys())
    env         = 'dev'
    
    if 'queryStringParameters' in event:
        # Access the query string parameters
        query_params = event['queryStringParameters']
        
        # Example: Accessing a specific query parameter named 'example'
        env = query_params.get('env', 'dev')
    
    if (env == 'prd'):
        secret_key = keys['stripe-secret']
    else:
        secret_key = keys['stripe-secret']
        
    stripe.api_key = secret_key
    
    promoStruct.update({field: body.get(field, promoStruct[field]) for field in fields})
    
    successfullyDeleted = deletePromo(promoStruct)
    
    return {
        'statusCode': 200,
        'body': {
            "successfully_deleted": successfullyDeleted
        }
    }


def deletePromo(promoDetails, dynamodb=None):
    if not dynamodb:
        dynamodb = boto3.resource('dynamodb')
    
    total   = promoDetails['total_purchased']
    counted = promoDetails['total_ref_created']
    
    deletedFromStripe   = False
    successfullyDeleted = False
    
    try:
        if int(total) > 0:
            if (total > counted):
                print("deleted 1")
                si_id               = promoDetails['si_id']
                todaysValue         = total - counted
                todaysTimestamp     = math.floor(time.time())
                updatedUsageDone    = stripe.SubscriptionItem.create_usage_record(
                    si_id,
                    quantity=todaysValue,
                    timestamp=todaysTimestamp,
                )
                
                print(f"usage updated for {si_id}")
                print(updatedUsageDone)
                
                response = stripe.Subscription.delete(
                    promoDetails['stripe_id'],
                    invoice_now=True
                )
                print(response)
            else:
                print("deleted 1.1")
                response = stripe.Subscription.delete(
                    promoDetails['stripe_id'],
                    invoice_now=True
                )
                print(response)
        else:
            print("deleted 2")
            response = stripe.Subscription.delete(
                promoDetails['stripe_id']
            )
            print(response)
            
        deletedFromStripe = True
    except Exception as e:
        print(f"An exception of type {type(e).__name__} occurred: {e}")
    
    
    if (deletedFromStripe):
        table = dynamodb.Table('Promotions')
        table.delete_item(
            Key={
                'id': promoDetails['id']
            }    
        )
        successfullyDeleted = True
    
    return successfullyDeleted
    
    
def deleteFromDBOnly (promoDetails, dynamodb=None):
    if not dynamodb:
        dynamodb = boto3.resource('dynamodb')
        
    table = dynamodb.Table('Promotions')
    table.delete_item(
        Key={
            'id': promoDetails['id']
        }    
    )
    return True