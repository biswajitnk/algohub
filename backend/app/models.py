import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class BotConfig(Base):
    __tablename__ = "bot_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    symbol = Column(String(50), nullable=False, default="BTCUSD")
    product_id = Column(Integer, nullable=True)
    strategy_name = Column(String(50), nullable=False, default="Supertrend")
    timeframe = Column(String(10), nullable=False, default="5m")
    mode = Column(String(10), nullable=False, default="PAPER")  # "PAPER" or "LIVE"
    is_active = Column(Boolean, default=False)
    allocation_usd = Column(Float, default=100.0)
    allocation_pct = Column(Float, default=10.0)   # % of total portfolio balance
    risk_pct = Column(Float, default=2.0)         # % of total balance risked per trade on SL hit
    leverage = Column(Integer, default=5)
    stop_loss_pct = Column(Float, nullable=True, default=None)  # Optional fallback SL
    take_profit_pct = Column(Float, nullable=True, default=None) # Optional TP
    params = Column(Text, default="{}")          # JSON string for strategy params
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    trades = relationship("Trade", back_populates="bot", cascade="all, delete-orphan")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bot_configs.id"), nullable=True)
    strategy_name = Column(String(50), nullable=False)
    symbol = Column(String(50), nullable=False)
    side = Column(String(10), nullable=False)      # "buy" (long) or "sell" (short)
    mode = Column(String(10), nullable=False, default="PAPER")
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)
    size = Column(Float, nullable=False)            # Notional size in USD
    contracts = Column(Integer, default=1)
    leverage = Column(Integer, default=5)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    pnl = Column(Float, default=0.0)               # Realized PnL in USD
    pnl_pct = Column(Float, default=0.0)
    status = Column(String(20), default="OPEN")    # "OPEN", "CLOSED", "CANCELLED"
    exit_reason = Column(String(50), nullable=True)# "TAKE_PROFIT", "STOP_LOSS", "REVERSAL", "MANUAL", "KILL_SWITCH"
    delta_order_id = Column(String(100), nullable=True)
    delta_exit_order_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    bot = relationship("BotConfig", back_populates="trades")


class EquitySnapshot(Base):
    __tablename__ = "equity_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    total_balance = Column(Float, default=1000.0)
    available_balance = Column(Float, default=1000.0)
    realized_pnl = Column(Float, default=0.0)
    unrealized_pnl = Column(Float, default=0.0)
    mode = Column(String(10), default="PAPER")


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    level = Column(String(20), default="INFO")    # "INFO", "WARNING", "TRADE", "ERROR"
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    channel = Column(String(50), default="SYSTEM")


class AppSettings(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    delta_api_key = Column(String(255), nullable=True)
    delta_api_secret = Column(String(255), nullable=True)
    exchange_type = Column(String(20), default="india")  # "india" or "global"
    telegram_bot_token = Column(String(255), nullable=True)
    telegram_chat_id = Column(String(100), nullable=True)
    max_daily_loss = Column(Float, default=100.0)
    max_leverage = Column(Integer, default=10)
    kill_switch = Column(Boolean, default=False)
    paper_balance = Column(Float, default=10000.0)       # Virtual balance for paper trading
