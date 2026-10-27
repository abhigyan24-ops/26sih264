import os
import sys
from pathlib import Path
from sqlalchemy import text, inspect

def run_init():
    from app.db import engine
    from app.config import settings

    print("Connecting to database...")
    try:
        with engine.connect() as conn:
            inspector = inspect(conn)
            tables = inspector.get_table_names()
            print(f"Existing tables in database: {tables}")
            
            # Check if schema needs to be initialized
            if "officers" not in tables or "cases" not in tables:
                print("Database tables not found. Initializing schema from schema.sql...")
                schema_path = Path("db/schema.sql")
                if not schema_path.exists():
                    schema_path = Path("../db/schema.sql")
                if not schema_path.exists():
                    schema_path = Path(__file__).resolve().parent.parent.parent / "db" / "schema.sql"

                if schema_path.exists():
                    sql_content = schema_path.read_text(encoding="utf-8")
                    with engine.begin() as tx_conn:
                        for stmt in sql_content.split(";"):
                            clean_stmt = stmt.strip()
                            if clean_stmt:
                                try:
                                    tx_conn.execute(text(clean_stmt))
                                except Exception as stmt_err:
                                    print(f"Statement notice: {stmt_err}")
                    print("Schema initialized successfully!")
                else:
                    print(f"schema.sql not found at {schema_path}")

            # Check if officers have been seeded
            officer_count = 0
            try:
                with engine.connect() as conn2:
                    officer_count = conn2.execute(text("SELECT count(*) FROM officers")).scalar() or 0
            except Exception:
                pass

            if officer_count == 0:
                print("No officers found. Running seed script...")
                from scripts.seed import main as seed_main
                seed_main()
                print("Seed data completed!")

            # Check if ML artifacts exist
            art_path = Path("ml/artifacts/calibrated_overlap.joblib")
            if not art_path.exists():
                print("ML artifacts not found. Training overlap model...")
                from ml.train_overlap import main as train_main
                train_main()
                print("Model training completed!")

    except Exception as e:
        print(f"Initialization check notice: {e}")

if __name__ == "__main__":
    run_init()
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting CaseNexus API server on port {port}...")
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
