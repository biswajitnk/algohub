import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Delta Algo Trading System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Delta Exchange Configuration
    DELTA_EXCHANGE_TYPE: str = "india"  # "india" or "global"
    DELTA_BASE_URL_INDIA: str = "https://api.india.delta.exchange"
    DELTA_WS_URL_INDIA: str = "wss://socket.india.delta.exchange"
    DELTA_BASE_URL_GLOBAL: str = "https://api.delta.exchange"
    DELTA_WS_URL_GLOBAL: str = "wss://socket.delta.exchange"
    
    DELTA_API_KEY: Optional[str] = None
    DELTA_API_SECRET: Optional[str] = None
    
    # Telegram Bot Alerts
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID: Optional[str] = None
    
    # Risk Management Defaults
    DEFAULT_MAX_DAILY_LOSS_USD: float = 100.0
    DEFAULT_MAX_LEVERAGE: int = 10
    DEFAULT_MAX_POSITION_SIZE_USD: float = 500.0
    KILL_SWITCH_ACTIVE: bool = False
    
    # Storage & DB
    DATABASE_URL: str = "sqlite+aiosqlite:///./trading_bot.db"
    SECRET_KEY: str = "supersecret_delta_algo_jwt_key_change_in_production"
    
    # Security
    ALLOWED_HOSTS: str = "*"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()
