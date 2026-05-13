import os
import sys
import django

# Setup django environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plant_monitor.settings')
django.setup()

from readings.services import analyze_reading_with_llm

print("Generating 3 batches of jokes...")
all_jokes = []
for i in range(3):
    try:
        # Give it terrible readings to elicit the darkest responses
        analysis = analyze_reading_with_llm(
            soil_level=2, 
            ambient_light_level=5, 
            humidity_levels=5, 
            temperature_levels=45, 
            device_id="test", 
            mode="nsfw"
        )
        for msg in analysis['messages']:
            all_jokes.append(msg)
            print(f"- {msg}")
    except Exception as e:
        print("Error:", e)
