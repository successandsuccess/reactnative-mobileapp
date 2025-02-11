import json
import stripe
import boto3

client = boto3.client('secretsmanager')
dynamodb = boto3.resource('dynamodb')
secretKey = ''
publishableKey = ''

CUSTOMER_DATA_TABLE     ='Customers'

def lambda_handler(event, context):
    tbl_customer = dynamodb.Table(CUSTOMER_DATA_TABLE)
    
    body            = json.loads(event['body'])
    print("request body:\n", body)
    
    customer        = body['customer']
    print("customer:\n", customer)
    
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
    
    stripeId = customer.get('stripe_id', '')
    stripeId, setupIntent = getSetupIntent(stripeId) if stripeId else createStripeCustomer(customer, table=tbl_customer)
    ephemeralKey = stripe.EphemeralKey.create(
        customer=stripeId,
        stripe_version='2020-08-27',
    )
    
    body = json.dumps({
        'setup_intent': setupIntent['client_secret'],
        'ephemeral_key': ephemeralKey['secret'],
        'stripe_customer_id': stripeId,
        'publishable_key': publishableKey
    })
    print("response body:\n", body)

    return {
        'statusCode': 200,
        'body': body
    }
    
def createStripeCustomer(customer, table):
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
        return getSetupIntent(stripeId)
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

def getSetupIntent(stripeId):
    setupIntent = stripe.SetupIntent.create(
      customer=stripeId,
    #   (setupIntent doesn't take currency)
    #   currency="usd",
      automatic_payment_methods={"enabled": True},
    )
    
    return stripeId, setupIntent