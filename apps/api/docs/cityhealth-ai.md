# CityHealth AI

Integrated into the existing **Express** API (not NestJS). Uses real PostgreSQL hospital / bed / equipment / blood data via controlled tools. Gemini runs **server-side only**.

## Endpoints (`/api/v1/ai`)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/chat` | Main assistant turn |
| POST | `/sessions` | Create session |
| GET | `/sessions` | List my sessions |
| GET | `/sessions/:id/messages` | History |
| POST | `/analyze-emergency` | Deterministic severity |
| POST | `/recommend-hospitals` | Wraps matching engine |
| POST | `/emergency` | Log emergency + hospital suggestions |
| GET | `/emergency/:id` | Fetch event |
| GET | `/medical-sources` | Curated knowledge catalog |

Auth: Bearer JWT (`PATIENT`, `DOCTOR`, or `CITY_ADMIN`). Rate-limited (`rl:ai`).

## Env

```
AI_PROVIDER=gemini
GEMINI_API_KEY=          # never put in Expo/Vite
GEMINI_MODEL=gemini-2.0-flash
AI_TIMEOUT_MS=25000
```

Without `GEMINI_API_KEY`, the API still answers using safety rules + RAG FTS + live hospital tools (`provider: fallback`).

## Safety

Critical patterns (chest pain, severe breathlessness, stroke signs, unconsciousness, etc.) escalate immediately to **112** and hospital recommendations. Rule-based CRITICAL cannot be downgraded by the LLM.

## Data grounding

Tools (parameterized SQL / existing services only):

- `searchNearbyHospitals` → `POST /match`
- `getHospitalDetails` / beds / equipment
- `searchBloodBanks`
- `searchMedicalKnowledge` → `medical_knowledge` FTS

Migrations: `016_cityhealth_ai.sql`
