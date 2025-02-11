import json
import stripe
import boto3

client = boto3.client('secretsmanager')
secretKey = ''
publishableKey = ''

CUSTOMER_DATA_TABLE     ='Customers'


def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    tbl_customer = dynamodb.Table(CUSTOMER_DATA_TABLE)
    
    body            = json.loads(event['body'])
    print("body:\n", body)
    
    amount          = body['amount']
    customer        = body['customer']
    print("customer:\n", customer)
    
    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_customer = f"dev_{CUSTOMER_DATA_TABLE}"
    
    
    if (env == 'prd'):
        secretKey = keys['stripe-secret']
        publishableKey = keys['stripe-public']
    else:
        secretKey = keys['stripe-secret']
        publishableKey = keys['stripe-public']
        
    stripe.api_key = secretKey
    stripeId, paymentIntent = getPaymentIntent(amount, customer['stripe_id']) if ('stripe_id' in customer and customer['stripe_id']) else createStripeCustomer(amount, customer, table=tbl_customer)
    
    # this is for connected stripe account
    # stripeId, paymentIntent = getPaymentIntent(amount, customer['stripe_account_id'])
    print(paymentIntent)

    ephemeralKey = stripe.EphemeralKey.create(
        customer=stripeId,
        stripe_version='2020-08-27',
    )

    return {
        'statusCode': 200,
        'body': json.dumps({
            'payment_intent': paymentIntent['client_secret'],
            'ephemeral_key': ephemeralKey['secret'],
            'stripe_customer_id': stripeId,
            'publishable_key': publishableKey
        })
    }


# def getCustomer(cognito_id, dynamodb=None):
#     if not dynamodb:
#         dynamodb = boto3.resource('dynamodb')

#     table = dynamodb.Table(CUSTOMER_DATA_TABLE)
#     response = table.get_item(
#         Key={
#             'id': cognito_id
#         }
#     )
    
#     return response['Item']
    

def createStripeCustomer(amount, customer, table):
    customer_email = customer['email']
    stripe_customer_search = stripe.Customer.search(query=f"email:'{customer_email}'")
    found = False
    
    if (len(stripe_customer_search['data']) > 0):
        stripe_customer = stripe_customer_search['data'][0]
        found = True
    else:
        stripe_customer = stripe.Customer.create(
          name=customer['preferred_name'],
          email=customer['email'],
        )
    
    stripeId = stripe_customer['id'] or ""

    if (stripeId):
        if not found:
            updateCustomer(customer, stripe_customer['id'], table)
        return getPaymentIntent(amount, stripe_customer['id'])
    else: 
        return {}
        
        
def updateCustomer(customer, stripeId, table):
    response = table.update_item(
        Key={
            'id': customer['id']
        },
        UpdateExpression="set stripe_id=:id",
        ExpressionAttributeValues={
            ':id': stripeId
        },
        ReturnValues="UPDATED_NEW"
    )
    
    print(response)

def getPaymentIntent(amount, stripeId):

    paymentIntent = stripe.PaymentIntent.create(
      amount=amount,
      customer=stripeId,
      currency="usd",
      automatic_payment_methods={"enabled": True},
    )
    print("paymentIntent:\n", paymentIntent)
    return stripeId, paymentIntent



def create_payment_intent(amount, stripe_account_id):
    try:
        paymentIntent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            customer=stripe_account_id,  # Use the connected account ID
            payment_method='pm_card_visa',  # Example payment method (card for testing)
            confirm=True,  # Automatically confirm the PaymentIntent
            capture_method='manual',  # Or 'automatic', adjust based on your flow
        )
        return paymentIntent
    except stripe.error.StripeError as e:
        print(f"Stripe error: {e}")
        raise e
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise e

def get_connected_account(account_id):
    try:
        account = stripe.Account.retrieve(account_id)
        print("Account retrieved:", account)
        return account
    except stripe.error.InvalidRequestError as e:
        print(f"Stripe error: No such customer or connected account: {account_id}")
        raise e