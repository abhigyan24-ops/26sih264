from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, cases, institutions, overlaps, alerts, reports, admin

app = FastAPI(
    title="CaseNexus — AICTE Complaint Dashboard API",
    description=(
        "SIH 2026 PS 26264: Integrated Dashboard for Monitoring and Tracking "
        "Institution-Related Complaint Cases Across AICTE Bureaus/Cells.\n\n"
        "**Note:** All data is synthetic. No real complaint records are used."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, cases, institutions, overlaps, alerts, reports, admin):
    app.include_router(r.router)


@app.get("/api/health", tags=["system"])
def health():
    return {"ok": True, "service": "CaseNexus API"}
