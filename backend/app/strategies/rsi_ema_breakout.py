from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from app.strategies.base import BaseStrategy

class RSIEMABreakoutStrategy(BaseStrategy):
    """
    RSI 14 & 20 EMA Daily Breakout Strategy with 1:2 Risk-Reward Breakeven.
    Designed for US Stock Tokens (MegaCap, Semis & AI, Growth & Tech) on Delta Exchange.

    Entry Rules (Daily timeframe):
    1. Past 6D RSI Dip: RSI 14 in the last 6 daily candles must have been < 50 at least once.
    2. Current RSI Cross: Current RSI 14 crosses above 50 (>= 50).
    3. 20 EMA Cross: Current price crosses above the 20-day EMA.
    4. Yesterday Candle Cross: Current price breaks above yesterday's high.
    5. Today's Performance: Today's candle gain is > 2.0%.

    Exit Rules:
    1. Initial Stop Loss: Low of the entry candle.
    2. Indicator Exit: If RSI crosses below 50 before breakeven -> Close trade immediately.
    3. 1:2 Breakeven Rule:
       When trade reaches 1:2 Risk/Reward (Price >= Entry + 2 * (Entry - SL)):
       - Move Stop Loss to Breakeven (Entry Price).
       - REMOVE / DISABLE the RSI < 50 stoploss (trade rides risk-free to targets).
    """

    def __init__(self, params: Optional[Dict[str, Any]] = None):
        super().__init__("RSI_EMA_Breakout", params)
        self.rsi_period = int(self.params.get("rsi_period", 14))
        self.ema_period = int(self.params.get("ema_period", 20))
        self.past_dip_window = int(self.params.get("past_dip_window", 6))
        
        self.timeframe = str(self.params.get("timeframe", "1d")).lower()
        default_gains = {"15m": 0.3, "30m": 0.5, "1h": 0.7, "4h": 1.0, "1d": 2.0, "1w": 3.0}
        
        raw_gain = self.params.get("min_today_gain_pct")
        if raw_gain is not None and str(raw_gain).strip() != "":
            raw_gain_float = float(raw_gain)
            # If user had default 2.0% saved but is running on intraday (e.g. 4h, 1h), auto-adjust to reasonable timeframe gain
            if raw_gain_float == 2.0 and self.timeframe in ["4h", "1h", "30m", "15m"]:
                self.min_today_gain_pct = default_gains.get(self.timeframe, 1.0)
            else:
                self.min_today_gain_pct = raw_gain_float
        else:
            self.min_today_gain_pct = default_gains.get(self.timeframe, 2.0)
        
        raw_target = self.params.get("target_rr_ratio", 2.0)
        self.target_mode = "rr"
        try:
            self.target_rr_ratio = float(raw_target)
        except (ValueError, TypeError):
            self.target_mode = str(raw_target).lower()
            if "_and_" in self.target_mode:
                prefix = self.target_mode.split("_and_")[0]
                try:
                    self.target_rr_ratio = float(prefix)
                except Exception:
                    self.target_rr_ratio = 2.0
            else:
                self.target_rr_ratio = 0.0

        # Stop loss mode: 'rsi_or_candle_low' (default), 'candle_low_buffer', 'rsi_50', 'ema_or_candle_low', 'any_of_three', 'candle_low'
        self.stop_loss_mode = str(self.params.get("stop_loss_mode", "rsi_or_candle_low")).lower()
        self.sl_buffer_pct = float(self.params.get("sl_buffer_pct", 0.2))

        # Stop loss reference: 'timeframe_low' (e.g. 4H / 1H candle low) vs 'daily_low' (1D Daily candle low)
        self.sl_reference = str(self.params.get("sl_reference", "timeframe_low")).lower()

    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        df['close'] = pd.to_numeric(df['close'])
        df['open'] = pd.to_numeric(df['open'])
        df['high'] = pd.to_numeric(df['high'])
        df['low'] = pd.to_numeric(df['low'])

        # 1. Wilder's RSI 14
        delta = df['close'].diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(alpha=1.0 / self.rsi_period, min_periods=self.rsi_period, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1.0 / self.rsi_period, min_periods=self.rsi_period, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, 1e-9)
        df['rsi'] = 100 - (100 / (1 + rs))

        # 2. 20 EMA
        df['ema20'] = df['close'].ewm(span=self.ema_period, adjust=False).mean()

        # 3. Dynamic Daily Low (cumulative low of each day's candles)
        if 'time' in df.columns:
            try:
                df['time_num'] = pd.to_numeric(df['time'])
                df['dt'] = pd.to_datetime(df['time_num'], unit='s')
                df['date'] = df['dt'].dt.date
                df['daily_low'] = df.groupby('date')['low'].cummin()
            except Exception:
                df['daily_low'] = df['low']
        else:
            df['daily_low'] = df['low']

        return df

    def generate_signal(
        self,
        candles: List[Dict[str, Any]],
        current_position: Optional[str] = None,
        trade_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Evaluate entry & exit rules based on candles.
        trade_metadata can include: {'entry_price': float, 'stop_loss': float, 'breakeven_active': bool}
        """
        required_candles = max(self.rsi_period, self.ema_period) + self.past_dip_window + 5
        if len(candles) < required_candles:
            return {
                "action": "HOLD",
                "reason": f"Insufficient candles (need at least {required_candles})",
                "indicators": {},
                "price": float(candles[-1]['close']) if candles else 0.0
            }

        df = pd.DataFrame(candles)
        df = self.calculate_indicators(df)

        curr = df.iloc[-1]
        prev = df.iloc[-2]
        curr_price = float(curr['close'])
        curr_open = float(curr['open'])
        curr_high = float(curr['high'])
        curr_low = float(curr['low'])
        curr_rsi = float(curr['rsi'])
        curr_ema20 = float(curr['ema20'])

        prev_close = float(prev['close'])
        prev_high = float(prev['high'])
        prev_low = float(prev['low'])
        prev_rsi = float(prev['rsi'])
        prev_ema20 = float(prev['ema20'])

        prev2 = df.iloc[-3] if len(df) >= 3 else prev
        prev2_rsi = float(prev2['rsi'])

        # Today's performance percentage (standard daily change from prev close, or intraday change from open)
        gain_from_prev = ((curr_price - prev_close) / prev_close) * 100 if prev_close > 0 else 0.0
        gain_from_open = ((curr_price - curr_open) / curr_open) * 100 if curr_open > 0 else 0.0
        today_gain_pct = max(gain_from_prev, gain_from_open)

        # Check Past 6D RSI < 50
        past_rsi_window = df['rsi'].iloc[-(self.past_dip_window + 1):-1]
        had_rsi_dip_below_50 = (past_rsi_window < 50.0).any()
        min_past_rsi = float(past_rsi_window.min()) if len(past_rsi_window) > 0 else 50.0

        curr_daily_low = float(curr['daily_low']) if ('daily_low' in curr and not pd.isna(curr['daily_low'])) else curr_low
        tf_label = "Yday" if self.timeframe == "1d" else f"Prev {self.timeframe.upper()}"

        indicators = {
            "rsi": round(curr_rsi, 2),
            "prev_rsi": round(prev_rsi, 2),
            "prev2_rsi": round(prev2_rsi, 2),
            "ema20": round(curr_ema20, 2),
            "today_gain_pct": round(today_gain_pct, 2),
            "entry_candle_low": round(curr_low, 2),
            "timeframe_low": round(curr_low, 2),
            "daily_low": round(curr_daily_low, 2),
            "sl_reference": self.sl_reference,
            "yesterday_high": round(prev_high, 2),
            "prev_high": round(prev_high, 2),
            "timeframe": self.timeframe,
            "min_gain_pct": self.min_today_gain_pct,
            "had_rsi_dip_below_50": bool(had_rsi_dip_below_50),
            "min_past_rsi_6d": round(min_past_rsi, 2)
        }

        # ------------------ IF CURRENTLY IN POSITION (BUY) ------------------
        if current_position == "buy":
            trade_metadata = trade_metadata or {}
            entry_price = trade_metadata.get("entry_price", curr_price)
            stop_loss = trade_metadata.get("stop_loss", prev_low)
            breakeven_active = trade_metadata.get("breakeven_active", False)

            # Check if breakeven is already achieved (Stop loss at or above entry)
            if stop_loss and stop_loss >= entry_price:
                breakeven_active = True

            # Calculate target price if using R:R
            risk_r = max(0.01, entry_price - stop_loss) if (stop_loss and stop_loss < entry_price) else 0.01
            target_price = entry_price + (self.target_rr_ratio * risk_r) if self.target_rr_ratio > 0 else 0.0
            indicators["target_price"] = round(target_price, 2)
            indicators["breakeven_active"] = breakeven_active

            # Target Mode 1: Pure 20 EMA Cross Below Exit
            if self.target_mode == "20_ema":
                if self.stop_loss_mode in ["rsi_50", "rsi_or_candle_low", "any_of_three"] and curr_rsi < 50.0:
                    return {
                        "action": "CLOSE",
                        "reason": f"Stop loss: RSI dropped below 50 ({curr_rsi:.2f} < 50.0)",
                        "indicators": indicators,
                        "price": curr_price
                    }
                if curr_price < curr_ema20:
                    return {
                        "action": "CLOSE",
                        "reason": f"Target exit: Price closed below 20 EMA (${curr_price:.2f} < ${curr_ema20:.2f})",
                        "indicators": indicators,
                        "price": curr_price
                    }
                return {
                    "action": "HOLD",
                    "reason": f"Riding trend above 20 EMA (${curr_price:.2f} >= ${curr_ema20:.2f})",
                    "indicators": indicators,
                    "price": curr_price
                }

            # Target Mode 2: Pure RSI 50 Cross Below Exit
            if self.target_mode == "rsi_50":
                if curr_rsi < 50.0:
                    return {
                        "action": "CLOSE",
                        "reason": f"Target exit: RSI dropped below 50 ({curr_rsi:.2f} < 50.0)",
                        "indicators": indicators,
                        "price": curr_price
                    }
                return {
                    "action": "HOLD",
                    "reason": f"Riding momentum with RSI > 50 ({curr_rsi:.2f})",
                    "indicators": indicators,
                    "price": curr_price
                }

            # Target Mode 3: 20 EMA or RSI 50 Cross Below Exit
            if self.target_mode in ["both_cross", "ema_or_rsi"]:
                if curr_price < curr_ema20 or curr_rsi < 50.0:
                    trigger = "Price < 20 EMA" if curr_price < curr_ema20 else "RSI < 50"
                    return {
                        "action": "CLOSE",
                        "reason": f"Target exit: {trigger} triggered exit (${curr_price:.2f}, RSI {curr_rsi:.2f})",
                        "indicators": indicators,
                        "price": curr_price
                    }
                return {
                    "action": "HOLD",
                    "reason": f"Holding trade above 20 EMA and RSI > 50",
                    "indicators": indicators,
                    "price": curr_price
                }

            # Target Mode 4: Target R:R Breakeven + Trailing Rule
            trailing_exit_rule = None
            if "_and_ema" in self.target_mode:
                trailing_exit_rule = "ema"
            elif "_and_rsi" in self.target_mode:
                trailing_exit_rule = "rsi"

            # Check if price hit Target R:R -> Trigger Breakeven
            if self.target_rr_ratio > 0 and not breakeven_active and curr_price >= target_price:
                return {
                    "action": "BREAKEVEN",
                    "reason": f"1:{self.target_rr_ratio} Target hit (${curr_price:.2f} >= ${target_price:.2f}). Move SL to Breakeven (${entry_price:.2f}).",
                    "indicators": indicators,
                    "price": curr_price,
                    "new_sl": entry_price
                }

            # When Breakeven is ACTIVE and Trailing Rule is set:
            if breakeven_active:
                if trailing_exit_rule == "ema" and curr_price < curr_ema20:
                    return {
                        "action": "CLOSE",
                        "reason": f"Target trailing exit: Price closed below 20 EMA (${curr_price:.2f} < ${curr_ema20:.2f}) after Breakeven lock",
                        "indicators": indicators,
                        "price": curr_price
                    }
                elif trailing_exit_rule == "rsi" and curr_rsi < 50.0:
                    return {
                        "action": "CLOSE",
                        "reason": f"Target trailing exit: RSI dropped below 50 ({curr_rsi:.2f} < 50.0) after Breakeven lock",
                        "indicators": indicators,
                        "price": curr_price
                    }
                return {
                    "action": "HOLD",
                    "reason": f"Breakeven active (${entry_price:.2f}). Trailing profit with trend.",
                    "indicators": indicators,
                    "price": curr_price
                }

            # If NOT yet at Breakeven: evaluate Stop Loss rule based on self.stop_loss_mode
            if not breakeven_active:
                # Mode: 'rsi_50', 'rsi_or_candle_low', 'any_of_three' -> Check RSI < 50
                if self.stop_loss_mode in ["rsi_50", "rsi_or_candle_low", "any_of_three"] and curr_rsi < 50.0:
                    return {
                        "action": "CLOSE",
                        "reason": f"Stop loss: RSI dropped below 50 ({curr_rsi:.2f} < 50.0) before Target",
                        "indicators": indicators,
                        "price": curr_price
                    }

                # Mode: 'ema_or_candle_low', 'any_of_three' -> Check Price < 20 EMA
                if self.stop_loss_mode in ["ema_or_candle_low", "any_of_three"] and curr_price < curr_ema20:
                    return {
                        "action": "CLOSE",
                        "reason": f"Stop loss: Price dropped below 20 EMA (${curr_price:.2f} < ${curr_ema20:.2f}) before Target",
                        "indicators": indicators,
                        "price": curr_price
                    }

                # In 'candle_low_buffer' or 'candle_low':
                # Hold trade through RSI dips until physical SL is hit or Target reached!
                display_sl = float(stop_loss) if stop_loss else 0.0
                return {
                    "action": "HOLD",
                    "reason": f"Trade active (SL Mode: {self.stop_loss_mode}). RSI={curr_rsi:.2f}, Low SL=${display_sl:.2f}. Waiting for Target (${target_price:.2f})",
                    "indicators": indicators,
                    "price": curr_price
                }

        # ------------------ ENTRY EVALUATION (NO OPEN POSITION) ------------------
        # Condition 1: RSI 14 (Past 6D) had dip below 50
        c1_rsi_dip = had_rsi_dip_below_50

        # Condition 2: Fresh RSI Cross above 50 (Option 2: Current candle OR max 1 candle prior)
        is_exact_cross = bool(prev_rsi < 50.0 and curr_rsi >= 50.0)
        is_prev_cross = bool(prev2_rsi < 50.0 and prev_rsi >= 50.0 and curr_rsi >= 50.0)
        c2_rsi_above_50 = is_exact_cross or is_prev_cross

        # Condition 3: Current 20 EMA above (Price > 20 EMA)
        c3_ema_cross = curr_price > curr_ema20

        # Condition 4: Yesterday candle cross (Close > Yesterday High)
        c4_yesterday_cross = curr_price > prev_high

        # Condition 5: Today performance > 2%
        c5_today_gain = today_gain_pct >= self.min_today_gain_pct

        all_criteria_met = c1_rsi_dip and c2_rsi_above_50 and c3_ema_cross and c4_yesterday_cross and c5_today_gain

        indicators["c1_rsi_dip"] = bool(c1_rsi_dip)
        indicators["c2_rsi_above_50"] = bool(c2_rsi_above_50)
        indicators["c3_ema_cross"] = bool(c3_ema_cross)
        indicators["c4_yesterday_cross"] = bool(c4_yesterday_cross)
        indicators["c5_today_gain"] = bool(c5_today_gain)
        indicators["is_exact_cross"] = is_exact_cross
        indicators["is_prev_cross"] = is_prev_cross

        if all_criteria_met:
            # Base SL determined dynamically by sl_reference ('daily_low' vs 'timeframe_low')
            base_sl = curr_daily_low if self.sl_reference == "daily_low" else curr_low

            # Stop loss calculation based on stop_loss_mode and sl_buffer_pct
            if self.stop_loss_mode == "candle_low":
                suggested_sl = round(base_sl, 2)
            else:
                # Apply buffer below the base SL (e.g. 0.2% buffer = base_sl * (1 - 0.002))
                suggested_sl = round(base_sl * (1.0 - (self.sl_buffer_pct / 100.0)), 2)

            risk_r = max(0.01, curr_price - suggested_sl)
            target_1_2 = curr_price + (self.target_rr_ratio * risk_r)
            indicators["breakout_trigger"] = "TODAY"
            indicators["base_sl"] = round(base_sl, 2)
            indicators["suggested_sl"] = round(suggested_sl, 2)
            indicators["risk_r"] = round(risk_r, 2)
            indicators["target_1_2"] = round(target_1_2, 2)
            indicators["stop_loss_mode"] = self.stop_loss_mode
            indicators["sl_buffer_pct"] = self.sl_buffer_pct

            sl_desc = f"1D Daily Low (${curr_daily_low:.2f})" if self.sl_reference == "daily_low" else f"{self.timeframe.upper()} Candle Low (${curr_low:.2f})"
            cross_detail = "Exact Bar Cross" if is_exact_cross else "1-Bar Follow-through Cross"

            return {
                "action": "BUY",
                "reason": (
                    f"RSI 20 EMA Breakout Entry ({cross_detail}): RSI 14={curr_rsi:.1f} (Crossed >50, prev={prev_rsi:.1f}), "
                    f"Price > 20 EMA ({curr_ema20:.2f}), Broke {tf_label} High ({prev_high:.2f}), "
                    f"Candle Gain +{today_gain_pct:.1f}%. SL ({sl_desc}, {self.stop_loss_mode}, {self.sl_buffer_pct}% buf): ${suggested_sl:.2f}, Target: ${target_1_2:.2f}"
                ),
                "indicators": indicators,
                "price": curr_price,
                "suggested_sl": suggested_sl,
                "target_1_2": target_1_2
            }

        # Check if breakout triggered on previous closed candle (Informational only: Late entry is strictly prohibited)
        triggered_yesterday = False
        if len(df) >= self.past_dip_window + 3:
            prev_open = float(prev['open'])
            day_before = df.iloc[-3]
            day_before_close = float(day_before['close'])
            day_before_high = float(day_before['high'])

            past_rsi_window_yest = df['rsi'].iloc[-(self.past_dip_window + 2):-2]
            yest_had_rsi_dip = (past_rsi_window_yest < 50.0).any()
            yest_rsi_above_50 = prev_rsi >= 50.0
            yest_ema_cross = prev_close > prev_ema20
            yest_high_cross = prev_close > day_before_high

            gain_prev_yest = ((prev_close - day_before_close) / day_before_close) * 100 if day_before_close > 0 else 0.0
            gain_open_yest = ((prev_close - prev_open) / prev_open) * 100 if prev_open > 0 else 0.0
            yest_gain_pct = max(gain_prev_yest, gain_open_yest)
            yest_gain_ok = yest_gain_pct >= self.min_today_gain_pct

            triggered_yesterday = bool(
                yest_had_rsi_dip and 
                yest_rsi_above_50 and 
                yest_ema_cross and 
                yest_high_cross and 
                yest_gain_ok
            )

            indicators["triggered_yesterday"] = triggered_yesterday
            if triggered_yesterday:
                indicators["yesterday_gain_pct"] = round(yest_gain_pct, 2)
                indicators["yesterday_sl"] = round(prev_low, 2)
                yest_risk = max(0.01, prev_close - prev_low)
                indicators["yesterday_target_1_2"] = round(prev_close + (self.target_rr_ratio * yest_risk), 2)

        reasons = []
        if not c1_rsi_dip: reasons.append("No 6-bar RSI<50 dip")
        if not c2_rsi_above_50:
            if curr_rsi < 50.0:
                reasons.append(f"RSI {curr_rsi:.1f}<50")
            else:
                reasons.append(f"RSI 50 cross not fresh (late entry prevented, RSI={curr_rsi:.1f})")
        if not c3_ema_cross: reasons.append(f"Price (${curr_price:.2f}) <= 20 EMA (${curr_ema20:.2f})")
        if not c4_yesterday_cross: reasons.append(f"Below {tf_label} high ({prev_high:.2f})")
        if not c5_today_gain: reasons.append(f"Gain {today_gain_pct:.1f}% < {self.min_today_gain_pct}%")
        if triggered_yesterday: reasons.append(f"{tf_label} breakout was missed (late entry strictly prohibited)")

        return {
            "action": "HOLD",
            "reason": f"Waiting for criteria: {', '.join(reasons)}",
            "indicators": indicators,
            "price": curr_price
        }
