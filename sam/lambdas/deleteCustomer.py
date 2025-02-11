import json
import boto3

# client = boto3.client('cognito-idp', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb')
CUSTOMER_DATA_TABLE           = 'Customers'

def lambda_handler(event, context):
    tbl_customer = dynamodb.Table(CUSTOMER_DATA_TABLE)

    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    
    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_customer = dynamodb.Table(f"dev_{CUSTOMER_DATA_TABLE}")
        
    incoming_id = body.get('incomingId')
    
    if not incoming_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': "expected incomingId in payload body"})
        }
    
    try:
        response = deleteCustomer(incoming_id, table=tbl_customer)
        print("responding with:", response)
        return response
        
    except Exception as err:
        print("Encountered exception:", err)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': "encountered internal exception while deleting customer"})
        }

def deleteCustomer(incomingId, table):
    customer = table.get_item(
      Key={
          'id': incomingId
      }
    )
    
    if 'Item' in customer:
        item = customer.get('Item', {})
        print('customer found: ', item)
        credit = round(float(item.get("credit", 0)), 2)
        credit_on_hold = round(float(item.get("credit_on_hold", 0)), 2)
        
        if credit>0 or credit_on_hold>0:
            print('customer has credit, returning ')
            return {
                'statusCode': 418,
                'body': json.dumps({
                    'message': 'ERROR: unable to delete customer due to credit balance or outstanding cashout request',
                    'credit': credit,
                    'credit_on_hold': credit_on_hold
                })
            }
        else: 
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
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': "sucessfully deleted customer associated with id %s"%(incomingId)
                })
            }
    else:
        return {
            'statusCode': 422,
            'body': json.dumps({
                'message': 'ERROR: unable to find customer associated with id %s'%(incomingId)
            })
        }