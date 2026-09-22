from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Dict, Any
import os
import yaml

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "llama3.2:1b"
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 300
    LLM_TIMEOUT_SECONDS: float = 10.0
    LLM_KEEP_ALIVE: str = "30m"

    KNOWLEDGE_BASE_PATH: str = "knowledge"
    CHROMA_PERSIST_DIR: str = ".chromadb"
    RAG_TOP_K: int = 3

    BACKGROUND_WORKER_QUEUE_SIZE: int = 50

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def load_yaml_config(self, filepath: str) -> Dict[str, Any]:
        if not os.path.exists(filepath):
            return {}
        with open(filepath, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

settings = Settings()
