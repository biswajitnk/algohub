import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.models import BotConfig, AppSettings
from app.engine import engine
from app.api.dashboard import router as dashboard_router
from app.api.bots import router as bots_router
from app.api.trades import router as trades_router
from app.api.market import router as market_router
from app.api.settings import router as settings_router
from app.api.websocket import router as ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("delta_trading_system")

async def seed_default_bots():
    """Seed initial strategies for US Stock Tokens on Delta Exchange."""
    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(BotConfig))
        if not existing.scalars().first():
            bots = [
                BotConfig(
                    name="NVDA Daily Breakout Bot",
                    symbol="NVDAXUSD",
                    strategy_name="RSI_EMA_Breakout",
                    timeframe="1d",
                    mode="PAPER",
                    is_active=True,
                    allocation_usd=100.0,
                    leverage=5,
                    stop_loss_pct=2.5,
                    take_profit_pct=10.0,
                    params='{"category": "MegaCap", "rsi_period": 14, "ema_period": 20, "past_dip_window": 6, "min_today_gain_pct": 2.0, "target_rr_ratio": 2.0}'
                ),
                BotConfig(
                    name="PLTR Daily Breakout Bot",
                    symbol="PLTRBUSD",
                    strategy_name="RSI_EMA_Breakout",
                    timeframe="1d",
                    mode="PAPER",
                    is_active=True,
                    allocation_usd=100.0,
                    leverage=5,
                    stop_loss_pct=2.5,
                    take_profit_pct=10.0,
                    params='{"category": "Growth & Tech", "rsi_period": 14, "ema_period": 20, "past_dip_window": 6, "min_today_gain_pct": 2.0, "target_rr_ratio": 2.0}'
                ),
                BotConfig(
                    name="AMD Daily Breakout Bot",
                    symbol="AMDBUSD",
                    strategy_name="RSI_EMA_Breakout",
                    timeframe="1d",
                    mode="PAPER",
                    is_active=True,
                    allocation_usd=100.0,
                    leverage=5,
                    stop_loss_pct=2.5,
                    take_profit_pct=10.0,
                    params='{"category": "Semis & AI", "rsi_period": 14, "ema_period": 20, "past_dip_window": 6, "min_today_gain_pct": 2.0, "target_rr_ratio": 2.0}'
                ),
                BotConfig(
                    name="LITE Daily Breakout Bot",
                    symbol="LITEBUSD",
                    strategy_name="RSI_EMA_Breakout",
                    timeframe="1d",
                    mode="PAPER",
                    is_active=True,
                    allocation_usd=100.0,
                    leverage=5,
                    stop_loss_pct=2.5,
                    take_profit_pct=10.0,
                    params='{"category": "Semis & AI", "rsi_period": 14, "ema_period": 20, "past_dip_window": 6, "min_today_gain_pct": 2.0, "target_rr_ratio": 2.0}'
                ),
                BotConfig(
                    name="AMZN Daily Breakout Bot",
                    symbol="AMZNXUSD",
                    strategy_name="RSI_EMA_Breakout",
                    timeframe="1d",
                    mode="PAPER",
                    is_active=False,
                    allocation_usd=100.0,
                    leverage=5,
                    stop_loss_pct=2.5,
                    take_profit_pct=10.0,
                    params='{"category": "MegaCap", "rsi_period": 14, "ema_period": 20, "past_dip_window": 6, "min_today_gain_pct": 2.0, "target_rr_ratio": 2.0}'
                )
            ]
            session.add_all(bots)
            await session.commit()
            logger.info("Seeded US Stock Token Breakout bot configurations.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Delta Algo Trading Platform...")
    await init_db()
    await engine.initialize()
    await seed_default_bots()
    engine.start()
    yield
    # Shutdown
    logger.info("Stopping Delta Algo Trading Platform...")
    await engine.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS setup for Web Dashboard and Mobile App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(bots_router, prefix=settings.API_V1_STR)
app.include_router(trades_router, prefix=settings.API_V1_STR)
app.include_router(market_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "engine_running": engine.is_running,
        "exchange_type": engine.delta_client.exchange_type if engine.delta_client else "india",
        "version": settings.VERSION
    }
