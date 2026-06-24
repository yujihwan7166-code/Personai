from __future__ import annotations

import base64
import os
import time
from io import BytesIO
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from PIL import Image, ImageOps
from pydantic import BaseModel, Field


DEFAULT_LANG = os.getenv("PADDLE_OCR_LANG", "korean")
MAX_IMAGES_PER_REQUEST = int(os.getenv("PADDLE_OCR_MAX_IMAGES", "4"))

app = FastAPI(title="Study PaddleOCR Service", version="0.1.0")


class OcrImage(BaseModel):
    page: int = Field(ge=1)
    dataUrl: str


class OcrRequest(BaseModel):
    images: list[OcrImage] = Field(min_length=1)
    lang: str | None = None


class OcrLine(BaseModel):
    text: str
    confidence: float | None = None
    box: list[list[float]] | None = None


class OcrPageResult(BaseModel):
    page: int
    text: str
    avgConfidence: float | None = None
    lines: list[OcrLine] = Field(default_factory=list)
    durationMs: int
    error: str | None = None


class OcrResponse(BaseModel):
    engine: str = "paddleocr"
    lang: str
    results: list[OcrPageResult]


_ocr_instances: dict[str, Any] = {}


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "true", "engine": "paddleocr", "defaultLang": DEFAULT_LANG}


@app.post("/ocr", response_model=OcrResponse)
def ocr_pages(payload: OcrRequest) -> OcrResponse:
    if len(payload.images) > MAX_IMAGES_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Too many images. Max {MAX_IMAGES_PER_REQUEST} per request.",
        )

    lang = (payload.lang or DEFAULT_LANG).strip() or DEFAULT_LANG
    ocr = get_ocr(lang)
    results: list[OcrPageResult] = []

    for item in payload.images:
        started_at = time.perf_counter()
        try:
            image = decode_data_url(item.dataUrl)
            lines = run_ocr(ocr, image)
            text = "\n".join(line.text for line in lines if line.text.strip()).strip()
            confidences = [
                line.confidence
                for line in lines
                if isinstance(line.confidence, (int, float))
            ]
            avg_confidence = (
                sum(confidences) / len(confidences) if confidences else None
            )
            results.append(
                OcrPageResult(
                    page=item.page,
                    text=text,
                    avgConfidence=avg_confidence,
                    lines=lines,
                    durationMs=elapsed_ms(started_at),
                )
            )
        except Exception as exc:  # Keep batch responses page-scoped.
            results.append(
                OcrPageResult(
                    page=item.page,
                    text="",
                    lines=[],
                    durationMs=elapsed_ms(started_at),
                    error=str(exc),
                )
            )

    return OcrResponse(lang=lang, results=results)


def get_ocr(lang: str) -> Any:
    cached = _ocr_instances.get(lang)
    if cached is not None:
        return cached

    try:
        from paddleocr import PaddleOCR
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "PaddleOCR is not installed in this Python environment. "
                "Run `python -m pip install -r services/paddle-ocr/requirements.txt`."
            ),
        ) from exc

    # use_angle_cls helps Korean scan pages that are slightly rotated.
    instance = PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)
    _ocr_instances[lang] = instance
    return instance


def decode_data_url(data_url: str) -> Image.Image:
    if "," not in data_url or not data_url.startswith("data:image/"):
        raise ValueError("Invalid image data URL")
    encoded = data_url.split(",", 1)[1]
    raw = base64.b64decode(encoded, validate=True)
    image = Image.open(BytesIO(raw))
    image = ImageOps.exif_transpose(image)
    return image.convert("RGB")


def run_ocr(ocr: Any, image: Image.Image) -> list[OcrLine]:
    array = np.asarray(image)

    if hasattr(ocr, "ocr"):
        raw = ocr.ocr(array, cls=True)
    elif hasattr(ocr, "predict"):
        raw = ocr.predict(array)
    else:
        raise RuntimeError("Unsupported PaddleOCR instance")

    lines = list(iter_ocr_lines(raw))
    lines.sort(key=lambda line: line_sort_key(line.box))
    return lines


def iter_ocr_lines(value: Any) -> list[OcrLine]:
    output: list[OcrLine] = []

    def visit(node: Any) -> None:
        parsed = parse_line(node)
        if parsed is not None:
            output.append(parsed)
            return
        if isinstance(node, dict):
            for candidate_key in ("rec_texts", "texts", "dt_polys", "rec_scores"):
                if candidate_key in node:
                    parsed_dict = parse_dict_result(node)
                    if parsed_dict:
                        output.extend(parsed_dict)
                        return
            for value in node.values():
                visit(value)
            return
        if isinstance(node, (list, tuple)):
            for child in node:
                visit(child)

    visit(value)
    return dedupe_lines(output)


def parse_line(node: Any) -> OcrLine | None:
    if not isinstance(node, (list, tuple)) or len(node) < 2:
        return None
    box = normalize_box(node[0])
    text, confidence = normalize_text_confidence(node[1])
    if not text:
        return None
    return OcrLine(text=text, confidence=confidence, box=box)


def parse_dict_result(node: dict[str, Any]) -> list[OcrLine]:
    texts = node.get("rec_texts") or node.get("texts") or []
    scores = node.get("rec_scores") or node.get("scores") or []
    boxes = node.get("dt_polys") or node.get("boxes") or []
    if not isinstance(texts, list):
        return []

    lines: list[OcrLine] = []
    for index, raw_text in enumerate(texts):
        text = str(raw_text).strip()
        if not text:
            continue
        confidence = safe_float(scores[index]) if index < len(scores) else None
        box = normalize_box(boxes[index]) if index < len(boxes) else None
        lines.append(OcrLine(text=text, confidence=confidence, box=box))
    return lines


def normalize_text_confidence(value: Any) -> tuple[str, float | None]:
    if isinstance(value, str):
        return value.strip(), None
    if isinstance(value, (list, tuple)) and value:
        text = str(value[0]).strip()
        confidence = safe_float(value[1]) if len(value) > 1 else None
        return text, confidence
    if isinstance(value, dict):
        text = str(value.get("text") or value.get("label") or "").strip()
        confidence = safe_float(value.get("confidence") or value.get("score"))
        return text, confidence
    return "", None


def normalize_box(value: Any) -> list[list[float]] | None:
    if not isinstance(value, (list, tuple)):
        return None
    points: list[list[float]] = []
    for point in value:
        if not isinstance(point, (list, tuple)) or len(point) < 2:
            continue
        x = safe_float(point[0])
        y = safe_float(point[1])
        if x is None or y is None:
            continue
        points.append([x, y])
    return points if points else None


def dedupe_lines(lines: list[OcrLine]) -> list[OcrLine]:
    seen: set[tuple[str, int, int]] = set()
    clean: list[OcrLine] = []
    for line in lines:
        x, y = box_anchor(line.box)
        key = (line.text, round(x / 4), round(y / 4))
        if key in seen:
            continue
        seen.add(key)
        clean.append(line)
    return clean


def line_sort_key(box: list[list[float]] | None) -> tuple[float, float]:
    x, y = box_anchor(box)
    return y, x


def box_anchor(box: list[list[float]] | None) -> tuple[float, float]:
    if not box:
        return 0.0, 0.0
    xs = [point[0] for point in box if len(point) >= 2]
    ys = [point[1] for point in box if len(point) >= 2]
    return (min(xs) if xs else 0.0, min(ys) if ys else 0.0)


def safe_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        result = float(value)
        if not np.isfinite(result):
            return None
        return result
    except (TypeError, ValueError):
        return None


def elapsed_ms(started_at: float) -> int:
    return max(0, round((time.perf_counter() - started_at) * 1000))
