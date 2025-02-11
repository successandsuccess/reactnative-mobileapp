import json
from decimal import Decimal
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key, Attr
import uuid
# import stripe

dynamodb = boto3.resource('dynamodb')

restaurantProfile = {
    "id": "",
    "name": "",
    "email": "",
    "picture": "",
    "address": "",
    "city": "",
    "state": "",
    "zipcode": "",
    "phone_number": "",
    "admin": False,
    "reset_password": False,
    "accepted_terms": False,
    "active_subscription": False,
    "facebook": "",
    "instagram": "",
    "first_time": True,
    "category": "",
    "point_of_contact": ""
}

RESTAURANT_DATA_TABLE     = 'Restaurants'

def lambda_handler(event, context):
    print(event['body'])

    tbl_restaurant = dynamodb.Table(RESTAURANT_DATA_TABLE)

    # default to "dev" if not prod
    query_params = event.get('queryStringParameters', {})
    env = query_params.get('env', 'dev')
    print("running in %s mode"%(env)) 
    if env == 'dev':
        tbl_restaurant = dynamodb.Table(f"dev_{RESTAURANT_DATA_TABLE}")
    
    body        = json.loads(event['body'])
    fields      = list(restaurantProfile.keys())
    
    restaurantProfile.update({field: body.get(field, restaurantProfile[field]) for field in fields})
    response = ''
    
    try: 
        expression_attribute_names = {'#n': 'name', '#s': 'state'}
        response = tbl_restaurant.update_item(
            Key={
                'id': restaurantProfile['id']
            },
            UpdateExpression="set #n=:n, picture=:p, address=:a, #s=:s, zipcode=:z, phone_number=:pn, admin=:ad, reset_password=:r, accepted_terms=:at, active_subscription=:as, facebook=:f, instagram=:i, email=:e, first_time=:ft, category=:c, point_of_contact=:poc",
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues={
                ':n':  restaurantProfile['name'],
                ':p':  restaurantProfile['picture'],
                ':a':  restaurantProfile['address'],
                ':s':  restaurantProfile['state'],
                ':z':  restaurantProfile['zipcode'],
                ':pn':  restaurantProfile['phone_number'],
                ':ad': restaurantProfile['admin'],
                ':r':  restaurantProfile['reset_password'],
                ':at': restaurantProfile['accepted_terms'],
                ':as': restaurantProfile['active_subscription'],
                ':f':  restaurantProfile['facebook'],
                ':i':  restaurantProfile['instagram'],
                ':e':  restaurantProfile['email'],
                ':ft':  restaurantProfile['first_time'],
                ':c': restaurantProfile['category'],
                ':poc': restaurantProfile['point_of_contact']
            },
            ReturnValues="UPDATED_NEW"
        )
    except Exception as e:
        # Code to handle the exception
        print(f"An exception of type {type(e).__name__} occurred: {str(e)}")
        response = e
    
    if (body.get('triggerOfficialSignOut', False)):
        print(f"Official Sign Out triggered, sending email with ${json.dumps({'newPW': body['newPW'], 'email': body['email'], 'name': body['name']})}")
        send_email(body['newPW'], body['email'], body['name'])
    
    return json.dumps(response, default=default)


# Used to handle Decimals in database, JSON serializer has issues otherwise
def default(obj):
  if isinstance(obj, Decimal):
    return str(obj)
  raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)
  
  
  
def send_email(newPassword, restaurantEmail, businessName):
    client = boto3.client('ses', region_name='us-east-1')

    try:
        response = client.send_email(
            Source='bizsupport@dossiay.com',
            Destination={
                'ToAddresses': [
                    restaurantEmail,
                ],
            },
            Message={
                'Subject': {
                    'Data': 'Your Dossiay Business account is ready!',
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Text': {
                        'Charset': 'UTF-8',
                        'Data': f"""\
Hi {businessName},

Welcome to Dossiay Business! Your account has been successfully 
created. To get started, download the Dossiay Business mobile app and 
login with the following password:

‘{newPassword}’ 

You will be asked to create a unique password after you login for the first 
time using the generic password. After creating your new password, your 
Dossiay Business account will be ready to manage your online orders 
and launch influencer marketing campaigns.

If you ever need help or have any questions, email us at 
bizsupport@dossiay.com and a Dossiay team member will respond to you
shortly. Thank you for joining Dossiay Business. We’re looking forward to
helping your business connect, engage, and grow.

Cheers,
Dossiay Team
    """,
                    },
                }
            },
        )
    
        print('Email sent!')
    except Exception as exception:
        print("Error: %s!\n\n" % exception)