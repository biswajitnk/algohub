from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import asyncio
import json

def _format_candle_time(ts) -> str:
    """Format Unix timestamp to clean UTC date string (YYYY-MM-DD or YYYY-MM-DD HH:MM)."""
    if not ts:
        return ""
    try:
        ts_sec = ts / 1_000_000 if ts > 1e14 else (ts / 1000 if ts > 1e11 else ts)
        dt = datetime.fromtimestamp(ts_sec, tz=timezone.utc)
        if dt.hour == 0 and dt.minute == 0:
            return dt.strftime("%Y-%m-%d")
        return dt.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return str(ts)

from app.database import get_db
from app.models import BotConfig, Trade
from app.schemas import BotConfigCreate, BotConfigUpdate, BotConfigResponse
from app.engine import engine
from app.strategies.supertrend import SupertrendStrategy
from app.strategies.ema_crossover import EMACrossoverStrategy
from app.strategies.rsi_scalper import RSIScalperStrategy
from app.strategies.rsi_ema_breakout import RSIEMABreakoutStrategy
from app.risk_manager import risk_manager
from app.categories import is_category_symbol, get_symbols_for_target, get_basket_label

router = APIRouter(prefix="/bots", tags=["Bots"])

@router.get("", response_model=List[BotConfigResponse])
async def list_bots(db: AsyncSession = Depends(get_db)):
    """List all configured trading bots."""
    res = await db.execute(select(BotConfig).order_by(BotConfig.id.desc()))
    return res.scalars().all()

@router.post("", response_model=BotConfigResponse)
async def create_bot(bot_in: BotConfigCreate, db: AsyncSession = Depends(get_db)):
    """Create a new algorithmic trading bot."""
    new_bot = BotConfig(**bot_in.dict())
    db.add(new_bot)
    await db.commit()
    await db.refresh(new_bot)
    return new_bot

@router.get("/{bot_id}", response_model=BotConfigResponse)
async def get_bot(bot_id: int, db: AsyncSession = Depends(get_db)):
    bot = await db.get(BotConfig, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot

@router.put("/{bot_id}", response_model=BotConfigResponse)
async def update_bot(bot_id: int, bot_in: BotConfigUpdate, db: AsyncSession = Depends(get_db)):
    bot = await db.get(BotConfig, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    for field, value in bot_in.dict(exclude_unset=True).items():
        setattr(bot, field, value)

    await db.commit()
    await db.refresh(bot)
    return bot

@router.delete("/{bot_id}")
async def delete_bot(bot_id: int, db: AsyncSession = Depends(get_db)):
    bot = await db.get(BotConfig, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    await db.delete(bot)
    await db.commit()
    return {"success": True, "message": f"Bot {bot_id} deleted."}

@router.post("/{bot_id}/toggle")
async def toggle_bot(bot_id: int, db: AsyncSession = Depends(get_db)):
    """Start or stop a trading bot."""
    bot = await db.get(BotConfig, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    bot.is_active = not bot.is_active
    await db.commit()
    await db.refresh(bot)
    state_str = "STARTED (Running 24/7)" if bot.is_active else "STOPPED (Paused)"
    return {"success": True, "bot_id": bot.id, "is_active": bot.is_active, "message": f"Bot {bot.name} is now {state_str}"}

def _simulate_candles(
    symbol: str,
    candles: List[Dict[str, Any]],
    strat_cls,
    allocation_usd: float,
    leverage: int,
    params_dict: Optional[Dict[str, Any]] = None,
    total_capital: Optional[float] = None,
    risk_pct: Optional[float] = None
):
    strat = strat_cls(params_dict)
    trades = []
    position = None
    total_pnl = 0.0
    target_rr = getattr(strat, 'target_rr_ratio', 2.0)

    for i in range(25, len(candles)):
        window = candles[:i+1]
        curr_price = float(candles[i]['close'])
        curr_low = float(candles[i]['low'])
        curr_high = float(candles[i]['high'])
        curr_time = candles[i]['time']

        trade_meta = {}
        if position:
            # Check 1:X Target hit -> Move to Breakeven
            if target_rr > 0 and position.get('stop_loss') and position['stop_loss'] < position['entry_price']:
                risk_r = position['entry_price'] - position['stop_loss']
                target_be = position['entry_price'] + (target_rr * risk_r)
                if curr_high >= target_be:
                    position['breakeven_active'] = True
                    position['stop_loss'] = position['entry_price']

            # Check Stop Loss hit
            if position.get('stop_loss') and curr_low <= position['stop_loss']:
                exit_price = position['stop_loss']
                trade_alloc = position.get('allocation_usd', allocation_usd)
                pnl, pnl_pct = risk_manager.calculate_pnl(position['side'], position['entry_price'], exit_price, trade_alloc, leverage)
                total_pnl += pnl
                trades.append({
                    "symbol": symbol,
                    "side": position['side'],
                    "entry_price": position['entry_price'],
                    "exit_price": exit_price,
                    "pnl": round(pnl, 2),
                    "pnl_pct": round(pnl_pct, 2),
                    "allocation_usd": round(trade_alloc, 2),
                    "notional_usd": round(trade_alloc * leverage, 2),
                    "entry_time": position['entry_time'],
                    "entry_date": _format_candle_time(position['entry_time']),
                    "exit_time": curr_time,
                    "exit_date": _format_candle_time(curr_time),
                    "reason": "BREAKEVEN_SL" if position.get('breakeven_active') else "STOP_LOSS"
                })
                position = None
                continue

            trade_meta = {
                "entry_price": position['entry_price'],
                "stop_loss": position.get('stop_loss', curr_price * 0.98),
                "breakeven_active": position.get('breakeven_active', False)
            }

        try:
            signal = strat.generate_signal(window, current_position=position['side'] if position else None, trade_metadata=trade_meta)
        except TypeError:
            signal = strat.generate_signal(window, current_position=position['side'] if position else None)

        action = signal.get("action")

        if action == "BREAKEVEN" and position:
            position['breakeven_active'] = True
            position['stop_loss'] = position['entry_price']

        elif action == "CLOSE" and position:
            trade_alloc = position.get('allocation_usd', allocation_usd)
            pnl, pnl_pct = risk_manager.calculate_pnl(position['side'], position['entry_price'], curr_price, trade_alloc, leverage)
            total_pnl += pnl
            trades.append({
                "symbol": symbol,
                "side": position['side'],
                "entry_price": position['entry_price'],
                "exit_price": curr_price,
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct, 2),
                "allocation_usd": round(trade_alloc, 2),
                "notional_usd": round(trade_alloc * leverage, 2),
                "entry_time": position['entry_time'],
                "entry_date": _format_candle_time(position['entry_time']),
                "exit_time": curr_time,
                "exit_date": _format_candle_time(curr_time),
                "reason": signal.get("reason", "STRATEGY_EXIT")
            })
            position = None

        elif action in ["BUY", "SELL"]:
            if position and position['side'] != action.lower():
                # Close opposite
                trade_alloc = position.get('allocation_usd', allocation_usd)
                pnl, pnl_pct = risk_manager.calculate_pnl(position['side'], position['entry_price'], curr_price, trade_alloc, leverage)
                total_pnl += pnl
                trades.append({
                    "symbol": symbol,
                    "side": position['side'],
                    "entry_price": position['entry_price'],
                    "exit_price": curr_price,
                    "pnl": round(pnl, 2),
                    "pnl_pct": round(pnl_pct, 2),
                    "allocation_usd": round(trade_alloc, 2),
                    "notional_usd": round(trade_alloc * leverage, 2),
                    "entry_time": position['entry_time'],
                    "entry_date": _format_candle_time(position['entry_time']),
                    "exit_time": curr_time,
                    "exit_date": _format_candle_time(curr_time),
                    "reason": "SIGNAL_REVERSAL"
                })
                position = None

            if not position:
                sl = signal.get("suggested_sl", curr_low if action == "BUY" else curr_high)
                
                # Dynamic risk sizing
                if total_capital and risk_pct and total_capital > 0 and risk_pct > 0:
                    max_risk_usd = max(1.0, total_capital * (risk_pct / 100.0))
                    if sl and sl != curr_price:
                        sl_dist = abs(curr_price - sl)
                        sl_dist_pct = max(0.005, sl_dist / curr_price)
                    else:
                        sl_dist_pct = 0.02
                    notional_usd = max_risk_usd / sl_dist_pct
                    trade_alloc = round(notional_usd / leverage, 2)
                else:
                    trade_alloc = allocation_usd
                    max_risk_usd = trade_alloc * 0.10

                position = {
                    "side": action.lower(),
                    "entry_price": curr_price,
                    "entry_time": curr_time,
                    "stop_loss": sl,
                    "breakeven_active": False,
                    "allocation_usd": trade_alloc,
                    "max_risk_usd": round(max_risk_usd, 2)
                }

    # Close any open trade at last candle
    if position:
        last_price = float(candles[-1]['close'])
        trade_alloc = position.get('allocation_usd', allocation_usd)
        pnl, pnl_pct = risk_manager.calculate_pnl(position['side'], position['entry_price'], last_price, trade_alloc, leverage)
        total_pnl += pnl
        trades.append({
            "symbol": symbol,
            "side": position['side'],
            "entry_price": position['entry_price'],
            "exit_price": last_price,
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "allocation_usd": round(trade_alloc, 2),
            "notional_usd": round(trade_alloc * leverage, 2),
            "entry_time": position['entry_time'],
            "entry_date": _format_candle_time(position['entry_time']),
            "exit_time": candles[-1]['time'],
            "exit_date": _format_candle_time(candles[-1]['time']),
            "reason": "OPEN_AT_END"
        })

    return trades, total_pnl


@router.post("/backtest")
async def run_backtest(payload: Dict[str, Any]):
    """
    Run backtest simulation on historical candles from Delta Exchange.
    Supports both Single Tokens (e.g. NVDAXUSD) and Whole Category Baskets (e.g. CATEGORY_SEMIS_AI, CATEGORY_MEGACAP, CATEGORY_ALL).
    Supports Dynamic Risk % of Total Capital as well as Fixed Margin Allocation.
    """
    symbol = payload.get("symbol", "NVDAXUSD").upper()
    strat_name = payload.get("strategy_name", "RSI_EMA_Breakout")
    timeframe = payload.get("timeframe", "1d")
    candles_count = int(payload.get("candles_count", 200))
    leverage = int(payload.get("leverage", 5))
    total_capital = float(payload.get("total_capital", 10000.0))
    risk_pct = float(payload.get("risk_pct", 2.0))
    allocation_usd = float(payload.get("allocation_usd", 100.0))
    sizing_mode = payload.get("sizing_mode", "risk_pct") # "risk_pct" or "fixed"

    cap_arg = total_capital if sizing_mode == "risk_pct" else None
    risk_arg = risk_pct if sizing_mode == "risk_pct" else None

    params_dict = payload.get("params", {})
    if isinstance(params_dict, str):
        try:
            params_dict = json.loads(params_dict)
        except Exception:
            params_dict = {}

    strategy_registry = {
        "Supertrend": SupertrendStrategy,
        "EMA_Crossover": EMACrossoverStrategy,
        "RSI_Scalper": RSIScalperStrategy,
        "RSI_EMA_Breakout": RSIEMABreakoutStrategy
    }
    strat_cls = strategy_registry.get(strat_name, RSIEMABreakoutStrategy)

    if is_category_symbol(symbol):
        target_symbols = get_symbols_for_target(symbol)
        basket_label = get_basket_label(symbol)

        async def _run_single_stock(sym: str):
            try:
                candles = await engine.delta_client.get_candles(symbol=sym, resolution=timeframe, count=candles_count)
                if not candles or len(candles) < 25:
                    return None
                trades, pnl = _simulate_candles(sym, candles, strat_cls, allocation_usd, leverage, params_dict, cap_arg, risk_arg)
                win_count = len([t for t in trades if t['pnl'] > 0])
                loss_count = len([t for t in trades if t['pnl'] <= 0])
                win_rate = (win_count / len(trades) * 100.0) if trades else 0.0
                return {
                    "symbol": sym,
                    "candles_count": len(candles),
                    "total_trades": len(trades),
                    "winning_trades": win_count,
                    "losing_trades": loss_count,
                    "win_rate_pct": round(win_rate, 2),
                    "pnl_usd": round(pnl, 2),
                    "trades": trades
                }
            except Exception:
                return None

        # Fetch and simulate all basket stocks concurrently
        results = await asyncio.gather(*[_run_single_stock(s) for s in target_symbols])
        valid_results = [r for r in results if r is not None]

        if not valid_results:
            raise HTTPException(status_code=400, detail="Could not fetch sufficient candle data for basket stocks.")

        all_trades = []
        stock_breakdown = []
        total_pnl = 0.0
        total_candles = 0

        for r in valid_results:
            all_trades.extend(r["trades"])
            total_pnl += r["pnl_usd"]
            total_candles += r["candles_count"]
            stock_breakdown.append({
                "symbol": r["symbol"],
                "candles_count": r["candles_count"],
                "total_trades": r["total_trades"],
                "winning_trades": r["winning_trades"],
                "losing_trades": r["losing_trades"],
                "win_rate_pct": r["win_rate_pct"],
                "pnl_usd": r["pnl_usd"]
            })

        stock_breakdown.sort(key=lambda x: x["pnl_usd"], reverse=True)
        all_trades.sort(key=lambda x: x.get("entry_time", 0))

        tot_wins = len([t for t in all_trades if t['pnl'] > 0])
        tot_losses = len([t for t in all_trades if t['pnl'] <= 0])
        overall_win_rate = (tot_wins / len(all_trades) * 100.0) if all_trades else 0.0

        return {
            "symbol": symbol,
            "is_basket": True,
            "basket_name": basket_label,
            "stocks_count": len(target_symbols),
            "analyzed_stocks_count": len(valid_results),
            "strategy": strat_name,
            "timeframe": timeframe,
            "candles_analyzed": total_candles,
            "total_trades": len(all_trades),
            "winning_trades": tot_wins,
            "losing_trades": tot_losses,
            "win_rate_pct": round(overall_win_rate, 2),
            "total_pnl_usd": round(total_pnl, 2),
            "total_capital": total_capital,
            "risk_pct": risk_pct,
            "sizing_mode": sizing_mode,
            "ending_balance_usd": round(total_capital + total_pnl, 2),
            "return_on_capital_pct": round((total_pnl / total_capital) * 100.0, 2) if total_capital > 0 else 0.0,
            "stock_breakdown": stock_breakdown,
            "trades": all_trades[:200]
        }
    else:
        # Single stock simulation
        try:
            candles = await engine.delta_client.get_candles(symbol=symbol, resolution=timeframe, count=candles_count)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch market candles: {e}")

        if len(candles) < 25:
            raise HTTPException(status_code=400, detail="Insufficient historical candles from exchange")

        trades, total_pnl = _simulate_candles(symbol, candles, strat_cls, allocation_usd, leverage, params_dict, cap_arg, risk_arg)
        win_count = len([t for t in trades if t['pnl'] > 0])
        loss_count = len([t for t in trades if t['pnl'] <= 0])
        win_rate = (win_count / len(trades) * 100.0) if trades else 0.0

        return {
            "symbol": symbol,
            "is_basket": False,
            "strategy": strat_name,
            "timeframe": timeframe,
            "candles_analyzed": len(candles),
            "total_trades": len(trades),
            "winning_trades": win_count,
            "losing_trades": loss_count,
            "win_rate_pct": round(win_rate, 2),
            "total_pnl_usd": round(total_pnl, 2),
            "total_capital": total_capital,
            "risk_pct": risk_pct,
            "sizing_mode": sizing_mode,
            "ending_balance_usd": round(total_capital + total_pnl, 2),
            "return_on_capital_pct": round((total_pnl / total_capital) * 100.0, 2) if total_capital > 0 else 0.0,
            "trades": trades
        }
