import json
import urllib.request

def lambda_handler(event, context):
    # Extract the zip code from query parameters
    query_params = event.get("queryStringParameters", {})
    zipcode = query_params.get("zipcode", "")
    url = f"https://api.api-ninjas.com/v1/salestax?zip_code={zipcode}"

    try:
        # Set up the request
        req = urllib.request.Request(
            url,
            headers={
                'X-Api-Key': 'jaH4Oz+jJwFIv6T1ms2/yg==SCgMDmF3BoMQbLPB',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        )

        # Fetch the response
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            data = json.loads(response.read().decode())

        return {
            'statusCode': 200,
            'body': json.dumps(data)
        }

    except Exception as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': str(e)})
        }
