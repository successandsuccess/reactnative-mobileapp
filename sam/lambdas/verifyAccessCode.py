import json
import boto3
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource('dynamodb')
CUSTOMER_DATA_TABLE = 'Customers'

client = boto3.client('secretsmanager', region_name='us-west-1')


def lambda_handler(event, context):
    tbl_customer = dynamodb.Table(CUSTOMER_DATA_TABLE)

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_customer = dynamodb.Table(f"dev_{CUSTOMER_DATA_TABLE}")
    
    code = query_params.get("code", "")
    
    if not code:
        return {
            'statusCode': 400,
            'body': json.dumps({
                "message": "Missing expected query param 'code'"
            })
        }
    
    isValid = validate_access_code(code)
    
    if not isValid:
        return {
            'statusCode': 401,
            'body': json.dumps({
                "valid": False,
                "message": "Invalid Access Code. User is not authorized to create an account"
            })
        }
        
    user_type = determine_user_type(code, tbl_customer)
    
    if user_type == 'follower':
        return {
            'statusCode': 401,
            'body': json.dumps({
                "valid": True,
                "used": True,
                "message": "Invalid Access Code. This access code has already been used"
            })
        }
        
    return {
        'statusCode': 200,
        'body': json.dumps({
            "message": "Valid Access Code. User is authorized to create an account",
            "user_type": user_type
        })
    }
    
def validate_access_code(code):
    codes = keys["codes"]
    code_list = codes.split(",")
    
    print("Checking validity of code", code)
    return code in code_list

def determine_user_type(code, table):
    response = table.scan(FilterExpression=Attr('access_code').eq(code))
    
    return 'follower' if response.get('Items') else 'creator'