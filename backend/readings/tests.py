import json
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from .models import PlantReading


class PlantReadingApiTests(TestCase):
    def test_get_readings_returns_latest_and_items(self):
        PlantReading.objects.create(
            soil_level=44,
            ambient_light_level=680,
            condition='neutral',
            plant_messages=['I feel okay.'] * 5,
        )

        response = self.client.get(reverse('readings_collection'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload['items']), 1)
        self.assertEqual(payload['latest']['soilLevel'], 44)

    @patch('readings.views.analyze_reading_with_llm')
    def test_post_reading_creates_record(self, analyze_mock):
        analyze_mock.return_value = {
            'condition': 'good',
            'messages': [
                'I am thriving.',
                'My leaves feel bright.',
                'I am well watered.',
                'The sunlight feels perfect.',
                'I am in great shape.',
            ],
        }

        response = self.client.post(
            reverse('readings_collection'),
            data=json.dumps(
                {
                    'soilLevel': 61,
                    'ambientLightLevel': 420,
                }
            ),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(PlantReading.objects.count(), 1)
        self.assertEqual(PlantReading.objects.first().soil_level, 61)
        self.assertEqual(PlantReading.objects.first().condition, 'good')

    def test_post_reading_rejects_invalid_soil_level(self):
        response = self.client.post(
            reverse('readings_collection'),
            data=json.dumps(
                {
                    'soilLevel': 120,
                    'ambientLightLevel': 520,
                }
            ),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)

    @patch('readings.views.random.choice', return_value='I need a little more water.')
    def test_plant_status_returns_condition_and_message(self, _choice_mock):
        PlantReading.objects.create(
            soil_level=38,
            ambient_light_level=240,
            condition='bad',
            plant_messages=[
                'I need a little more water.',
                'I am struggling today.',
                'Please move me somewhere brighter.',
                'My soil feels too dry.',
                'I could use some care.',
            ],
        )

        response = self.client.get(reverse('plant_status'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['condition'], 'bad')
        self.assertEqual(payload['message'], 'I need a little more water.')

    @patch('readings.views.synthesize_speech_mp3', return_value=b'MP3DATA')
    @patch('readings.views.random.choice', return_value='I feel great today.')
    def test_plant_voice_returns_mp3(self, _choice_mock, _tts_mock):
        PlantReading.objects.create(
            soil_level=71,
            ambient_light_level=530,
            condition='good',
            plant_messages=[
                'I feel great today.',
                'That light is perfect.',
                'My roots are happy.',
                'I am feeling strong.',
                'Keep this up.',
            ],
        )

        response = self.client.get(reverse('plant_voice'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'audio/mpeg')
        self.assertEqual(response['X-Plant-Condition'], 'good')
        self.assertEqual(response['X-Plant-Message'], 'I feel great today.')
        self.assertEqual(response.content, b'MP3DATA')
