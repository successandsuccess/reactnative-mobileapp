import json
import boto3
import stripe
from boto3.dynamodb.conditions import Key, Attr

client = boto3.client('secretsmanager')
secretKey = ''
publishableKey = ''

CUSTOMER_DATA_TABLE     ='Customers'

def lambda_handler(event, context):
    try:
        # Extract customer-specific information from the request
        dynamodb = boto3.resource('dynamodb')
        tbl_customer = dynamodb.Table(CUSTOMER_DATA_TABLE)
        body = json.loads(event["body"])
        customer_id = body.get("customer_id")  # Unique customer ID in your system

        # default to "dev" if not prod
        query_params = event.get('queryStringParameters', {})
        env = query_params.get('env', 'dev')
        print("running in %s mode"%(env)) 
        if env == 'dev':
            tbl_customer = dynamodb.Table(f"dev_{CUSTOMER_DATA_TABLE}")
        
        if (env == 'prd'):
            secretKey = keys['stripe-secret']
            publishableKey = keys['stripe-public']
        else:
            secretKey = keys['stripe-secret']
            publishableKey = keys['stripe-public']
            
        stripe.api_key = secretKey

        if not customer_id:
            raise ValueError("Customer ID is required.")

        # Create a new Stripe connected account for this customer
        account = stripe.Account.create(
            type="express",
            business_type="individual",
            capabilities={
                "transfers": {"requested": True},  # Enable transfers capability
            },
        )

        # Optionally, store the `account.id` in your database associated with this `customer_id`
        # (You should implement this storage logic in your real application)

        # Create an account link for onboarding
        account_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url="https://yourdomain.com/reauth",
            return_url="https://yourdomain.com/success",
            type="account_onboarding",
        )
        # Retrieve account details
        account_detail = retrieve_account(account.id)

        # save create account_id for every customer
        try:
            res = tbl_customer.update_item(
                Key={
                    'id': customer_id
                },
                UpdateExpression="set stripe_account_id = :a",
                ExpressionAttributeValues={
                    ':a': account.id
                }
            )
            print(res)
        except Exception as e:
            print(f"An exception of type {type(e).__name__} occurred: {str(e)}")
            res = e
        # save end
        
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "url": account_link.url, 
                "account_id": account.id
                }),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
        }

def retrieve_account(account_id):
        try:
            account = stripe.Account.retrieve(account_id)
            print(f"Account details for account {account_id}:{account}")
            return account
        except stripe.error.StripeError as e:
            # Handle Stripe API errors
            print(f"Stripe API error: {str(e)}")
            return None
