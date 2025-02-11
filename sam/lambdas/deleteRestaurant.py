import json
import boto3

# client = boto3.client('cognito-idp', region_name='us-west-2')
dynamodb = boto3.resource('dynamodb')

RESTAURANT_DATA_TABLE           = 'Restaurants'


def lambda_handler(event, context):
    print(json.dumps(event))

    tbl_restaurant = dynamodb.Table(RESTAURANT_DATA_TABLE)

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_restaurant = dynamodb.Table(f"dev_{RESTAURANT_DATA_TABLE}")
    
    body = json.loads(event.get("body", "{}"))
    statusCode = deleteRestaurant(body['id'], tbl_restaurant)

    return {
        'status_code': statusCode
    }


def deleteRestaurant(incomingId, tbl_restaurant):
    restaurant = tbl_restaurant.get_item(
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

        tbl_restaurant.delete_item(
            Key={
                'id': incomingId
            }
        )
            
        return 200  
    else:
        return 422