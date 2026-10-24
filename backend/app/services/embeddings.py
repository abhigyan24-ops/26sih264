"""
Embedding service: local ONNX inference via fastembed.
Model is downloaded on first call then cached; all subsequent calls work offline.
Dimension must match vector(384) in schema.sql.
"""
import logging
from functools import lru_cache

from fastembed import TextEmbedding

from ..config import settings

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _model() -> TextEmbedding:
    """Load once, reuse forever. Downloads weights on first run into embed_cache_dir."""
    return TextEmbedding(model_name=settings.embed_model, cache_dir=settings.embed_cache_dir)


def embed_many(texts: list[str]) -> list[list[float]]:
    """Return a list of float vectors, one per text. Checks for non-empty text and dimension."""
    clean = [(t or "").strip() for t in texts]
    if any(not t for t in clean):
        raise ValueError("cannot embed empty text")
    vecs = [v.tolist() for v in _model().embed(clean)]
    for v in vecs:
        if len(v) != settings.embed_dim:
            raise RuntimeError(
                f"embedding has {len(v)} dims, schema expects {settings.embed_dim} "
                f"(model {settings.embed_model})"
            )
    return vecs


def embed_one(text_: str) -> list[float]:
    return embed_many([text_])[0]


def vec_literal(v: list[float]) -> str:
    """Format a vector as a PostgreSQL literal string: [x,y,z,...]"""
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"


def warm_up() -> None:
    embed_one("warm up")
    log.info("embedding model ready: %s", settings.embed_model)
