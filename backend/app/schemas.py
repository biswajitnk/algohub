from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class BotConfigBase(BaseModel):
    name: str = Field(..., example="BTC Supertrend Scalper")
    symbol: str = Field(..., example="BTCUSD")
    product_id: Optional[int] = None
    strategy_name: str = Field(..., example="Supertrend")
    timeframe: str = Field(..., example="5m")
    mode: str = Field(..., example="PAPER")  # "PAPER" or "LIVE"
    allocation_usd: Optional[float] = Field(100.0, ge=1.0, example=100.0)
    allocation_pct: Optional[float] = Field(10.0, ge=0.5, le=100.0, example=10.0)
    risk_pct: Optional[float] = Field(2.0, ge=0.1, le=50.0, example=2.0)
    leverage: int = Field(5, ge=1, le=100, example=5)
    stop_loss_pct: Optional[float] = Field(None, example=2.5)
    take_profit_pct: Optional[float] = Field(None, example=10.0)
    params: Optional[str] = "{}"

class BotConfigCreate(BotConfigBase):
    pass

class BotConfigUpdate(BaseModel):
    name: Optional[str] = None
    symbol: Optional[str] = None
    product_id: Optional[int] = None
    strategy_name: Optional[str] = None
    timeframe: Optional[str] = None
    mode: Optional[str] = None
    is_active: Optional[bool] = None
    allocation_usd: Optional[float] = None
    allocation_pct: Optional[float] = None
    risk_pct: Optional[float] = None
    leverage: Optional[int] = None
    stop_loss_pct: Optional[float] = None
    take_profit_pct: Optional[float] = None
    params: Optional[str] = None

class BotConfigResponse(BotConfigBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TradeResponse(BaseModel):
    id: int
    bot_id: Optional[int]
    strategy_name: str
    symbol: str
    side: str
    mode: str
    entry_price: float
    exit_price: Optional[float]
    size: float
    contracts: int
    leverage: int
    stop_loss: Optional[float]
    take_profit: Optional[float]
    pnl: float
    pnl_pct: float
    status: str
    exit_reason: Optional[str]
    delta_order_id: Optional[str]
    delta_exit_order_id: Optional[str]
    created_at: datetime
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True

class TradeCloseRequest(BaseModel):
    trade_id: int
    reason: Optional[str] = "MANUAL_CLOSE"

class EquitySnapshotResponse(BaseModel):
    id: int
    timestamp: datetime
    total_balance: float
    available_balance: float
    realized_pnl: float
    unrealized_pnl: float
    mode: str

    class Config:
        from_attributes = True

class AlertLogResponse(BaseModel):
    id: int
    timestamp: datetime
    level: str
    title: str
    message: str
    channel: str

    class Config:
        from_attributes = True

class AppSettingsSchema(BaseModel):
    id: Optional[int] = None
    delta_api_key_set: bool = False
    delta_api_secret_set: bool = False
    exchange_type: str = "india"
    telegram_bot_token_set: bool = False
    telegram_chat_id: Optional[str] = None
    max_daily_loss: float = 100.0
    max_leverage: int = 10
    kill_switch: bool = False
    paper_balance: float = 10000.0

class AppSettingsUpdate(BaseModel):
    delta_api_key: Optional[str] = None
    delta_api_secret: Optional[str] = None
    exchange_type: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    max_daily_loss: Optional[float] = None
    max_leverage: Optional[int] = None
    kill_switch: Optional[bool] = None
    paper_balance: Optional[float] = None

class TelegramTestRequest(BaseModel):
    message: Optional[str] = "🔔 Delta Algo Trading: Test alert connection successful!"

class TestDeltaRequest(BaseModel):
    delta_api_key: Optional[str] = None
    delta_api_secret: Optional[str] = None
    exchange_type: Optional[str] = "india"

class PositionItem(BaseModel):
    id: Optional[int] = None
    symbol: str
    product_id: Optional[int] = None
    side: str
    size: float
    contracts: int
    entry_price: float
    mark_price: float
    liquidation_price: Optional[float] = None
    leverage: int
    unrealized_pnl: float
    unrealized_pnl_pct: float
    mode: str
    trade_id: Optional[int] = None

class DashboardStatsResponse(BaseModel):
    total_balance: float
    available_balance: float
    today_pnl: float
    today_pnl_pct: float
    all_time_pnl: float
    total_trades: int
    win_trades: int
    loss_trades: int
    win_rate: float
    active_bots: int
    total_bots: int
    open_positions_count: int
    kill_switch: bool
    exchange_connected: bool
    exchange_type: str
    mode: Optional[str] = "LIVE"
    live_balance: Optional[float] = 0.0
    paper_balance: Optional[float] = 10000.0
