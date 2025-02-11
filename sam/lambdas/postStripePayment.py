import json
import boto3
from datetime import datetime
from decimal import Decimal, ROUND_UP

dynamodb = boto3.resource('dynamodb')
dynamodb_client = boto3.client('dynamodb')

CUSTOMER_ORDERS_DATA_TABLE = 'CustomerOrders'
CUSTOMERS_DATA_TABLE = 'Customers'
PROMOTIONS_DATA_TABLE = 'Promotions'
PROMO_CODES_DATA_TABLE = 'PromotionCodes'
RESTAURANTS_DATA_TABLE = 'Restaurants'


def lambda_handler(event, context):
    body            = json.loads(event['body'])
    print(body)
    
    amount          = body['total']
    applied_credit  = body['credit']
    cost            = body['cost']
    tax             = body['tax']
    promo_codes     = body['promo_codes']
    
    customer_id     = body['incoming_id']
    purchases       = body['items']
    # stripe_account_id = body['stripe_account_id']

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    tbl_prefix = "dev_" if env == 'dev' else ""

    tbl_customer_orders = dynamodb.Table(f"{tbl_prefix}{CUSTOMER_ORDERS_DATA_TABLE}")
    tbl_customers = dynamodb.Table(f"{tbl_prefix}{CUSTOMERS_DATA_TABLE}")
    tbl_promotions = dynamodb.Table(f"{tbl_prefix}{PROMOTIONS_DATA_TABLE}")
    tbl_promo_codes = dynamodb.Table(f"{tbl_prefix}{PROMO_CODES_DATA_TABLE}")
    tbl_restaurants = dynamodb.Table(f"{tbl_prefix}{RESTAURANTS_DATA_TABLE}")

    # make a transfer from request from connected strip account to dossiay stripe account

    
    # udpate customer used promos +
    successUpdateCustomerObj = updateCustomerObj(customer_id, purchases, promo_codes, tbl_customers)
    
    # update promo ref -
    # update promo purchased +
    successUpdatePromotionsObj = updatePromotionsObj(purchases, tbl_promotions)
    
    # update promo code purchased +
    successUpdatePromoCodeObj = updatePromoCodeObj(promo_codes, tbl_promo_codes)
    
    # add to orders table
    successUpdateCustomerOrdersObj = updateCustomerOrdersObj(customer_id, purchases, tbl_customer_orders, tbl_restaurants, amount=amount, tax=tax)
    
    # update user credit for promo usage
    sucessUpdateUserPromoCredit = updateUserPromoCredit(customer_id, promo_codes, purchases, tbl_promo_codes, tbl_customers)
    

    # TODO implement
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }
    # return {
    #     'statusCode': 200,
    #     'body': json.dumps(sucessUpdateUserPromoCredit)
    # }
    
# Used to handle Decimals in database, JSON serializer has issues otherwise
def default(obj):
  if isinstance(obj, Decimal):
    return str(obj)
  raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)
    
    
def updateCustomerObj(customerId, items, promo_codes, tbl_customers):
    key={
        'id': customerId
    }
    
    response = tbl_customers.get_item(
      Key=key
    )['Item']
    
    currentList = response['used_promo_list']
    
    updateExpression = "SET used_promo_list =:val1"
    expressionValues = {
        ':val1': {code: 1 for code in promo_codes}
    }
    
    expressionValues[':val1'].update(currentList)

    for item in items:
        promo_id = item['id']
        quantity = item['quantity']
        
        # Update the expressionValues with the new values
        if promo_id in expressionValues[':val1']:
            expressionValues[':val1'][promo_id] += quantity
        else:
            expressionValues[':val1'][promo_id] = quantity

    return updateDBTable(tbl_customers, key, updateExpression, expressionValues)
    

def updatePromotionsObj(items, tbl_promotions):
    success = True
    
    for item in items:
        key={
            'id': item['id']
        }

        updateExpression = "SET total_ref_created = total_ref_created - :val1, total_purchased = total_purchased + :val1"
        expressionValues = {
            ':val1': Decimal(item['quantity'])
        }
        
        succeeded = updateDBTable(tbl_promotions, key, updateExpression, expressionValues)
        
        if not succeeded:
            success = False
            
    return success
    
    
#  
def updatePromoCodeObj(promo_codes, tbl_promo_codes):
    success = True
    
    for code in promo_codes:
        key={
            'code': code
        }

        updateExpression = "SET times_used = times_used + :val1"
        expressionValues = {
            ':val1': 1
        }
        
        succeeded = updateDBTable(tbl_promo_codes, key, updateExpression, expressionValues)
        
        if not succeeded:
            success = False
            
    return success
    
def updateCustomerOrdersObj(customerId, items, tbl_customer_orders, tbl_restaurants, amount, tax):
    success = True
    putRequests = []
    
    restaurants = tbl_restaurants.scan()['Items']
    restaurantIds = {obj['id']: obj['name'] for obj in restaurants}

    for item in items:
        for i in range(item['quantity']):
            generatedId = f"{str(datetime.utcnow().timestamp())[-5:]}{i}{customerId[:2]}"
            data = {
                'id': {'S': generatedId},
                'promo_id': {'S': item['id']},
                'restaurant_id': {'S': item['restaurant_id']},
                'restaurant_name': {'S': restaurantIds[item['restaurant_id']]},
                'customer_id': {'S': customerId},
                'start_time': {'N': str(item['start_time'])},
                'end_time': {'N': str(item['end_time'])},
                'title': {'S': item['title']},
                'description': {'S': str(item['description'])},
                'discount': {'N': str(item['discount'])},
                'used': {'BOOL': False},
                'content_id': {'S': item['content_id']},
                'amount': {'N': str(amount)},
                'tax': {'N': str(tax)}
            }
            print("data")
            print(data)
            putRequests.append({
                'PutRequest': {
                    'Item': data
                }
            })

    try:
        # Batch write items
        response = dynamodb_client.batch_write_item(
            RequestItems={
                tbl_customer_orders.name: putRequests
            }
        )

        # Check if any items failed to write
        if 'UnprocessedItems' in response and response['UnprocessedItems']:
            success = False
    except Exception as e:
        print(f"Error: {e}")
        success = False

    return success
    
def updateUserPromoCredit(customerId, promoCodes, items, tbl_promo_codes, tbl_customers):
    success = True

    for code in promoCodes:
        try:
            key={
                'code': code
            }
            
            codeObj = tbl_promo_codes.get_item(
              Key=key
            )['Item']
            
            product = next((i for i in items if i['id'] == codeObj['promo_id']), None)
            print(product)
            balance = product['cost'] - float(product['discount']) + .2

            # update customer who made promo w balance
            customerKey={
                'id': codeObj['customer_id']
            }
         
            response = tbl_customers.get_item(
                Key=customerKey
            )['Item']


            if response and 'balance' in response:
                # 'balance' exists, update it
                updateExpression = "SET balance = balance + :val1"
            else:
                # 'balance' doesn't exist, create it
                updateExpression = "SET balance = :val1"

            expressionValues = {
                ':val1': Decimal(balance).quantize(Decimal('0.00'), rounding=ROUND_UP)
            }
            updateDBTable(tbl_customers, customerKey, updateExpression, expressionValues)
            
        except Exception as e:
            print(e)
            success=False
            
    return success
            
        
    

def updateDBTable(table, key, updateExpression, expressionValues):
    try:
        updated = table.update_item(
            Key=key,    
            UpdateExpression=updateExpression,
            ExpressionAttributeValues=expressionValues
        )

        return True
        
    except Exception as e:
        print(e)
        return False
        
        
def batchUpdateDBTable(tableName, requests):
    success = True

    # Batch write items
    response = dynamodb_client.batch_write_item(
        RequestItems={
            tableName: requests
        }
    )

    # Check if any items failed to write
    if 'UnprocessedItems' in response and response['UnprocessedItems']:
        success = False
    
    return success