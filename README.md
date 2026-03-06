# Plant Monitor Demo

This project includes:

- A Django backend in `backend/` with SQLite storage and HTTP APIs.
- A Next.js frontend in `frontend/` for submitting and viewing plant sensor readings.

## Data model

Each reading stores:

- `soilLevel` as a percentage from 0 to 100
- `ambientLightLevel` in lux
- `recordedAt`

## Backend API

- `GET /api/health/`
- `GET /api/readings/`
- `POST /api/readings/`
- `GET /api/plant/status/`
- `GET /api/plant/voice/`

Example request:

```json
{
  "soilLevel": 58,
  "ambientLightLevel": 620
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

Backend:

```bash
python3 -m venv .venv
./.venv/bin/pip install -r backend/requirements.txt
./.venv/bin/python backend/manage.py migrate
./.venv/bin/python backend/manage.py runserver 127.0.0.1:8000
```

Frontend:

```bash
cd frontend
npm install
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api npm run dev
```

Then open `http://127.0.0.1:3000`.
