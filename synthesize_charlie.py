import os
import sys
import django

# Setup django environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plant_monitor.settings')
django.setup()

from readings.services import synthesize_speech_mp3

darkest_jokes = [
    "At 45 degrees, I'm not just wilting—I'm basically auditioning for a role in your cremation.",
    "This ambient light is so low, I'm photosynthesizing using the faint glow of your career prospects.",
    "If my condition were a Netflix special, it'd be categorized as 'True Crime'."
]

print("Synthesizing using Charlie (Australian, deep)...")
for i, joke in enumerate(darkest_jokes, start=1):
    print(f"Synthesizing {i}: {joke}")
    try:
        audio_bytes = synthesize_speech_mp3(joke)
        filename = f"charlie_joke_{i}.mp3"
        with open(filename, 'wb') as f:
            f.write(audio_bytes)
        print(f" -> Saved to {filename}")
    except Exception as e:
        print(f" -> Error: {e}")

print("Done.")
