from typing import List, Dict, Any, Optional
import pandas as pd
from app.strategies.base import BaseStrategy

class RSIScalperStrategy(BaseStrategy):
    """
    RSI Mean-Reversion Scalping Strategy.
    Buys when RSI dips into oversold territory (< 30) and turns upward.
    Sells when RSI climbs into overbought territory (> 70) and turns downward.
    """

    def __init__(self, params: Optional[Dict[str, Any]] = None):
        super().__init__("RSI_Scalper", params)
        self.period = int(self.params.get("period", 14))
        self.oversold = float(self.params.get("oversold", 30))
        self.overbought = float(self.params.get("overbought", 70))

    def calculate_rsi(self, series: pd.Series) -> pd.Series:
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=self.period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.period).mean()

        rs = gain / loss.replace(0, 0.00001)
        rsi = 100 - (100 / (1 + rs))
        return rsi

    def generate_signal(self, candles: List[Dict[str, Any]], current_position: Optional[str] = None) -> Dict[str, Any]:
        if len(candles) < self.period + 5:
            return {"action": "HOLD", "reason": "Insufficient candles for RSI", "indicators": {}, "price": 0.0}

        df = pd.DataFrame(candles)
        df['close'] = pd.to_numeric(df['close'])
        df['rsi'] = self.calculate_rsi(df['close'])

        last_row = df.iloc[-1]
        prev_row = df.iloc[-2]

        current_price = float(last_row['close'])
        rsi_now = float(last_row['rsi'])
        rsi_prev = float(prev_row['rsi'])

        indicators = {
            "rsi": round(rsi_now, 2),
            "rsi_prev": round(rsi_prev, 2),
            "oversold_threshold": self.oversold,
            "overbought_threshold": self.overbought
        }

        # Oversold recovery -> BUY
        if rsi_prev <= self.oversold and rsi_now > self.oversold:
            if current_position != "buy":
                return {
                    "action": "BUY",
                    "reason": f"RSI recovered from Oversold ({rsi_prev:.1f} -> {rsi_now:.1f})",
                    "indicators": indicators,
                    "price": current_price
                }

        # Overbought breakdown -> SELL
        elif rsi_prev >= self.overbought and rsi_now < self.overbought:
            if current_position != "sell":
                return {
                    "action": "SELL",
                    "reason": f"RSI broke below Overbought ({rsi_prev:.1f} -> {rsi_now:.1f})",
                    "indicators": indicators,
                    "price": current_price
                }

        return {
            "action": "HOLD",
            "reason": f"RSI neutral at {rsi_now:.1f}",
            "indicators": indicators,
            "price": current_price
        }
