# Plant Monitor Demo

This project includes:

- A Django backend in `backend/` with SQLite storage and HTTP APIs.
- A Next.js frontend in `frontend/` for submitting and viewing plant sensor readings.

## Data model

Each reading stores:

- `soilLevel` as a percentage from 0 to 100
- `ambientLightLevel` in lux
- `humidityLevels` as a percentage
- `temperatureLevels` in Celsius
- `deviceId` identifying the hardware module
- `recordedAt`

## Backend API

- `GET /api/health/`
- `GET /api/mode/` (also accepts POST to set SFW or NSFW humor mode)
- `GET /api/readings/`
- `POST /api/readings/`
- `GET /api/plant/status/`
- `GET /api/plant/voice/`

Example request:

```json
{
  "soilLevel": 58,
  "ambientLightLevel": 620,
  "humidityLevels": 45.5,
  "temperatureLevels": 22.0,
  "deviceId": "living-room-1"
}
```

On `POST /api/readings/`, the backend sends the reading to OpenRouter, stores:

- `condition` as `good`, `neutral`, or `bad`
- `plantMessages` as 5 first-person sentences from the plant

`GET /api/plant/status/` returns JSON with the latest analyzed condition plus a random stored message.

`GET /api/plant/voice/` returns MP3 audio for one random stored message and includes:

- `X-Plant-Condition`
- `X-Plant-Message`

## Local setup

1. Create a `.env` file in the project root with your OpenRouter API key:

```bash
cat > .env <<'EOF'
OPENROUTER_KEY=your_openrouter_key_here
GOOGLE_API_KEY=your_google_cloud_api_key_here
# Optional: custom CA bundle path (PEM) for corporate/proxy environments
# OPENROUTER_CA_BUNDLE=/absolute/path/to/ca-bundle.pem
EOF
```

2. Create the Python virtual environment and install backend dependencies:

```bash
python3 -m venv .venv
./.venv/bin/pip install -r backend/requirements.txt
```

3. Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

4. Run database migrations:

```bash
./.venv/bin/python backend/manage.py migrate
```

5. Start the Django backend:

```bash
./.venv/bin/python backend/manage.py runserver 127.0.0.1:8000
```

6. In a second terminal, start the Next.js frontend:

```bash
cd frontend
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api npm run dev
```

7. Open `http://127.0.0.1:3000`.

## Reproduce the LLM + voice flow

1. Submit a new plant reading:

```bash
curl -X POST http://127.0.0.1:8000/api/readings/ \
  -H "Content-Type: application/json" \
  -d '{"soilLevel":27,"ambientLightLevel":140,"humidityLevels":40,"temperatureLevels":22,"deviceId":"device-1"}'
```

Expected behavior:

- The backend sends the reading to OpenRouter.
- The model returns `good`, `neutral`, or `bad`.
- The model also returns 5 first-person plant messages.
- All of that is stored in SQLite.

2. Fetch the current plant state:

```bash
curl http://127.0.0.1:8000/api/plant/status/
```

Expected response shape:

```json
{
  "condition": "neutral",
  "message": "The light is okay, but I could use a bit more brightness.",
  "messages": [
    "My soil feels a bit dry, but I'm hanging in there.",
    "The light is okay, but I could use a bit more brightness.",
    "I'm not at my best, but I'm not struggling too much.",
    "A little water would help me feel more refreshed.",
    "I'm content, though some extra care would be nice."
  ],
  "reading": {
    "id": 10,
    "soilLevel": 27,
    "ambientLightLevel": 140,
    "humidityLevels": 40.0,
    "temperatureLevels": 22.0,
    "deviceId": "device-1",
    "condition": "neutral",
    "plantMessages": [
      "My soil feels a bit dry, but I'm hanging in there.",
      "The light is okay, but I could use a bit more brightness.",
      "I'm not at my best, but I'm not struggling too much.",
      "A little water would help me feel more refreshed.",
      "I'm content, though some extra care would be nice."
    ],
    "recordedAt": "2026-03-06T18:10:33.578043+00:00"
  }
}
```

3. Fetch generated voice audio:

```bash
curl http://127.0.0.1:8000/api/plant/voice/ --output plant-voice.mp3 -i
```

Expected behavior:

- The backend chooses one random stored message.
- It generates MP3 audio for that message.
- It returns the audio file with headers:
  - `X-Plant-Condition`
  - `X-Plant-Message`

## Verification

Run backend tests:

```bash
./.venv/bin/python backend/manage.py test readings
```

Run a frontend production build:

```bash
cd frontend
npm run build
```

## Notes

- If port `8000` is already in use, start Django on another port such as `8001` and update the frontend URL and `curl` commands accordingly.
- `POST /api/readings/` depends on a valid `OPENROUTER_KEY`.
- `GET /api/plant/voice/` uses Google Cloud Text-to-Speech if `GOOGLE_API_KEY` is provided, and gracefully falls back to `gTTS` if omitted. It requires outbound network access.
- OpenRouter TLS verification uses `certifi` by default; if your machine needs a custom trust chain, set `OPENROUTER_CA_BUNDLE` in `.env`.

## Troubleshooting TLS errors

If you see:

`OpenRouter request failed: [SSL: CERTIFICATE_VERIFY_FAILED] ... unable to get local issuer certificate`

Use one of these fixes:

1. Reinstall backend dependencies so `certifi` is available:

```bash
./.venv/bin/pip install -r backend/requirements.txt
```

2. If your company proxy uses a custom root CA, export that CA as PEM and set:

```bash
OPENROUTER_CA_BUNDLE=/absolute/path/to/your-company-ca.pem
```

3. On macOS Python.org builds, run the bundled certificate installer once:

```bash
open "/Applications/Python 3.12/Install Certificates.command"
```
