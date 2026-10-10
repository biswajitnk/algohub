import asyncio
import json
import logging
import time
from datetime import datetime, date
from typing import Dict, Any, Optional, List
import pandas as pd
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import BotConfig, Trade, EquitySnapshot, AlertLog, AppSettings
from app.delta_client import DeltaExchangeClient
from app.risk_manager import risk_manager
from app.notifications import notifier
from app.strategies.supertrend import SupertrendStrategy
from app.strategies.ema_crossover import EMACrossoverStrategy
from app.strategies.rsi_scalper import RSIScalperStrategy
from app.strategies.rsi_ema_breakout import RSIEMABreakoutStrategy
from app.categories import get_symbols_for_target, is_category_symbol

logger = logging.getLogger(__name__)

class AlgoEngine:
    """
    24/7 Automated Algorithmic Trading Engine.
    Executes strategies, monitors live prices against SL/TP, manages positions,
    routes to Delta Exchange India API or Paper simulator, and broadcasts alerts.
    """

    def __init__(self):
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self.delta_client: DeltaExchangeClient = DeltaExchangeClient(exchange_type="india")
        self.strategy_registry = {
            "Supertrend": SupertrendStrategy,
            "EMA_Crossover": EMACrossoverStrategy,
            "RSI_Scalper": RSIScalperStrategy,
            "RSI_EMA_Breakout": RSIEMABreakoutStrategy
        }
        self.poll_interval_seconds = 10  # Main tick loop frequency
        self._spy_trend_cache: Dict[str, Any] = {}

    async def initialize(self):
        """Load API keys and settings from DB on startup."""
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(AppSettings).order_by(AppSettings.id.desc()).limit(1))
            settings_record = result.scalars().first()

            if not settings_record:
                # Create initial default settings
                settings_record = AppSettings(
                    exchange_type="india",
                    max_daily_loss=100.0,
                    max_leverage=10,
                    kill_switch=False,
                    paper_balance=10000.0
                )
                session.add(settings_record)
                await session.commit()
                await session.refresh(settings_record)

            self.delta_client = DeltaExchangeClient(
                api_key=settings_record.delta_api_key,
                api_secret=settings_record.delta_api_secret,
                exchange_type=settings_record.exchange_type or "india"
            )

            notifier.update_credentials(
                bot_token=settings_record.telegram_bot_token,
                chat_id=settings_record.telegram_chat_id
            )

            risk_manager.update_limits(
                max_daily_loss=settings_record.max_daily_loss,
                max_leverage=settings_record.max_leverage,
                kill_switch=settings_record.kill_switch
            )

        logger.info("AlgoEngine initialized successfully.")

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._main_loop())
            logger.info("AlgoEngine background loop started.")

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self.delta_client:
            try:
                await self.delta_client.close()
            except Exception:
                pass
        logger.info("AlgoEngine background loop stopped.")

    async def _main_loop(self):
        """Continuous 24/7 loop checking active bots and open positions."""
        logger.info("24/7 Algo trading loop running...")
        while self.is_running:
            try:
                await self._process_active_bots()
                await self._take_equity_snapshot()
            except Exception as e:
                logger.error(f"Error in AlgoEngine main loop: {e}", exc_info=True)
                await notifier.broadcast_ws("ENGINE_ERROR", {"error": str(e)})

            await asyncio.sleep(self.poll_interval_seconds)

    async def _get_today_realized_pnl(self, session: AsyncSession) -> float:
        """Calculate today's realized PnL to enforce circuit breakers."""
        today_start = datetime.combine(date.today(), datetime.min.time())
        query = select(func.sum(Trade.pnl)).where(
            and_(Trade.status == "CLOSED", Trade.closed_at >= today_start)
        )
        result = await session.execute(query)
        total_pnl = result.scalar() or 0.0
        return float(total_pnl)

    async def _process_active_bots(self):
        async with AsyncSessionLocal() as session:
            # Check circuit breaker
            today_pnl = await self._get_today_realized_pnl(session)

            # Query all active bots
            result = await session.execute(select(BotConfig).where(BotConfig.is_active == True))
            active_bots = result.scalars().all()

            if not active_bots:
                return

            for bot in active_bots:
                try:
                    await self._evaluate_bot(bot, session, today_pnl)
                except Exception as bot_err:
                    logger.error(f"Error processing bot {bot.name} (id {bot.id}): {bot_err}")

    async def _get_account_balance(self, mode: str, session: AsyncSession) -> float:
        """Fetch current account balance (live Delta balance or paper trading balance)."""
        if mode == "LIVE" and self.delta_client:
            try:
                delta_bal = await self.delta_client.get_total_balance_usd()
                bal = float(delta_bal.get("available_balance", 0.0) or delta_bal.get("total_balance", 0.0) or 0.0)
                return max(0.0, bal)
            except Exception as e:
                logger.warning(f"Failed to fetch live balance for sizing: {e}")
                return 0.0

        try:
            settings_res = await session.execute(select(AppSettings).order_by(AppSettings.id.desc()).limit(1))
            settings_rec = settings_res.scalars().first()
            if settings_rec and settings_rec.paper_balance:
                return float(settings_rec.paper_balance)
        except Exception:
            pass
        return 10000.0 if mode == "PAPER" else 0.0

    async def _evaluate_bot(self, bot: BotConfig, session: AsyncSession, today_pnl: float):
        # Calculate dynamic allocation from allocation_pct (% of account)
        account_bal = await self._get_account_balance(bot.mode, session)
        alloc_pct = bot.allocation_pct if (bot.allocation_pct is not None and bot.allocation_pct > 0) else 10.0
        effective_allocation_usd = max(10.0, round(account_bal * (alloc_pct / 100.0), 2))

        # Check if targeting a whole category basket or individual token
        target_symbols = get_symbols_for_target(bot.symbol)

        for sym in target_symbols:
            try:
                await self._evaluate_symbol_for_bot(bot, sym, effective_allocation_usd, session, today_pnl)
            except Exception as e:
                logger.error(f"Error evaluating symbol {sym} for bot {bot.name}: {e}")

    async def get_spy_trend(self, resolution: str = "1d") -> Dict[str, Any]:
        """
        Fetch SPYXUSD candles and evaluate 20 EMA trend.
        Caches for 60 seconds to avoid duplicate exchange calls across basket scans.
        """
        now = time.time()
        cached = self._spy_trend_cache.get(resolution)
        if cached and (now - cached.get("timestamp", 0) < 60):
            return cached

        try:
            spy_candles = await self.delta_client.get_candles(symbol="SPYXUSD", resolution=resolution, count=50)
            if spy_candles and len(spy_candles) >= 20:
                df = pd.DataFrame(spy_candles)
                df['close'] = pd.to_numeric(df['close'])
                df['ema20'] = df['close'].ewm(span=20, adjust=False).mean()
                last_row = df.iloc[-1]
                curr_price = float(last_row['close'])
                ema20 = float(last_row['ema20'])
                is_bullish = curr_price > ema20

                res = {
                    "timestamp": now,
                    "is_bullish": is_bullish,
                    "price": round(curr_price, 2),
                    "ema20": round(ema20, 2),
                    "status": "OK"
                }
                self._spy_trend_cache[resolution] = res
                return res
        except Exception as e:
            logger.warning(f"Failed to fetch SPYXUSD trend candles: {e}")

        # Fallback if SPY data temporarily unavailable
        return {"timestamp": now, "is_bullish": True, "price": 0.0, "ema20": 0.0, "status": "ERROR"}

    async def _evaluate_symbol_for_bot(
        self,
        bot: BotConfig,
        symbol: str,
        effective_allocation_usd: float,
        session: AsyncSession,
        today_pnl: float
    ):
        symbol = symbol.upper()

        # 1. Fetch candles from Delta Exchange
        try:
            candles = await self.delta_client.get_candles(symbol=symbol, resolution=bot.timeframe, count=60)
        except Exception as e:
            logger.warning(f"Failed to fetch candles for {symbol}: {e}")
            return

        if not candles or len(candles) < 20:
            return

        current_price = float(candles[-1]['close'])

        # 2. Check for currently open trade for this bot and this specific symbol
        trade_query = select(Trade).where(
            and_(Trade.bot_id == bot.id, Trade.symbol == symbol, Trade.status == "OPEN")
        ).order_by(Trade.id.desc())
        trade_res = await session.execute(trade_query)
        open_trade = trade_res.scalars().first()

        current_position_side = open_trade.side if open_trade else None

        # 3. Monitor SL / TP on open position
        if open_trade:
            # Check Risk:Reward Breakeven condition for BUY trade
            if open_trade.side == "buy" and open_trade.stop_loss and open_trade.entry_price:
                initial_risk = open_trade.entry_price - open_trade.stop_loss
                if initial_risk > 0:
                    rr_ratio = 2.0
                    if bot.params:
                        try:
                            p_dict = json.loads(bot.params)
                            raw_target = p_dict.get("target_rr_ratio", 2.0)
                            if isinstance(raw_target, str) and "_and_" in raw_target:
                                rr_ratio = float(raw_target.split("_and_")[0])
                            elif isinstance(raw_target, str) and not raw_target.replace('.', '', 1).isdigit():
                                rr_ratio = 0.0
                            else:
                                rr_ratio = float(raw_target)
                        except Exception:
                            rr_ratio = 2.0

                    if rr_ratio > 0:
                        target_rr = open_trade.entry_price + (rr_ratio * initial_risk)
                        if current_price >= target_rr and open_trade.stop_loss < open_trade.entry_price:
                            open_trade.stop_loss = open_trade.entry_price
                            await session.commit()

                            # If LIVE, cancel old exchange stop loss order to avoid triggering at a loss
                            if open_trade.mode == "LIVE" and self.delta_client:
                                try:
                                    prod = await self.delta_client.get_product_by_symbol(symbol)
                                    if prod:
                                        await self.delta_client.cancel_all_orders(product_id=prod["id"])
                                except Exception as be_err:
                                    logger.warning(f"Could not cancel old SL on Delta during Breakeven move: {be_err}")

                            logger.info(f"Bot {bot.name} ({symbol}): 🎯 1:{rr_ratio:g} R:R Breakeven hit at ${current_price:.2f}! SL moved to entry price ${open_trade.entry_price:.2f}.")
                            await notifier.notify_trade(
                                f"Breakeven Hit (1:{rr_ratio:g} R:R) — {open_trade.symbol}",
                                f"Price reached 1:{rr_ratio:g} target (${current_price:.2f}). Stop Loss moved to Entry (${open_trade.entry_price:.2f})."
                            )

            should_close = False
            close_reason = ""

            if open_trade.side == "buy":
                if open_trade.stop_loss and current_price <= open_trade.stop_loss:
                    should_close = True
                    close_reason = "BREAKEVEN_SL" if (open_trade.stop_loss >= open_trade.entry_price) else "STOP_LOSS"
                elif open_trade.take_profit and current_price >= open_trade.take_profit:
                    should_close = True
                    close_reason = "TAKE_PROFIT"
            elif open_trade.side == "sell":
                if open_trade.stop_loss and current_price >= open_trade.stop_loss:
                    should_close = True
                    close_reason = "STOP_LOSS"
                elif open_trade.take_profit and current_price <= open_trade.take_profit:
                    should_close = True
                    close_reason = "TAKE_PROFIT"

            if should_close:
                await self._close_trade(open_trade, current_price, close_reason, session)
                return

        # 4. Generate Signal using Strategy
        strat_cls = self.strategy_registry.get(bot.strategy_name, RSIEMABreakoutStrategy)
        params = {}
        if bot.params:
            try:
                params = json.loads(bot.params)
            except Exception:
                pass
        if bot.timeframe:
            params["timeframe"] = bot.timeframe

        strategy_instance = strat_cls(params)
        
        trade_meta = {}
        if open_trade:
            trade_meta = {
                "entry_price": open_trade.entry_price,
                "stop_loss": open_trade.stop_loss,
                "breakeven_active": bool(open_trade.stop_loss and open_trade.stop_loss >= open_trade.entry_price)
            }

        try:
            signal = strategy_instance.generate_signal(candles, current_position=current_position_side, trade_metadata=trade_meta)
        except TypeError:
            signal = strategy_instance.generate_signal(candles, current_position=current_position_side)

        action = signal.get("action", "HOLD")

        # Broadcast signal telemetry for live logs
        tick_indicators = dict(signal.get("indicators", {}))
        bot_use_spy_filter = False
        if bot.params:
            try:
                p_dict = json.loads(bot.params)
                bot_use_spy_filter = bool(p_dict.get("use_spy_filter", False))
                tick_indicators["use_spy_filter"] = bot_use_spy_filter
            except Exception:
                pass

        await notifier.broadcast_ws("BOT_TICK", {
            "bot_id": bot.id,
            "bot_name": bot.name,
            "symbol": symbol,
            "price": current_price,
            "action": action,
            "reason": signal.get("reason", ""),
            "indicators": tick_indicators
        })

        # 5. Handle Signal Action
        if action == "BREAKEVEN" and open_trade and open_trade.stop_loss < open_trade.entry_price:
            open_trade.stop_loss = open_trade.entry_price
            await session.commit()
            logger.info(f"Bot {bot.name} ({symbol}): Breakeven confirmed by strategy at ${current_price:.2f}.")

        elif action in ["BUY", "SELL"]:
            # If current trade is in opposite direction, close it first
            if open_trade and open_trade.side != action.lower():
                await self._close_trade(open_trade, current_price, "SIGNAL_REVERSAL", session)
                open_trade = None

            if not open_trade:
                # SPYXUSD Macro 20 EMA Trend Filter Check for BUY orders
                if action == "BUY" and symbol != "SPYXUSD" and bot_use_spy_filter:
                    spy_trend = await self.get_spy_trend(resolution=bot.timeframe)
                    if not spy_trend.get("is_bullish", True):
                        spy_p = spy_trend.get("price", 0.0)
                        spy_ema = spy_trend.get("ema20", 0.0)
                        logger.info(
                            f"Bot {bot.name} ({symbol}): 🛡️ SPYXUSD Macro 20 EMA Filter BLOCKED BUY trade! "
                            f"S&P 500 (${spy_p:.2f}) is below 20 EMA (${spy_ema:.2f})."
                        )
                        await notifier.broadcast_ws("BOT_TICK", {
                            "bot_id": bot.id,
                            "bot_name": bot.name,
                            "symbol": symbol,
                            "price": current_price,
                            "action": "HOLD",
                            "reason": f"🛡️ Blocked by SPYXUSD Macro Filter: SPY (${spy_p:.2f}) <= 20 EMA (${spy_ema:.2f})",
                            "indicators": {
                                **tick_indicators,
                                "spy_filter_blocked": True,
                                "spy_price": spy_p,
                                "spy_ema20": spy_ema
                            }
                        })
                        return

                # 1. Calculate SL & TP levels (favor suggested_sl from strategy like entry candle low)
                suggested_sl = signal.get("suggested_sl")
                sl_price, tp_price = risk_manager.calculate_sl_tp(
                    side=action.lower(),
                    entry_price=current_price,
                    sl_pct=bot.stop_loss_pct,
                    tp_pct=bot.take_profit_pct
                )
                if suggested_sl is not None and action == "BUY":
                    sl_price = float(suggested_sl)
                    # Take profit is optional: if user specified take_profit_pct, use it; otherwise None (trend runner)
                    if bot.take_profit_pct and bot.take_profit_pct > 0:
                        tp_price = round(current_price * (1.0 + (bot.take_profit_pct / 100.0)), 2)
                    else:
                        tp_price = None

                # 2. Risk-Based Position Sizing:
                # User specifies risk_pct (e.g. 2% of total account balance risked on SL hit)
                account_bal = await self._get_account_balance(bot.mode, session)
                if account_bal <= 0:
                    logger.warning(f"Bot {bot.name} ({symbol}): Account balance (${account_bal:.2f}) is 0 or unavailable. Trade skipped.")
                    return

                risk_pct = bot.risk_pct if (bot.risk_pct is not None and bot.risk_pct > 0) else 2.0
                max_risk_usd = max(1.0, account_bal * (risk_pct / 100.0))

                # Distance to stop loss
                sl_distance = abs(current_price - sl_price) if (sl_price and sl_price != current_price) else (current_price * 0.02)
                sl_distance_pct = max(0.005, sl_distance / current_price)

                # Shares = Max Risk USD / Stop Loss Distance in USD
                shares = max_risk_usd / sl_distance

                # Resolve Delta contract value (e.g. 0.01 for AMZNXUSD means 1 contract = 0.01 share)
                prod = await self.delta_client.get_product_by_symbol(symbol) if self.delta_client else None
                contract_val = float(prod.get("contract_value", 1.0)) if prod and prod.get("contract_value") else 1.0

                # Contracts = Shares / Contract Value
                contracts = max(1, int(shares / contract_val))

                # Cap contracts by available account purchasing power with leverage (safety guard: 90% of balance)
                max_contracts = int((account_bal * bot.leverage * 0.90) / (contract_val * current_price))
                if max_contracts < 1:
                    logger.warning(
                        f"Bot {bot.name} ({symbol}): Insufficient balance (${account_bal:.2f}) for 1 contract margin "
                        f"(${(contract_val * current_price / bot.leverage):.2f} required). Trade skipped."
                    )
                    return

                contracts = min(contracts, max_contracts)
                notional_size_usd = round(contracts * contract_val * current_price, 2)

                # Validate with risk manager
                is_allowed, risk_reason = risk_manager.validate_order(
                    side=action.lower(),
                    price=current_price,
                    allocation_usd=notional_size_usd / bot.leverage,
                    leverage=bot.leverage,
                    today_realized_pnl=today_pnl
                )

                if not is_allowed:
                    logger.warning(f"Trade rejected by RiskManager ({bot.name} - {symbol}): {risk_reason}")
                    await notifier.notify_alert(f"Risk Circuit Breaker ({bot.name} - {symbol})", risk_reason, level="WARNING")
                    return

                logger.info(
                    f"Bot {bot.name} ({symbol}): Risk-based sizing: Balance=${account_bal:.2f}, "
                    f"Risk {risk_pct}%=${max_risk_usd:.2f}, SL=${sl_price:.2f} ({sl_distance_pct*100:.2f}%), "
                    f"Contracts={contracts}, Notional Size=${notional_size_usd:.2f}"
                )

                await self._open_trade(
                    bot=bot,
                    side=action.lower(),
                    entry_price=current_price,
                    sl_price=sl_price,
                    tp_price=tp_price,
                    session=session,
                    symbol=symbol,
                    allocation_usd=round(notional_size_usd / bot.leverage, 2),
                    contracts_override=contracts
                )

        elif action == "CLOSE" and open_trade:
            await self._close_trade(open_trade, current_price, signal.get("reason", "STRATEGY_EXIT"), session)

    async def _open_trade(
        self,
        bot: BotConfig,
        side: str,
        entry_price: float,
        sl_price: float,
        tp_price: float,
        session: AsyncSession,
        symbol: Optional[str] = None,
        allocation_usd: Optional[float] = None,
        contracts_override: Optional[int] = None
    ):
        """Execute and record a new trade."""
        delta_order_id = None
        trade_symbol = (symbol or bot.symbol).upper()
        trade_size = allocation_usd if (allocation_usd and allocation_usd > 0) else bot.allocation_usd
        if contracts_override and contracts_override > 0:
            contracts = contracts_override
        else:
            contracts = max(1, int(trade_size / entry_price)) if entry_price > 0 else 1

        if bot.mode == "LIVE":
            try:
                # Find product id for the specific symbol
                prod = await self.delta_client.get_product_by_symbol(trade_symbol)
                product_id = prod.get("id") if prod else None

                if not product_id:
                    raise ValueError(f"Could not resolve product ID for {trade_symbol}")

                order_res = await self.delta_client.place_order(
                    product_id=product_id,
                    size=contracts,
                    side=side,
                    order_type="market_order",
                    stop_loss_price=sl_price
                )
                delta_order_id = str(order_res.get("id", ""))
            except Exception as e:
                err_msg = f"Failed to execute live trade on Delta ({trade_symbol}): {e}"
                logger.error(err_msg)
                await notifier.notify_alert(f"Delta Execution Failed ({trade_symbol})", err_msg, level="ERROR")
                return

        new_trade = Trade(
            bot_id=bot.id,
            strategy_name=bot.strategy_name,
            symbol=trade_symbol,
            side=side,
            mode=bot.mode,
            entry_price=entry_price,
            size=trade_size,
            contracts=contracts,
            leverage=bot.leverage,
            stop_loss=sl_price,
            take_profit=tp_price,
            status="OPEN",
            delta_order_id=delta_order_id,
            created_at=datetime.utcnow()
        )
        session.add(new_trade)
        await session.commit()
        await session.refresh(new_trade)

        # Send notifications
        await notifier.notify_trade_open(
            symbol=trade_symbol,
            side=side,
            entry_price=entry_price,
            size_usd=trade_size,
            strategy_name=bot.strategy_name,
            mode=bot.mode,
            stop_loss=sl_price,
            take_profit=tp_price
        )


    async def _close_trade(
        self,
        trade: Trade,
        exit_price: float,
        reason: str,
        session: AsyncSession
    ):
        """Close an existing open position."""
        if trade.mode == "LIVE":
            try:
                prod = await self.delta_client.get_product_by_symbol(trade.symbol)
                if prod:
                    # Cancel any resting bracket stop/take-profit orders first to prevent orphaned fills
                    try:
                        await self.delta_client.cancel_all_orders(product_id=prod["id"])
                    except Exception as cancel_err:
                        logger.warning(f"Could not cancel open orders for {trade.symbol} before close: {cancel_err}")

                    await self.delta_client.close_position(
                        product_id=prod["id"],
                        size=trade.contracts,
                        current_side=trade.side
                    )
            except Exception as e:
                logger.error(f"Error closing live position on Delta: {e}")

        pnl_usd, pnl_pct = risk_manager.calculate_pnl(
            side=trade.side,
            entry_price=trade.entry_price,
            current_price=exit_price,
            size_usd=trade.size,
            leverage=trade.leverage
        )

        trade.exit_price = exit_price
        trade.pnl = pnl_usd
        trade.pnl_pct = pnl_pct
        trade.status = "CLOSED"
        trade.exit_reason = reason
        trade.closed_at = datetime.utcnow()

        await session.commit()

        # Update paper balance if paper mode
        if trade.mode == "PAPER":
            settings_res = await session.execute(select(AppSettings).order_by(AppSettings.id.desc()).limit(1))
            settings_rec = settings_res.scalars().first()
            if settings_rec:
                settings_rec.paper_balance = round(settings_rec.paper_balance + pnl_usd, 2)
                await session.commit()

        # Send notifications
        await notifier.notify_trade_close(
            symbol=trade.symbol,
            side=trade.side,
            entry_price=trade.entry_price,
            exit_price=exit_price,
            pnl=pnl_usd,
            pnl_pct=pnl_pct,
            reason=reason,
            strategy_name=trade.strategy_name,
            mode=trade.mode
        )

    async def emergency_kill_switch(self):
        """Emergency Kill Switch: instantly close all positions, cancel orders, halt bots."""
        async with AsyncSessionLocal() as session:
            # 1. Turn off all bots
            result = await session.execute(select(BotConfig).where(BotConfig.is_active == True))
            for bot in result.scalars().all():
                bot.is_active = False

            # 2. Close all open trades
            open_trades = await session.execute(select(Trade).where(Trade.status == "OPEN"))
            for trade in open_trades.scalars().all():
                # fetch current ticker
                try:
                    ticker = await self.delta_client.get_ticker(trade.symbol)
                    exit_price = float(ticker.get("close", trade.entry_price))
                except Exception:
                    exit_price = trade.entry_price

                await self._close_trade(trade, exit_price, "KILL_SWITCH", session)

            # 3. Update settings
            settings_res = await session.execute(select(AppSettings).order_by(AppSettings.id.desc()).limit(1))
            settings_rec = settings_res.scalars().first()
            if settings_rec:
                settings_rec.kill_switch = True
                await session.commit()

            risk_manager.kill_switch = True

            # 4. Cancel all exchange orders if live
            try:
                await self.delta_client.cancel_all_orders()
            except Exception as e:
                logger.error(f"Error canceling orders during kill switch: {e}")

            await notifier.notify_alert("🚨 EMERGENCY KILL SWITCH ENGAGED", "All bots halted. All open trades closed.", level="CRITICAL")

    async def _take_equity_snapshot(self):
        """Record periodic equity snapshot for the PnL performance curve."""
        async with AsyncSessionLocal() as session:
            settings_res = await session.execute(select(AppSettings).order_by(AppSettings.id.desc()).limit(1))
            settings_rec = settings_res.scalars().first()
            paper_bal = settings_rec.paper_balance if settings_rec else 10000.0

            # 1. PAPER snapshot
            paper_pnl_res = await session.execute(
                select(func.sum(Trade.pnl)).where(and_(Trade.status == "CLOSED", Trade.mode == "PAPER"))
            )
            paper_realized_pnl = paper_pnl_res.scalar() or 0.0

            paper_trades_res = await session.execute(
                select(Trade).where(and_(Trade.status == "OPEN", Trade.mode == "PAPER"))
            )
            paper_open_trades = paper_trades_res.scalars().all()

            paper_unrealized_pnl = 0.0
            for t in paper_open_trades:
                try:
                    ticker = await self.delta_client.get_ticker(t.symbol)
                    curr = float(ticker.get("mark_price") or ticker.get("close", t.entry_price))
                    pnl_u, _ = risk_manager.calculate_pnl(t.side, t.entry_price, curr, t.size, t.leverage)
                    paper_unrealized_pnl += pnl_u
                except Exception:
                    pass

            paper_snapshot = EquitySnapshot(
                total_balance=round(paper_bal + paper_unrealized_pnl, 2),
                available_balance=round(paper_bal, 2),
                realized_pnl=round(paper_realized_pnl, 2),
                unrealized_pnl=round(paper_unrealized_pnl, 2),
                mode="PAPER"
            )
            session.add(paper_snapshot)

            # 2. LIVE snapshot (if exchange connected)
            is_live_connected = bool(settings_rec and settings_rec.delta_api_key and settings_rec.delta_api_secret)
            if is_live_connected and self.delta_client:
                try:
                    delta_bal = await self.delta_client.get_total_balance_usd()
                    live_bal = float(delta_bal.get("total_balance", 0.0))
                    if live_bal > 0:
                        live_pos = await self.delta_client.get_positions()
                        live_u_pnl = sum([float(p.get("unrealized_pnl", 0) or 0) for p in live_pos])
                        live_pnl_res = await session.execute(
                            select(func.sum(Trade.pnl)).where(and_(Trade.status == "CLOSED", Trade.mode == "LIVE"))
                        )
                        live_realized_pnl = live_pnl_res.scalar() or 0.0

                        live_snapshot = EquitySnapshot(
                            total_balance=round(live_bal + live_u_pnl, 2),
                            available_balance=round(float(delta_bal.get("available_balance", 0.0)), 2),
                            realized_pnl=round(live_realized_pnl, 2),
                            unrealized_pnl=round(live_u_pnl, 2),
                            mode="LIVE"
                        )
                        session.add(live_snapshot)
                except Exception:
                    pass

            await session.commit()

engine = AlgoEngine()
