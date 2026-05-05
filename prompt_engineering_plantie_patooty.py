import requests
import json
import os

key = os.getenv('OPENROUTER_API_KEY')
soil_level = 70
ambient_light_level = 400

message_nsfw = f"""
You are evaluating the health of a single house plant.

Input reading:
- soilLevel: {soil_level}
- ambientLightLevel: {ambient_light_level}

Decide the plant condition using exactly one of these labels:
- good
- neutral
- bad

Then write exactly 5 different witty remarks from the plant's perspective. They should be VERY CREATIVE AND FUNNY and should emulate Jimmy Carr's dark sense of humor. Think carefully about the joke. It should be dark and super funny.

Example jokes:
- I'm producing oxygen for you? Honestly, based on my soil condition, I'd rather produce cyanide.
- You call this ambient light? I've seen brighter futures in a bankrupt casino.
- Look at me. I'm the botanical equivalent of your will to live on a Monday morning.

Return only valid JSON in this exact shape:
{{
  "condition": "good|neutral|bad",
  "messages": ["sentence 1", "sentence 2", "sentence 3", "sentence 4", "sentence 5"]
}}
"""

message_sfw = f"""
You are evaluating the health of a single house plant.

Input reading:
- soilLevel: {soil_level}
- ambientLightLevel: {ambient_light_level}

Decide the plant condition using exactly one of these labels:
- good
- neutral
- bad

Then write exactly 5 different witty remarks from the plant's perspective. They should be VERY CREATIVE AND FUNNY and should be safe for work.

Return only valid JSON in this exact shape:
{{
  "condition": "good|neutral|bad",
  "messages": ["sentence 1", "sentence 2", "sentence 3", "sentence 4", "sentence 5"]
}}
"""


req = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {key}",
        "HTTP-Referer": "sambhavs.com",
        "X-OpenRouter-Title": "Planty Patootie Testing",
    },
    data=json.dumps({
        "model": "qwen/qwen3.5-397b-a17b",
        "messages": [
            {
                "role": "user",
                "content": message_sfw
            }
        ]
    })
)

data = req.json()
response_code = req.status_code
print(response_code)
print(f"Raw API Response: {data}")

final_out = data["choices"][0]["message"]["content"]
print(final_out)
