import json
import random

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import PlantReading
from .services import PlantAnalysisError, analyze_reading_with_llm, synthesize_speech_mp3


def _serialize_reading(reading):
    return {
        'id': reading.id,
        'soilLevel': reading.soil_level,
        'ambientLightLevel': reading.ambient_light_level,
        'condition': reading.condition,
        'plantMessages': reading.plant_messages,
        'recordedAt': reading.recorded_at.isoformat(),
    }


def _validate_payload(payload):
    required_fields = ['soilLevel', 'ambientLightLevel']
    missing_fields = [field for field in required_fields if field not in payload]
    if missing_fields:
        return None, f"Missing required fields: {', '.join(missing_fields)}"

    try:
        soil_level = int(payload['soilLevel'])
        ambient_light_level = int(payload['ambientLightLevel'])
    except (TypeError, ValueError):
        return None, 'soilLevel and ambientLightLevel must be integers.'

    if not 0 <= soil_level <= 100:
        return None, 'soilLevel must be between 0 and 100.'

    if ambient_light_level < 0:
        return None, 'ambientLightLevel must be zero or greater.'

    return {
        'soil_level': soil_level,
        'ambient_light_level': ambient_light_level,
    }, None


@require_http_methods(['GET'])
def health_check(_request):
    return JsonResponse({'status': 'ok'})


def _get_latest_analyzed_reading():
    for reading in PlantReading.objects.exclude(condition__isnull=True).exclude(condition=''):
        if isinstance(reading.plant_messages, list) and reading.plant_messages:
            return reading

    return None


@csrf_exempt
@require_http_methods(['GET', 'POST'])
def readings_collection(request):
    if request.method == 'GET':
        readings = [_serialize_reading(reading) for reading in PlantReading.objects.all()[:20]]
        latest = readings[0] if readings else None
        return JsonResponse({'items': readings, 'latest': latest})

    try:
        payload = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Request body must be valid JSON.'}, status=400)

    reading_data, error = _validate_payload(payload)
    if error:
        return JsonResponse({'error': error}, status=400)

    try:
        analysis = analyze_reading_with_llm(
            soil_level=reading_data['soil_level'],
            ambient_light_level=reading_data['ambient_light_level'],
        )
    except PlantAnalysisError as error:
        return JsonResponse({'error': str(error)}, status=502)

    reading = PlantReading.objects.create(
        **reading_data,
        condition=analysis['condition'],
        plant_messages=analysis['messages'],
    )
    return JsonResponse(_serialize_reading(reading), status=201)


@require_http_methods(['GET'])
def plant_status(request):
    reading = _get_latest_analyzed_reading()
    if reading is None:
        return JsonResponse({'error': 'No analyzed plant reading is available yet.'}, status=404)

    selected_message = random.choice(reading.plant_messages)
    return JsonResponse(
        {
            'condition': reading.condition,
            'message': selected_message,
            'messages': reading.plant_messages,
            'reading': _serialize_reading(reading),
        }
    )


@require_http_methods(['GET'])
def plant_voice(request):
    reading = _get_latest_analyzed_reading()
    if reading is None:
        return JsonResponse({'error': 'No analyzed plant reading is available yet.'}, status=404)

    selected_message = random.choice(reading.plant_messages)

    try:
        audio_bytes = synthesize_speech_mp3(selected_message)
    except Exception as error:
        return JsonResponse({'error': f'TTS generation failed: {error}'}, status=502)

    response = HttpResponse(audio_bytes, content_type='audio/mpeg')
    response['Content-Disposition'] = 'inline; filename="plant-voice.mp3"'
    response['X-Plant-Condition'] = reading.condition
    response['X-Plant-Message'] = selected_message
    return response
