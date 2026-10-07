from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any, Optional

from app.database import get_db
from app.models import AppSettings
from app.schemas import AppSettingsSchema, AppSettingsUpdate, TelegramTestRequest, TestDeltaRequest
from app.engine import engine
from app.notifications import notifier
from app.risk_manager import risk_manager
from app.delta_client import DeltaExchangeClient

router = APIRouter(prefix="/settings", tags=["Settings & Risk"])

@router.get("", response_model=AppSettingsSchema)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Fetch current app configuration with masked secrets."""
    res = await db.execute(select(AppSettings).order_by(AppSettings.id.desc()).limit(1))
    s = res.scalars().first()
    if not s:
        return AppSettingsSchema()

    return AppSettingsSchema(
        id=s.id,
        delta_api_key_set=bool(s.delta_api_key),
        delta_api_secret_set=bool(s.delta_api_secret),
        exchange_type=s.exchange_type or "india",
        telegram_bot_token_set=bool(s.telegram_bot_token),
        telegram_chat_id=s.telegram_chat_id,
        max_daily_loss=s.max_daily_loss or 100.0,
        max_leverage=s.max_leverage or 10,
        kill_switch=s.kill_switch or False,
        paper_balance=s.paper_balance or 10000.0
    )

@router.post("", response_model=AppSettingsSchema)
async def update_settings(payload: AppSettingsUpdate, db: AsyncSession = Depends(get_db)):
    """Update settings (Delta API, Telegram bot, risk limits)."""
    res = await db.execute(select(AppSettings).order_by(AppSettings.id.desc()).limit(1))
    s = res.scalars().first()
    if not s:
        s = AppSettings()
        db.add(s)

    if payload.delta_api_key is not None:
        s.delta_api_key = payload.delta_api_key.strip()
    if payload.delta_api_secret is not None:
        s.delta_api_secret = payload.delta_api_secret.strip()
    if payload.exchange_type is not None:
        s.exchange_type = payload.exchange_type.lower()
    if payload.telegram_bot_token is not None:
        s.telegram_bot_token = payload.telegram_bot_token.strip()
    if payload.telegram_chat_id is not None:
        s.telegram_chat_id = payload.telegram_chat_id.strip()
    if payload.max_daily_loss is not None:
        s.max_daily_loss = payload.max_daily_loss
    if payload.max_leverage is not None:
        s.max_leverage = payload.max_leverage
    if payload.kill_switch is not None:
        s.kill_switch = payload.kill_switch
    if payload.paper_balance is not None:
        s.paper_balance = payload.paper_balance

    await db.commit()
    await db.refresh(s)

    # Reinitialize engine clients with new keys
    engine.delta_client = DeltaExchangeClient(
        api_key=s.delta_api_key,
        api_secret=s.delta_api_secret,
        exchange_type=s.exchange_type or "india"
    )

    notifier.update_credentials(
        bot_token=s.telegram_bot_token,
        chat_id=s.telegram_chat_id
    )

    risk_manager.update_limits(
        max_daily_loss=s.max_daily_loss,
        max_leverage=s.max_leverage,
        kill_switch=s.kill_switch
    )

    return await get_settings(db)

@router.post("/test-telegram")
async def test_telegram(payload: TelegramTestRequest):
    """Send test alert message to user's Telegram phone app."""
    success = await notifier.send_telegram(
        f"<b>🚀 DELTA ALGO ALERT TEST</b>\n\n"
        f"{payload.message}\n\n"
        f"✅ <i>Your 24/7 VPS Algo Bot is connected and ready to notify your phone!</i>"
    )
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Failed to send Telegram test alert. Please verify your Bot Token and Chat ID."
        )
    return {"success": True, "message": "Test alert sent to your Telegram phone successfully!"}

@router.post("/test-delta")
async def test_delta(payload: Optional[TestDeltaRequest] = None, db: AsyncSession = Depends(get_db)):
    """Verify Delta Exchange API credentials."""
    client_to_test = engine.delta_client

    if payload and payload.delta_api_key and payload.delta_api_secret:
        client_to_test = DeltaExchangeClient(
            api_key=payload.delta_api_key.strip(),
            api_secret=payload.delta_api_secret.strip(),
            exchange_type=payload.exchange_type or "india"
        )
    elif not client_to_test or not client_to_test.api_key or not client_to_test.api_secret:
        # Check DB
        res = await db.execute(select(AppSettings).order_by(AppSettings.id.desc()).limit(1))
        s = res.scalars().first()
        if s and s.delta_api_key and s.delta_api_secret:
            client_to_test = DeltaExchangeClient(
                api_key=s.delta_api_key,
                api_secret=s.delta_api_secret,
                exchange_type=s.exchange_type or "india"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Please enter your API Key and API Secret first."
            )

    result = await client_to_test.test_connection()
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Connection failed"))
    return result

@router.post("/kill-switch")
async def trigger_kill_switch():
    """EMERGENCY: Halt all trading algorithms and close all open positions immediately."""
    await engine.emergency_kill_switch()
    return {"success": True, "message": "EMERGENCY KILL SWITCH ACTIVATED: All bots stopped, all open positions liquidated."}
