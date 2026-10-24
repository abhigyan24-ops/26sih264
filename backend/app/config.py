from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://aicte:aicte@localhost:5432/aicte"
    jwt_secret: str = "dev-secret-change-me"
    jwt_alg: str = "HS256"
    jwt_minutes: int = 480

    storage_backend: str = "local"          # local | s3
    local_storage_dir: str = "./storage"
    s3_bucket: str | None = None

    # Embedding model: verify name is supported by your installed fastembed version.
    # Dimension must match vector(384) in schema.sql.
    embed_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    embed_dim: int = 384
    fastembed_cache_dir: str = "./.cache/fastembed"
    embed_cache_dir: str = "./models"


settings = Settings()
