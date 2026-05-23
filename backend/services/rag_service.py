import os
import json
import logging
import time
import numpy as np
import google.generativeai as genai
from backend.config import GEMINI_API_KEY, BASE_DIR

EMBED_DELAY = 0.1  # 10 embeds/sec — well under free tier 1500 RPM limit

logger = logging.getLogger(__name__)
genai.configure(api_key=GEMINI_API_KEY)

KB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "knowledge_base")
INDEX_PATH = os.path.join(BASE_DIR, "kb_index.json")

_index: list[dict] = []  # [{text, embedding, source}]


def _embed(text: str) -> list[float]:
    result = genai.embed_content(model="models/gemini-embedding-001", content=text)
    return result["embedding"]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0


def _chunk_document(text: str, chunk_size: int = 600) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 80]
    chunks, current = [], ""
    for para in paragraphs:
        if len(current) + len(para) < chunk_size:
            current = current + "\n\n" + para if current else para
        else:
            if current:
                chunks.append(current)
            current = para
    if current:
        chunks.append(current)
    return chunks


def load_knowledge_base():
    """Embed KB docs and cache to kb_index.json. Skips if index already exists."""
    global _index
    if os.path.exists(INDEX_PATH):
        try:
            with open(INDEX_PATH, encoding="utf-8") as f:
                _index = json.load(f)
            logger.info("RAG: Loaded %d chunks from index cache.", len(_index))
            return
        except Exception as e:
            logger.warning("RAG: Index cache corrupt, rebuilding. %s", e)

    if not os.path.exists(KB_DIR):
        logger.warning("RAG: knowledge_base directory not found at %s", KB_DIR)
        return

    _index = []
    for fname in sorted(os.listdir(KB_DIR)):
        if not fname.endswith(".md"):
            continue
        with open(os.path.join(KB_DIR, fname), encoding="utf-8") as f:
            content = f.read()
        for chunk in _chunk_document(content):
            try:
                embedding = _embed(chunk)
                _index.append({"text": chunk, "embedding": embedding, "source": fname})
                time.sleep(EMBED_DELAY)
            except Exception as e:
                logger.error("RAG: embed failed for %s: %s", fname, e)
                time.sleep(1.0)  # back off on error

    try:
        with open(INDEX_PATH, "w", encoding="utf-8") as f:
            json.dump(_index, f)
        logger.info("RAG: Built and cached index with %d chunks.", len(_index))
    except Exception as e:
        logger.error("RAG: Failed to save index: %s", e)


def query_knowledge_base(query: str, n_results: int = 3) -> list[str]:
    """Return top-n most relevant text chunks for a query."""
    if not _index:
        return []
    try:
        q_emb = _embed(query)
        scored = [(entry["text"], _cosine_similarity(q_emb, entry["embedding"])) for entry in _index]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [text for text, _ in scored[:n_results]]
    except Exception as e:
        logger.error("RAG: query failed: %s", e)
        return []
