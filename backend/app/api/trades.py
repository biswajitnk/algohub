from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional

from app.database import get_db
from app.models import Trade, BotConfig
from app.schemas import TradeResponse, TradeCloseRequest
from app.engine import engine

router = APIRouter(prefix="/trades", tags=["Trades"])

@router.get("", response_model=List[TradeResponse])
async def list_trades(
    status: Optional[str] = Query(None, description="Filter by OPEN or CLOSED"),
    mode: Optional[str] = Query(None, description="Filter by PAPER or LIVE"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """Fetch trade history with optional filtering."""
    query = select(Trade).order_by(Trade.created_at.desc())
    if status:
        query = query.where(Trade.status == status.upper())
    if mode:
        query = query.where(Trade.mode == mode.upper())
    query = query.limit(limit)

    res = await db.execute(query)
    return res.scalars().all()

import asyncio
from datetime import datetime
from app.risk_manager import risk_manager

@router.get("/open", response_model=List[TradeResponse])
async def get_open_trades(
    mode: Optional[str] = Query(None, description="Filter by PAPER or LIVE"),
    db: AsyncSession = Depends(get_db)
):
    """Fetch currently active open trades (both paper bot trades and live Delta positions) with real-time mark price and PnL."""
    # 1. Fetch configured bots to map symbols to running algorithms
    bots_res = await db.execute(select(BotConfig))
    bots_map = {b.symbol.upper(): b for b in bots_res.scalars().all()}

    active_mode = mode.upper() if mode else None

    # 2. Fetch paper / local DB trades
    if active_mode in ["PAPER", "LIVE"]:
        query = select(Trade).where(and_(Trade.status == "OPEN", Trade.mode == active_mode)).order_by(Trade.created_at.desc())
    else:
        query = select(Trade).where(Trade.status == "OPEN").order_by(Trade.created_at.desc())

    res = await db.execute(query)
    db_trades = list(res.scalars().all())

    # Helper function to enrich DB trades with live Delta tickers and dynamic Unrealized PnL
    async def _enrich_trade(t: Trade) -> TradeResponse:
        current_price = t.entry_price
        pnl = 0.0
        pnl_pct = 0.0
        if engine.delta_client:
            try:
                ticker = await engine.delta_client.get_ticker(t.symbol)
                if ticker:
                    raw_price = ticker.get("mark_price") or ticker.get("close")
                    if raw_price:
                        current_price = float(raw_price)
                        pnl, pnl_pct = risk_manager.calculate_pnl(
                            side=t.side,
                            entry_price=t.entry_price,
                            current_price=current_price,
                            size_usd=t.size,
                            leverage=t.leverage
                        )
            except Exception:
                pass

        return TradeResponse(
            id=t.id,
            bot_id=t.bot_id,
            strategy_name=t.strategy_name,
            symbol=t.symbol,
            side=t.side,
            mode=t.mode,
            entry_price=t.entry_price,
            current_price=round(current_price, 2),
            exit_price=None,
            size=t.size,
            contracts=t.contracts,
            leverage=t.leverage,
            stop_loss=t.stop_loss,
            take_profit=t.take_profit,
            pnl=pnl,
            pnl_pct=pnl_pct,
            status=t.status,
            exit_reason=t.exit_reason,
            delta_order_id=t.delta_order_id,
            delta_exit_order_id=t.delta_exit_order_id,
            created_at=t.created_at,
            closed_at=t.closed_at
        )

    all_open = await asyncio.gather(*[_enrich_trade(t) for t in db_trades])
    all_open = list(all_open)

    # 3. Fetch live open positions from Delta Exchange India (only if not strictly PAPER mode)
    if active_mode != "PAPER" and engine.delta_client and engine.delta_client.api_key:
        try:
            live_pos = await engine.delta_client.get_positions()
            for p in live_pos:
                product_id = int(p.get("product_id", 0))
                # Check if this position is already tracked in DB
                already_in_db = any(t.delta_order_id == str(product_id) or t.id == product_id for t in all_open)
                if not already_in_db:
                    size_contracts = abs(int(float(p.get("size", 1))))
                    margin = float(p.get("margin", 1) or 1)
                    lev = int(float(p.get("product", {}).get("default_leverage", 10) or 10))
                    unrealized_pnl = float(p.get("unrealized_pnl", 0) or 0)
                    pnl_pct = round((unrealized_pnl / max(margin, 0.01)) * 100, 2)
                    sym = p.get("product_symbol") or p.get("product", {}).get("symbol", "UNKNOWN")
                    mark_p = float(p.get("mark_price") or p.get("entry_price") or 0)

                    # Check which algo is assigned to this symbol
                    bot = bots_map.get(sym.upper())
                    if bot and bot.is_active:
                        algo_label = f"{bot.strategy_name} ({bot.timeframe})"
                        matched_bot_id = bot.id
                    elif bot:
                        algo_label = f"{bot.strategy_name} [Paused]"
                        matched_bot_id = bot.id
                    else:
                        algo_label = "Delta Live (Manual)"
                        matched_bot_id = None

                    all_open.append(TradeResponse(
                        id=product_id,
                        bot_id=matched_bot_id,
                        strategy_name=algo_label,
                        symbol=sym,
                        side="buy" if float(p.get("size", 0)) > 0 else "sell",
                        mode="LIVE",
                        entry_price=float(p.get("entry_price", 0) or 0),
                        current_price=round(mark_p, 2) if mark_p > 0 else None,
                        exit_price=None,
                        size=round(margin * lev, 2),
                        contracts=size_contracts,
                        leverage=lev,
                        stop_loss=float(p.get("liquidation_price", 0)) if p.get("liquidation_price") else None,
                        take_profit=None,
                        pnl=round(unrealized_pnl, 2),
                        pnl_pct=pnl_pct,
                        status="OPEN",
                        exit_reason=None,
                        delta_order_id=str(product_id),
                        delta_exit_order_id=None,
                        created_at=datetime.utcnow(),
                        closed_at=None
                    ))
        except Exception:
            pass

    return all_open

@router.post("/close")
async def close_trade_manually(payload: TradeCloseRequest, db: AsyncSession = Depends(get_db)):
    """Manually close an open position from the Web or Mobile app."""
    trade = await db.get(Trade, payload.trade_id)

    if trade:
        if trade.status != "OPEN":
            raise HTTPException(status_code=400, detail="Trade is already closed")

        # Fetch current price from exchange
        try:
            ticker = await engine.delta_client.get_ticker(trade.symbol)
            exit_price = float(ticker.get("close", trade.entry_price))
        except Exception:
            exit_price = trade.entry_price

        await engine._close_trade(
            trade=trade,
            exit_price=exit_price,
            reason=payload.reason or "MANUAL_USER_CLOSE",
            session=db
        )

        return {
            "success": True,
            "trade_id": trade.id,
            "symbol": trade.symbol,
            "exit_price": exit_price,
            "pnl": trade.pnl,
            "pnl_pct": trade.pnl_pct
        }
    else:
        # Check if it's a live Delta position closed by product_id
        if engine.delta_client and engine.delta_client.api_key:
            try:
                live_pos = await engine.delta_client.get_positions()
                matching = [p for p in live_pos if int(p.get("product_id", 0)) == payload.trade_id]
                if matching:
                    pos = matching[0]
                    side = "buy" if float(pos.get("size", 0)) > 0 else "sell"
                    size = abs(int(float(pos.get("size", 1))))
                    res = await engine.delta_client.close_position(
                        product_id=payload.trade_id,
                        size=size,
                        current_side=side
                    )
                    return {
                        "success": True,
                        "trade_id": payload.trade_id,
                        "symbol": pos.get("product_symbol", ""),
                        "message": "Market close order executed directly on Delta Exchange."
                    }
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to close position on Delta: {e}")

        raise HTTPException(status_code=404, detail="Trade or position not found")
