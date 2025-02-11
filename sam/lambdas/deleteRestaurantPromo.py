import json
import boto3
import stripe
import math

client = boto3.client('secretsmanager')
dynamodb = boto3.resource('dynamodb')

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
    print(event['body'])
    body   = json.loads(event['body'])
    fields = list(promoStruct.keys())

    tbl_promos = dynamodb.Table(PROMOS_DATA_TABLE)

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if (env == 'prd'):
        secret_key = keys['stripe-secret']
    else:
        tbl_promos = dynamodb.Table(f"dev_{PROMOS_DATA_TABLE}")
        secret_key = keys['stripe-secret']
        
    stripe.api_key = secret_key
    
    promoStruct.update({field: body.get(field, promoStruct[field]) for field in fields})
    
    successfullyDeleted = deletePromo(promoStruct, tbl_promos)
    
    return {
        'statusCode': 200,
        'body': {
            "successfully_deleted": successfullyDeleted
        }
    }


def deletePromo(promoDetails, tbl_promos):
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
        tbl_promos.delete_item(
            Key={
                'id': promoDetails['id']
            }    
        )
        successfullyDeleted = True
    
    return successfullyDeleted
    
    
def deleteFromDBOnly (promoDetails, tbl_promos):
    tbl_promos.delete_item(
        Key={
            'id': promoDetails['id']
        }    
    )
    return True