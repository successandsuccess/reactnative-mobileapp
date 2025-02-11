import stripe
import boto3
import json
from datetime import datetime

client = boto3.client('secretsmanager')
RESTAURANT_DATA_TABLE = 'Restaurants'

def lambda_handler(event, context):
  body        = json.loads(event['body'])
  env         = 'dev'
  
  if 'queryStringParameters' in event:
      # Access the query string parameters
      query_params = body['queryStringParameters']
      
      # Example: Accessing a specific query parameter named 'example'
      env = query_params.get('env', 'dev')
  
  if (env == 'prd'):
      secret_key = keys['stripe-secret']
      public_key = keys['stripe-public']
  else:
      secret_key = keys['stripe-secret']
      public_key = keys['stripe-public']
        
  stripe.api_key = secret_key
  
  customerId = body["stripe_id"] if "stripe_id" in body else ""
  print(customerId)
  
  if (len(customerId) == 0):
    # Use an existing Customer ID if this is a returning customer
    id = body["id"] if "id" in body else ""
    phone =  body["phone"] if "phone" in body else ""
    email = body["email"] if "email" in body else ""
    name = body["name"] if "name" in body else ""
    
    customerId = getCustomerInformation(id, email, phone, name)

  customerPaymentMethods = stripe.Customer.list_payment_methods(customerId)
  listOfPaymentMethods = customerPaymentMethods.get('data')
  requestPayment = True
  value = {}
  
  if (len(listOfPaymentMethods) > 0):
    current_date = datetime.now()

    # Use list comprehension to filter the data
    filtered_data = [
        item for item in listOfPaymentMethods
        if 'card' not in item or (
            item.get('card', {}).get('exp_year') > current_date.year or
            (item.get('card', {}).get('exp_year') == current_date.year and item.get('card', {}).get('exp_month') >= current_date.month)
        )
    ]
    if (len(filtered_data) > 0):
      requestPayment = False
  
  if (requestPayment):
    ephemeralKey = stripe.EphemeralKey.create(
      customer=customerId,
      stripe_version='2020-08-27',
    )
    
    setupIntent = stripe.SetupIntent.create(
      customer=customerId,
    )
    
    value = {
          "setupIntent": setupIntent.client_secret,
          "ephemeralKey": ephemeralKey.secret,
          "customerId": customerId,
          "publishableKey": public_key,
          "getPaymentMethod": requestPayment
      }
  else:
    value = {
      "getPaymentMethod": requestPayment
    }
    
    
  return json.dumps(value)
  
def getCustomerInformation(id, email, phone, name):
  existing = {}
  
  if (email and not phone):
    existing = stripe.Customer.search(
      query=f'email:\'{email}\'',
    )
  elif (email and phone):
    existing = stripe.Customer.search(
      query=f'email:\'{email}\' OR phone:\'{phone}\'',
    )
  elif (not email and phone):
    existing = stripe.Customer.search(
      query=f'phone:\'{phone}\'',
    )
    
  if (not existing):
    stripeCustomer = stripe.Customer.create(
      email=email,
      name=name,
      phone=phone
    )
    
    customerId = stripeCustomer['id']
    
    dynamodb    = boto3.resource('dynamodb')
    table       = dynamodb.Table(RESTAURANT_DATA_TABLE)
    
    try: 
        response = table.update_item(
            Key={
                'id': id
            },
            UpdateExpression="set stripe_id=:sid",
            ExpressionAttributeValues={
                ':sid':  customerId
            },
            ReturnValues="UPDATED_NEW"
        )
    except Exception as e:
        # Code to handle the exception
        print(f"An exception of type {type(e).__name__} occurred: {str(e)}")
        response = e
        
    return customerId
  else:
    return existing['data'][0]['id']