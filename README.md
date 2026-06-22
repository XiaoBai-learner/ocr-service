# ocr-service

Standalone OCR microservice for business card field extraction. Runs on port 3001, accepts a base64-encoded image, and returns structured JSON via an OpenAI-compatible LLM vision API.

## Setup

```bash
cd ocr-service
cp .env.example .env
# Edit .env and fill in LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
npm install
node index.js
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the service listens on |
| `LLM_BASE_URL` | `https://api.deepseek.com/v1` | OpenAI-compatible base URL (include `/v1` suffix) |
| `LLM_API_KEY` | — | API key for the LLM provider |
| `LLM_MODEL` | `deepseek-chat` | Model name (must support vision/image_url) |

## API

### GET /health

Returns `{"status":"ok"}` when the service is up.

### POST /ocr/parse

**Request**

```
Content-Type: application/json

{
  "image": "<base64-encoded image data>",
  "mime_type": "image/jpeg"
}
```

`mime_type` is optional, defaults to `image/jpeg`. Supported values: `image/jpeg`, `image/png`, `image/webp`.

**Success response** (HTTP 200)

```json
{
  "code": 0,
  "data": {
    "name": "张三",
    "title": "产品总监",
    "company": "深圳科技有限公司",
    "phone": "13800138000",
    "work_phone": "0755-88888888",
    "email": "zhangsan@company.com",
    "wechat": "zhangsan",
    "address": "深圳市南山区科技园"
  }
}
```

All 8 fields are always present as strings. Unrecognised fields are empty strings `""`, never `null`.

**Error responses**

| code | Meaning |
|---|---|
| 400 | Missing `image` field |
| 429 | Service busy (concurrent request in progress) |
| 500 | LLM call failed or JSON parse error |

## Manual test

```bash
# Health check
curl http://localhost:3001/health

# OCR parse (replace <base64> with actual data)
curl -s -X POST http://localhost:3001/ocr/parse \
  -H "Content-Type: application/json" \
  -d '{"image":"<base64>","mime_type":"image/jpeg"}' | jq .
```
