import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, cases, institutions, overlaps, alerts, reports, admin, meta, documents, sla, privacy, evaluation

logger = logging.getLogger("aicte")

@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.jwt_secret == "dev-secret-change-me":
        logger.warning("WARNING [D12]: jwt_secret is using the default 'dev-secret-change-me'. Set JWT_SECRET in production.")
    try:
        from .services.embeddings import warm_up
        warm_up()
    except Exception:
        logger.exception("embedding warm-up failed; first request will retry")
    yield

app = FastAPI(
    title="CaseNexus — AICTE Complaint Dashboard API",
    description=(
        "SIH 2026 PS 26264: Integrated Dashboard for Monitoring and Tracking "
        "Institution-Related Complaint Cases Across AICTE Bureaus/Cells.\n\n"
        "**Note:** All data is synthetic. No real complaint records are used."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],  # BD4: let browser JS read pagination total
)

for r in (auth, cases, institutions, overlaps, alerts, reports, admin, meta, documents, sla, privacy, evaluation):
    app.include_router(r.router)


@app.get("/api/health", tags=["system"])
def health():
    return {"ok": True, "service": "CaseNexus API"}
