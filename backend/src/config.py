from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""
    huggingface_api_key: str = ""
    redis_url: str = "redis://localhost:6379"
    debug: bool = True
    port: int = 8001

    class Config:
        env_file = ".env"


settings = Settings()
