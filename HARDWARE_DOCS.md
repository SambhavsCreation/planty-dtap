# Hardware Integration Documentation
**Project:** Planty Patootie (Smart Plant Health Monitor)
**Base API URL (Production):** `https://dtap-demo1.onrender.com/api`

This document details the REST API specifications for the hardware team to securely submit sensor readings to the cloud backend, check the plant status, and download synthesized audio responses.

## 1. Submit New Reading

**URL:** `/readings/`
**Method:** `POST`
**Content-Type:** `application/json`

### Payload Specification

The backend expects a JSON payload containing the following 5 required parameters.

| Field | Type | Unit | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `soilLevel` | Integer | Percentage (`%`) | Must be between `0` and `100` inclusive. |
| `ambientLightLevel` | Integer | Lux (`lx`) | Must be `0` or greater. |
| `humidityLevels` | Float | Percentage (`%`) | Standard humidity value (e.g. `45.5`). |
| `temperatureLevels` | Float | Celsius (`°C`) | Standard temperature value (e.g. `22.4`). |
| `deviceId` | String | None | A unique identifier for the reporting hardware unit (e.g. `"ESP32_LIVING_ROOM_1"`). |

### Example Request (ESP32/Arduino C++)

```cpp
#include <HTTPClient.h>

void sendReading(int soil, int light, float humidity, float temp, String deviceId) {
    HTTPClient http;
    http.begin("https://dtap-demo1.onrender.com/api/readings/");
    http.addHeader("Content-Type", "application/json");

    String payload = "{";
    payload += "\"soilLevel\":" + String(soil) + ",";
    payload += "\"ambientLightLevel\":" + String(light) + ",";
    payload += "\"humidityLevels\":" + String(humidity) + ",";
    payload += "\"temperatureLevels\":" + String(temp) + ",";
    payload += "\"deviceId\":\"" + deviceId + "\"";
    payload += "}";

    int httpResponseCode = http.POST(payload);
    
    if (httpResponseCode == 201) {
        Serial.println("Reading successfully saved and analyzed by LLM.");
    } else {
        Serial.printf("Error occurred: %d\n", httpResponseCode);
    }
    
    http.end();
}
```

---

## 2. Check Plant Status (Optional)

If your hardware has an LCD screen and wants to display the latest status.

**URL:** `/plant/status/`
**Method:** `GET`

### Example Response

```json
{
  "condition": "good",
  "message": "I'm so well cared for, I feel like the favorite child.",
  "messages": [ ... ],
  "reading": { ... }
}
```

---

## 3. Play Plant Voice (Optional)

If your hardware includes a speaker (e.g., I2S amplifier + speaker), you can fetch the AI-synthesized audio of the plant's latest complaint or praise. Audio is generated using **Google Cloud TTS**.

**URL:** `/plant/voice/`
**Method:** `GET`

### Important details for audio fetching:

1. **Content-Type**: Returns `audio/mpeg` (standard MP3 format, 24kHz, Monaural).
2. **Metadata Headers**: The backend injects custom headers into the response so your hardware knows *what* the audio says without needing to parse the MP3:
   * `x-plant-condition` (e.g., `good`, `neutral`, `bad`)
   * `x-plant-message` (e.g., `I'm so well cared for...`)
3. **Hardware Playback**: For ESP32, libraries like `ESP8266Audio` can directly decode MP3 HTTP streams. Ensure your streaming buffer is large enough for a ~100kb payload.

### Example Request (ESP32)

```cpp
#include <AudioFileSourceHTTPStream.h>
#include <AudioGeneratorMP3.h>
#include <AudioOutputI2S.h>

AudioGeneratorMP3 *mp3;
AudioFileSourceHTTPStream *file;
AudioOutputI2S *out;

void playPlantVoice() {
    file = new AudioFileSourceHTTPStream("https://dtap-demo1.onrender.com/api/plant/voice/");
    out = new AudioOutputI2S();
    mp3 = new AudioGeneratorMP3();
    mp3->begin(file, out);
    
    // Call mp3->loop() repeatedly in your main loop() while mp3->isRunning()
}
```

---

## 4. Hardware Implementation Notes

1.  **Polling Frequency**: We recommend taking measurements frequently (e.g., every 5 minutes), but **batching or slowing down HTTP POSTs to once every 15-30 minutes**. Every POST triggers an AI generation pipeline, so extreme frequency will burn API credits rapidly.
2.  **Authentication**: Currently, the `/api/readings/` endpoint is unauthenticated (accepts `POST` requests directly) to simplify prototyping.
3.  **TLS/HTTPS**: Since the production endpoint (`https://...`) is hosted on Render, your hardware must support TLS 1.2+. If using an ESP8266/ESP32, ensure you are using the secure client (`WiFiClientSecure`) and are ignoring certificate validation if your stack lacks CA bundles, OR load the root certificates appropriately.