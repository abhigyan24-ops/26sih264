import os
import sys
import threading
import traceback
from pathlib import Path
from sqlalchemy import text, inspect

def init_db():
    from app.db import engine
    from app.config import settings

    print("[CaseNexus Init] Checking database connection and tables...")
    try:
        # Step 1: Initialize schema if tables are missing
        with engine.connect() as conn:
            inspector = inspect(conn)
            tables = inspector.get_table_names()
            print(f"[CaseNexus Init] Existing tables: {tables}")

        if "officers" not in tables or "cases" not in tables:
            print("[CaseNexus Init] Initializing schema from schema.sql...")
            schema_paths = [
                Path("db/schema.sql"),
                Path("../db/schema.sql"),
                Path(__file__).resolve().parent.parent.parent / "db" / "schema.sql",
                Path(__file__).resolve().parent.parent / "db" / "schema.sql",
            ]
            schema_path = next((p for p in schema_paths if p.exists()), None)

            if schema_path:
                sql_content = schema_path.read_text(encoding="utf-8")
                # Use raw psycopg autocommit connection so statements execute cleanly
                with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                    # Execute each statement
                    for raw_stmt in sql_content.split(";"):
                        stmt = raw_stmt.strip()
                        if not stmt:
                            continue
                        try:
                            conn.execute(text(stmt))
                        except Exception as ex:
                            # Log warning (e.g. extension or table notices)
                            print(f"[CaseNexus Init] Statement notice: {ex}")
                print("[CaseNexus Init] Schema setup completed.")
            else:
                print(f"[CaseNexus Init] ERROR: schema.sql not found in search paths: {schema_paths}")

        # Step 2: Seed data if no officers exist
        with engine.connect() as conn:
            officer_count = 0
            try:
                officer_count = conn.execute(text("SELECT count(*) FROM officers")).scalar() or 0
            except Exception:
                pass

        if officer_count == 0:
            print("[CaseNexus Init] Seeding demo officers and records...")
            try:
                from scripts.seed import main as seed_main
                seed_main()
                print("[CaseNexus Init] Seeding completed.")
            except Exception as seed_err:
                print(f"[CaseNexus Init] Seed notice: {seed_err}")
                traceback.print_exc()

        # Step 3: Train overlap model if artifact missing
        art_path = Path("ml/artifacts/calibrated_overlap.joblib")
        if not art_path.exists():
            print("[CaseNexus Init] Training calibrated ML overlap model...")
            try:
                from ml.train_overlap import main as train_main
                train_main()
                print("[CaseNexus Init] ML model training completed.")
            except Exception as train_err:
                print(f"[CaseNexus Init] Model training notice: {train_err}")
                traceback.print_exc()

    except Exception as e:
        print(f"[CaseNexus Init] Database initialization notice: {e}")
        traceback.print_exc()

def background_init():
    try:
        init_db()
    except Exception as e:
        print(f"[CaseNexus Init] Background init error: {e}")

if __name__ == "__main__":
    # Start database initialization
    # (Schema creation runs first, heavy ML/seeding continues in background so port binds immediately)
    t = threading.Thread(target=background_init, daemon=True)
    t.start()

    port = int(os.environ.get("PORT", 8000))
    print(f"[CaseNexus] Starting Uvicorn API server on port {port}...")
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
