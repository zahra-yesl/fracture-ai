import os
import requests
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("PHOENIX_API_KEY")
print("Token:", token[:15] + "..." if token else "None")

url = "https://app.phoenix.arize.com/v1/traces"

headers_options = [
    {"api_key": token},
    {"Authorization": f"Bearer {token}"},
    {"authorization": f"Bearer {token}"},
    {"api-key": token},
]

for idx, headers in enumerate(headers_options):
    try:
        print(f"\nTesting Header Config {idx + 1}: {headers.keys()}")
        # We send an empty post or dummy trace structure to check authentication status
        # A 401 status indicates authentication failed, while a 200/400/422 status indicates we successfully authenticated but the body is invalid/empty.
        response = requests.post(url, headers=headers, json={})
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {response.headers}")
        print(f"Response Content: {response.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")
