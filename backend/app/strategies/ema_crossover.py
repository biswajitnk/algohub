from typing import List, Dict, Any, Optional
import pandas as pd
from app.strategies.base import BaseStrategy

class EMACrossoverStrategy(BaseStrategy):
    """
    Exponential Moving Average (EMA) Crossover Strategy.
    Buys when fast EMA crosses above slow EMA.
    Sells when fast EMA crosses below slow EMA.
    """

    def __init__(self, params: Optional[Dict[str, Any]] = None):
        super().__init__("EMA_Crossover", params)
        self.fast_period = int(self.params.get("fast_period", 9))
        self.slow_period = int(self.params.get("slow_period", 21))

    def generate_signal(self, candles: List[Dict[str, Any]], current_position: Optional[str] = None) -> Dict[str, Any]:
        if len(candles) < self.slow_period + 5:
            return {"action": "HOLD", "reason": "Insufficient candles for EMA calculation", "indicators": {}, "price": 0.0}

        df = pd.DataFrame(candles)
        df['close'] = pd.to_numeric(df['close'])

        df['ema_fast'] = df['close'].ewm(span=self.fast_period, adjust=False).mean()
        df['ema_slow'] = df['close'].ewm(span=self.slow_period, adjust=False).mean()

        last_row = df.iloc[-1]
        prev_row = df.iloc[-2]

        current_price = float(last_row['close'])
        fast_now = float(last_row['ema_fast'])
        slow_now = float(last_row['ema_slow'])
        fast_prev = float(prev_row['ema_fast'])
        slow_prev = float(prev_row['ema_slow'])

        indicators = {
            "fast_ema": round(fast_now, 2),
            "slow_ema": round(slow_now, 2),
            "fast_period": self.fast_period,
            "slow_period": self.slow_period
        }

        # Golden Cross (Fast crosses above Slow)
        if fast_prev <= slow_prev and fast_now > slow_now:
            if current_position != "buy":
                return {
                    "action": "BUY",
                    "reason": f"Golden Cross: EMA {self.fast_period} ({fast_now:.2f}) crossed above EMA {self.slow_period} ({slow_now:.2f})",
                    "indicators": indicators,
                    "price": current_price
                }

        # Death Cross (Fast crosses below Slow)
        elif fast_prev >= slow_prev and fast_now < slow_now:
            if current_position != "sell":
                return {
                    "action": "SELL",
                    "reason": f"Death Cross: EMA {self.fast_period} ({fast_now:.2f}) crossed below EMA {self.slow_period} ({slow_now:.2f})",
                    "indicators": indicators,
                    "price": current_price
                }

        return {
            "action": "HOLD",
            "reason": f"EMA {self.fast_period} is {'above' if fast_now > slow_now else 'below'} EMA {self.slow_period}",
            "indicators": indicators,
            "price": current_price
        }
