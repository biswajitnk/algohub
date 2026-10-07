from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

from app.database import get_db
from app.models import Trade, BotConfig, EquitySnapshot, AppSettings
from app.schemas import DashboardStatsResponse, EquitySnapshotResponse
from app.engine import engine

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    mode: Optional[str] = Query(None, description="Filter stats by PAPER or LIVE"),
    db: AsyncSession = Depends(get_db)
):
    """Fetch high-level overview metrics for Web & Mobile dashboards."""
    # 1. Check settings & exchange connection state
    settings_res = await db.execute(select(AppSettings).order_by(AppSettings.id.desc()).limit(1))
    settings = settings_res.scalars().first()
    exchange_connected = bool(settings and settings.delta_api_key and settings.delta_api_secret)
    paper_balance = float(settings.paper_balance if settings and settings.paper_balance else 10000.0)

    live_total = 0.0
    live_avail = 0.0
    live_open_count = 0
    live_unrealized_pnl = 0.0

    # Normalize mode
    active_mode = mode.upper() if mode else None

    # If exchange is connected and not strictly PAPER mode, fetch real account balance and positions from Delta Exchange India
    if active_mode != "PAPER" and exchange_connected and engine.delta_client:
        try:
            delta_bal = await engine.delta_client.get_total_balance_usd()
            if delta_bal.get("total_balance", 0) > 0:
                live_total = float(delta_bal["total_balance"])
                live_avail = float(delta_bal["available_balance"])
        except Exception:
            pass

        try:
            live_positions = await engine.delta_client.get_positions()
            live_open_count = len(live_positions)
            for p in live_positions:
                live_unrealized_pnl += float(p.get("unrealized_pnl", 0) or 0)
        except Exception:
            pass

    if active_mode == "PAPER":
        total_balance = paper_balance
        available_balance = paper_balance
        applied_live_unrealized = 0.0
        applied_live_open = 0
    elif active_mode == "LIVE":
        total_balance = live_total
        available_balance = live_avail
        applied_live_unrealized = live_unrealized_pnl
        applied_live_open = live_open_count
    else:
        total_balance = live_total if (exchange_connected and live_total > 0) else paper_balance
        available_balance = live_avail if (exchange_connected and live_avail > 0) else paper_balance
        applied_live_unrealized = live_unrealized_pnl
        applied_live_open = live_open_count

    # 2. Trades stats from DB
    if active_mode in ["PAPER", "LIVE"]:
        closed_query = select(Trade).where(and_(Trade.status == "CLOSED", Trade.mode == active_mode))
    else:
        closed_query = select(Trade).where(Trade.status == "CLOSED")

    trades_res = await db.execute(closed_query)
    closed_trades = trades_res.scalars().all()

    total_trades = len(closed_trades)
    win_trades = len([t for t in closed_trades if t.pnl > 0])
    loss_trades = len([t for t in closed_trades if t.pnl < 0])
    win_rate = (win_trades / total_trades * 100.0) if total_trades > 0 else 0.0
    all_time_pnl = sum([t.pnl for t in closed_trades])

    # 3. Today's PnL (realized + live unrealized)
    today_start = datetime.combine(date.today(), datetime.min.time())
    if active_mode in ["PAPER", "LIVE"]:
        today_pnl_query = select(func.sum(Trade.pnl)).where(
            and_(Trade.status == "CLOSED", Trade.closed_at >= today_start, Trade.mode == active_mode)
        )
    else:
        today_pnl_query = select(func.sum(Trade.pnl)).where(
            and_(Trade.status == "CLOSED", Trade.closed_at >= today_start)
        )

    today_pnl_res = await db.execute(today_pnl_query)
    today_realized_pnl = today_pnl_res.scalar() or 0.0
    today_pnl = today_realized_pnl + applied_live_unrealized
    today_pnl_pct = (today_pnl / total_balance * 100.0) if total_balance > 0 else 0.0

    # 4. Open positions count
    if active_mode in ["PAPER", "LIVE"]:
        open_trades_query = select(func.count(Trade.id)).where(and_(Trade.status == "OPEN", Trade.mode == active_mode))
    else:
        open_trades_query = select(func.count(Trade.id)).where(Trade.status == "OPEN")

    open_trades_res = await db.execute(open_trades_query)
    db_open_count = open_trades_res.scalar() or 0
    total_open_count = db_open_count + applied_live_open

    # 5. Bots
    if active_mode in ["PAPER", "LIVE"]:
        bots_query = select(BotConfig).where(BotConfig.mode == active_mode)
    else:
        bots_query = select(BotConfig)

    all_bots_res = await db.execute(bots_query)
    all_bots = all_bots_res.scalars().all()
    active_bots_count = len([b for b in all_bots if b.is_active])

    return DashboardStatsResponse(
        total_balance=round(total_balance, 2),
        available_balance=round(available_balance, 2),
        today_pnl=round(today_pnl, 2),
        today_pnl_pct=round(today_pnl_pct, 2),
        all_time_pnl=round(all_time_pnl + applied_live_unrealized, 2),
        total_trades=total_trades,
        win_trades=win_trades,
        loss_trades=loss_trades,
        win_rate=round(win_rate, 1),
        active_bots=active_bots_count,
        total_bots=len(all_bots),
        open_positions_count=total_open_count,
        kill_switch=settings.kill_switch if settings else False,
        exchange_connected=exchange_connected,
        exchange_type=settings.exchange_type if settings else "india",
        mode=active_mode or "LIVE",
        live_balance=round(live_total, 2),
        paper_balance=round(paper_balance, 2)
    )

@router.get("/equity-curve", response_model=List[EquitySnapshotResponse])
async def get_equity_curve(
    days: int = 7,
    db: AsyncSession = Depends(get_db)
):
    """Fetch historical equity snapshots for the performance chart."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    query = select(EquitySnapshot).where(EquitySnapshot.timestamp >= cutoff).order_by(EquitySnapshot.timestamp.asc()).limit(200)
    res = await db.execute(query)
    snapshots = res.scalars().all()
    return snapshots
