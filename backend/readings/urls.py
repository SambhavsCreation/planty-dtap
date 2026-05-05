from django.urls import path

from .views import health_check, plant_status, plant_voice, readings_collection, app_mode


urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('readings/', readings_collection, name='readings_collection'),
    path('plant/status/', plant_status, name='plant_status'),
    path('plant/voice/', plant_voice, name='plant_voice'),
    path('mode/', app_mode, name='app_mode'),
]
