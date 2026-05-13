import os
import sys
import django

# Setup django environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plant_monitor.settings')
django.setup()

from readings.services import analyze_reading_with_llm, synthesize_speech_mp3
from django.conf import settings

print(f"Using ElevenLabs Key: {settings.ELEVENLABS_API_KEY[:10]}...")
print(f"Using OpenRouter Key: {settings.OPENROUTER_API_KEY[:10]}...")

print("\n--- Generating SFW Joke ---")
try:
    sfw_analysis = analyze_reading_with_llm(soil_level=12, ambient_light_level=45, humidity_levels=20, temperature_levels=38, device_id="test", mode="sfw")
    print("Condition:", sfw_analysis['condition'])
    print("SFW Messages:")
    for msg in sfw_analysis['messages']:
        print(f" - {msg}")
except Exception as e:
    print("SFW LLM Error:", e)


print("\n--- Generating NSFW (Jimmy Carr) Joke ---")
try:
    nsfw_analysis = analyze_reading_with_llm(soil_level=12, ambient_light_level=45, humidity_levels=20, temperature_levels=38, device_id="test", mode="nsfw")
    print("Condition:", nsfw_analysis['condition'])
    print("NSFW Messages:")
    nsfw_msgs = nsfw_analysis['messages']
    for msg in nsfw_msgs:
        print(f" - {msg}")
        
    print("\n--- Synthesizing Voice for one message ---")
    chosen_msg = nsfw_msgs[0]
    audio_bytes = synthesize_speech_mp3(chosen_msg)
    
    with open('plant-funny-voice.mp3', 'wb') as f:
        f.write(audio_bytes)
        
    print(f"Successfully saved ElevenLabs voice output to 'plant-funny-voice.mp3' for message: '{chosen_msg}'")

except Exception as e:
    print("Error:", e)

