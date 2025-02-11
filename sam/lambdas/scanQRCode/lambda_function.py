import json


ORDERS_DATA_TABLE = "CustomerOrders"


def lambda_handler(event, context):
    # TODO implement
    return {
        'statusCode': 200,
        'body': json.dumps({
            "success": True
        })
    }


# Used to handle Decimals in database, JSON serializer has issues otherwise
def default(obj):
  if isinstance(obj, Decimal):
    return str(obj)
  raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)
  
  
  
 def getPromo(promoDetails, stripeCustomerInfo, updated=False, dynamodb=None):
    if not dynamodb:
        dynamodb = boto3.resource('dynamodb')

    table = dynamodb.Table(ORDERS_DATA_TABLE)
    response = table.get_item(
      Key={
          'id': promoDetails["id"]
      }
    )
    
    # if item is found and flase, then return 
    
    
    if 'Item' in response:
        if updated:
            return response['Item']
        else:
            oldPromoDetails = response['Item']
            priceChange     = oldPromoDetails['discount'] != promoDetails['discount'] or oldPromoDetails['budget'] != promoDetails['budget']
            updatedPromo    = updatePromo(oldPromoDetails, promoDetails['restaurant_id'], promoDetails, priceChange, stripeCustomerInfo)
            
            return updatedPromo
    else:
        return None