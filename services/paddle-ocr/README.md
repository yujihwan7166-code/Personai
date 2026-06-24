# PaddleOCR service

Local OCR service for study-room PDFs. The web app sends rendered page images to this server, and this server returns Korean/English OCR text plus rough line boxes.

## Setup

```powershell
cd services/paddle-ocr
py -3 -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\python -m pip install -r requirements.txt
```

## Run

```powershell
cd services/paddle-ocr
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

Then keep the normal web app running with:

```powershell
npm run dev
```

The Vite app proxies `/api/study-paddle-ocr` to `PADDLE_OCR_URL`, which defaults to `http://127.0.0.1:8765`.

## Notes

- Default language is Korean: `PADDLE_OCR_LANG=korean`.
- First request can be slow because PaddleOCR downloads/loads model files.
- If this server is not running, the study room should continue using the existing Tesseract/Vision fallback.
