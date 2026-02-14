from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_host: str = "http://host.docker.internal:11434"
    chat_model: str = "llama3.1:8b"
    embedding_model: str = "nomic-embed-text"
    database_path: str = "data/dkia.db"
    embedding_dim: int = 768


settings = Settings()
