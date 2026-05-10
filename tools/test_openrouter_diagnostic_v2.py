import requests
import os
import json
from dotenv import load_dotenv

load_dotenv(".env.local")
key = os.getenv("OPENROUTER_API_KEY")
model = "openai/gpt-4o-mini"

print(f"Testing model: {model} with JSON object")
response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    },
    data=json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant. Output JSON."},
            {"role": "user", "content": "Output a list of 2 pain points for LATAM in JSON."}
        ],
        "response_format": {"type": "json_object"}
    })
)

print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
