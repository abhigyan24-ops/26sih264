"""
Embedding service: local ONNX inference via fastembed.
Model is downloaded on first call then cached; all subsequent calls work offline.
Dimension must match vector(384) in schema.sql.
"""
from functools import lru_cache

from fastembed import TextEmbedding

from ..config import settings


@lru_cache(maxsize=1)
def _model() -> TextEmbedding:
    """Load once, reuse forever. Downloads weights on first run."""
    return TextEmbedding(model_name=settings.embed_model)


def embed_many(texts: list[str]) -> list[list[float]]:
    """Return a list of float vectors, one per text."""
    return [v.tolist() for v in _model().embed(texts)]


def embed_one(text_: str) -> list[float]:
    return embed_many([text_])[0]


def vec_literal(v: list[float]) -> str:
    """Format a vector as a PostgreSQL literal string: [x,y,z,...]"""
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"
