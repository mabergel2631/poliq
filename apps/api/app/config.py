from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    s3_endpoint: str = "localhost:9000"
    s3_access_key: str
    s3_secret_key: str
    s3_bucket: str = "poliq"

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    llm_provider: str = "anthropic"  # "anthropic" or "openai"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    cors_origins: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
