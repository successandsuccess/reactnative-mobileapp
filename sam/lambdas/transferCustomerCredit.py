import json
import boto3
from decimal import Decimal
import stripe


client = boto3.client('secretsmanager')
secretKey = ''
publishableKey = ''

dynamodb = boto3.resource('dynamodb')
CUSTOMER_DATA_TABLE           = 'Customers'

def lambda_handler(event, context):
    print(event)
    body        = json.loads(event['body'])
    balance = round(Decimal(body["balance"]), 2)
    customerId = body["customer_id"]

    if 'stripe_account_id' in body:
        stripe_account_id = body['stripe_account_id']
        tbl_customer = dynamodb.Table(CUSTOMER_DATA_TABLE)
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

        try:
            isValid, storedBalance, balanceOnHold = checkValidityBalance(balance, customerId, tbl_customer)
            print(json.dumps({'isValid': isValid, 'storedBalance': storedBalance, 'balanceOnHold': balanceOnHold}, default=default))
        except Exception as exception:
            return {
                "statusCode": 500,
                "message": f"encountered exception while checking validity: {exception}"
            }
        
        if (not isValid):
            return {
                "statusCode": 500,
                "message": "not enough Balance for customer to process transfer"
            }
        
        # transfer to customer connected strip account
        try:
            # add $100 funds for testing balance
            # addFundsForStripeAccount(10000, stripe_account_id)
            # charge $100 funds for testing account
            # chargeFundsForStripeConnectedAcccount(10000, stripe_account_id)
            # Retrieve the balance for the connected account
            # retrieveBalanceforStripeConnectedAcccount(stripe_account_id)
            # modify account detail for transfer enabled
            # modifyAccount(stripe_account_id)
            # account_detail = retrieve_account(stripe_account_id)

            #amount = 100 // example amount to transfer
            #customer_id = "cus_123456"  # Retrieve this customer id from your database customer table
            #connected_account_id = "acct_123456789"  # Retrieved when the stripe connected account was created by customer
            amount = balance
            print("amount: ", amount)
            print("customer_id: ", customerId)
            print("connected_account_id: ", stripe_account_id)

            # Validate the amount (e.g., ensure the customer has sufficient balance)
            if int(amount) <= 0:
                return {
                    "statusCode": 200,
                    "body": json.dumps({"message": "Invalid amount."}),
                }

            stripe.Account.modify(
                stripe_account_id,
                capabilities={
                    "transfers": {"requested": True},  # Request transfers capability
                },
            )

            account_detail = retrieve_account(stripe_account_id)

            print(account_detail.capabilities.transfers)
            if account_detail.capabilities.transfers == "inactive":
                return {
                    "statusCode": 200,
                    "body": json.dumps({"message": "Transfer capability is inactive."}),
                }
            else:
                print("Transfer capability is active.")

            # Create a transfer to the connected account
            transfer = stripe.Transfer.create(
                amount=int(amount) * 100,  # Convert dollars to cents
                currency="usd",
                destination=stripe_account_id,
                transfer_group=f"ORDER_{customerId}",
            )

            # Create a payout to the connected account
            # transfer = stripe.Payout.create(
            #     amount=int(amount) * 100,  # Convert dollars to cents
            #     currency="usd",
            #     destination=stripe_account_id,
            # )

        except stripe.error.StripeError as e:
                # Handle Stripe API errors
                return {
                    "statusCode": 400,
                    "body": json.dumps({"message": str(e)}),
                }

        except Exception as e:
                # Handle other errors
                return {
                    "statusCode": 500,
                    "body": json.dumps({"message": "Internal server error While Payout connect Stripe account."}),
                }

        try:
            sent = sendEmail(balance,balanceOnHold,customerId)
        except Exception as exception:
            return {
                "statusCode": 500,
                "message": f"internal exception while sending email: {exception}"
            }
            
        try:
            transferred = transferBalance(storedBalance, balanceOnHold, balance, customerId, tbl_customer)
            print(json.dumps(transferred, default=default))
        except Exception as exception:
            return {
                "statusCode": 500,
                "message": f"internal exception while transferring balances in DDB: {exception}"
            }
        
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "sucessfully sent request to transfer balance to Dossiay team"})
        }



    else:
        print("Stripe Account ID not found.")
        credit = balance
        tbl_customer = dynamodb.Table(CUSTOMER_DATA_TABLE)
        # default to "dev" if not prod
        query_params = event.get('queryStringParameters', {})
        env = query_params.get('env', 'dev')
        print("running in %s mode"%(env)) 
        if env == 'dev':
            tbl_customer = dynamodb.Table(f"dev_{CUSTOMER_DATA_TABLE}")

        try:
            isValid, storedCredit, creditOnHold = checkValidity(credit, customerId, tbl_customer)
            print(json.dumps({'isValid': isValid, 'storedCredit': storedCredit, 'creditOnHold': creditOnHold}, default=default))
        except Exception as exception:
            return {
                "statusCode": 500,
                "message": f"encountered exception while checking validity: {exception}"
            }
        
        if (not isValid):
            return {
                "statusCode": 500,
                "message": "not enough credit for customer to process transfer"
            }
        
        try:
            sent = sendEmail(credit,creditOnHold,customerId)
        except Exception as exception:
            return {
                "statusCode": 500,
                "message": f"internal exception while sending email: {exception}"
            }
            
        try:
            transferred = transferBalance(storedCredit, creditOnHold, credit, customerId, tbl_customer)
            print(json.dumps(transferred, default=default))
        except Exception as exception:
            return {
                "statusCode": 500,
                "message": f"internal exception while transferring credits in DDB: {exception}"
            }
        
        return {
            "statusCode": 200,
            "message": "sucessfully sent request to transfer credit to Dossiay team"
        }



# Used to handle Decimals in database, JSON serializer has issues otherwise
def default(obj):
  if isinstance(obj, Decimal):
    return float(obj)
  raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)

def checkValidity(credit, customerId, table):
    response = table.get_item(
        Key={
            'id': customerId
        }
    )
    
    if 'Item' in response:
        storedCredit = round(response['Item']['credit'], 2)
        creditOnHold = round(response['Item']['credit_on_hold'], 2)
        return storedCredit >= credit, storedCredit-credit, creditOnHold+credit
    else:
        return False, 0, 0
    
def checkValidityBalance(balance, customerId, table):
    response = table.get_item(
        Key={
            'id': customerId
        }
    )
    print(response)
    if 'Item' in response:
        storedBalance = round(response['Item']['balance'], 2)
        balanceOnHold = response['Item'].get('balance_pending', 0)
        return storedBalance >= balance, storedBalance-balance, balanceOnHold+balance
    else:
        return False, 0, 0


def transferBalance(storedBalance, balanceOnHold, balance, customerId, table):
    response = table.update_item(
        Key={
            'id': customerId
        },
        UpdateExpression="set balance=:c, balance_pending=:p",
        ExpressionAttributeValues={
            ':c': storedBalance,
            ':p': balanceOnHold,
        },
        ReturnValues="UPDATED_NEW"
    )
    
    return response


def sendEmail(balance,balanceOnHold,customerId):
    client = boto3.client('ses')

    response = client.send_email(
        Source='no-reply@dossiay.com',
        # Source='akar96684@gmail.com',
        Destination={
            'ToAddresses': [
                # 'cas.thomas.r@gmail.com'
                # 'akar96684@gmail.com',
                'support@dossiay.com',
            ],
        },
        Message={
            'Subject': {
                'Data': 'Customer requested transfer!',
                'Charset': 'UTF-8'
            },
            'Body': {
                'Text': {
                    'Charset': 'UTF-8',
                    'Data': f"""\
                            Customer id: {customerId}
                            Requested transfer of: ${balance}. They currently have ${balanceOnHold} on hold.
                            Remember to update DynamoDB after sending ${balanceOnHold} to the customer via Stripe.  Change the ***balanceOnHold*** value to 0 in the Customers table for customer "{customerId}".
                            """,
                },
            }
        },
    )

    print('Email sent!')
    
    return response


def connectedStripePayout(amount, customer_id, connected_account_id):
    try:
        # Validate the amount (e.g., ensure the customer has sufficient balance)
        if int(amount) <= 0:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Invalid amount."}),
            }

        # Create a transfer to the connected account
        transfer = stripe.Transfer.create(
            amount=int(amount) * 100,  # Convert dollars to cents
            currency="usd",
            destination=connected_account_id,
            transfer_group=f"ORDER_{customer_id}",
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Payout initiated successfully."}),
        }

    except stripe.error.StripeError as e:
        # Handle Stripe API errors
        return {
            "statusCode": 400,
            "body": json.dumps({"message": str(e)}),
        }

    except Exception as e:
        # Handle other errors
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Internal server error."}),
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

        
def default(obj):
  if isinstance(obj, Decimal):
    return str(obj)
  raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)

# add funds for testing of transfer balance
def addFundsForStripeAccount(amount, stripe_account_id):
    payment_intent = stripe.PaymentIntent.create(
        amount=amount,
        currency="usd",
        payment_method_data={
                                "type": "card",
                                "card": {
                                    "token": "tok_visa"  # Test token for Visa
                                },
                            },
        transfer_data={
                     "destination": stripe_account_id,
                 },
        confirm=True,
        automatic_payment_methods={
            "enabled": True,
            "allow_redirects": "never"  # Prevent redirects
        },
    )

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Adding Funds Successfully in Stripe account"}),
    }

def chargeFundsForStripeConnectedAcccount(amount, stripe_account_id):
    # Trigger the payout.available event for the connected account
    charge = stripe.Charge.create(
        amount=amount,
        currency="usd",
        source="tok_bypassPending",
        description=stripe_account_id
    )
    # Check the charge object for successful creation
    if charge.status == "succeeded":
        print("Charge successful! Funds are now available in your test account.")
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Charge successful! Funds are now available in your test account."}),
        }
    else:
        print("Charge failed:", charge.failure_message)
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "Charge failed"}),
        }

def retrieveBalanceforStripeConnectedAcccount(stripe_account_id):
    balance = stripe.Balance.retrieve(
            stripe_account=stripe_account_id  # Include the connected account context
             )
    print(f"Balance for account {stripe_account_id}: {balance}")
    return {
        "statusCode": 200,
        "body": json.dumps(balance),
    }

def modifyAccount(stripe_account_id):
    stripe.Account.modify(
        stripe_account_id,
        capabilities={
            "transfers": {"requested": True},  # Request transfers capability
        },
    )
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Account modified successfully."}),
    }
    