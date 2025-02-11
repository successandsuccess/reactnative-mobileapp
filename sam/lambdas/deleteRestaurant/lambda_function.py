import json
import boto3

# client = boto3.client('cognito-idp', region_name='us-west-2')
RESTAURANT_DATA_TABLE           = 'Restaurants'


def lambda_handler(event, context):
    print(json.dumps(event))
    
    body = json.loads(event.get("body", "{}"))
    statusCode = deleteRestaurant(body['id'])

    return {
        'status_code': statusCode
    }


def deleteRestaurant(incomingId, dynamodb = None):
    if not dynamodb:
        dynamodb = boto3.resource('dynamodb')
        
    table = dynamodb.Table(RESTAURANT_DATA_TABLE)
    
    restaurant = table.get_item(
      Key={
          'id': incomingId
      }
    )
    
    if 'Item' in restaurant:
        # try:
        #     response = client.admin_delete_user(
        #         UserPoolId='us-west-2_yFTjtxUb3',
        #         Username=incomingId
        #     )
        #     print(response)
        # except Exception as e:
        #     print(e)
        #     return 500

        table.delete_item(
            Key={
                'id': incomingId
            }
        )
            
        return 200  
    else:
        return 422