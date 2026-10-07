from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from app.strategies.base import BaseStrategy

class SupertrendStrategy(BaseStrategy):
    """
    Supertrend Strategy based on ATR (Average True Range).
    Generates strong directional trend signals for crypto futures/perpetuals.
    """

    def __init__(self, params: Optional[Dict[str, Any]] = None):
        super().__init__("Supertrend", params)
        self.period = int(self.params.get("period", 10))
        self.multiplier = float(self.params.get("multiplier", 3.0))

    def calculate_supertrend(self, df: pd.DataFrame) -> pd.DataFrame:
        high = df['high']
        low = df['low']
        close = df['close']

        # True Range
        tr1 = high - low
        tr2 = (high - close.shift(1)).abs()
        tr3 = (low - close.shift(1)).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        # ATR using rolling mean / wilder's smoothing
        atr = tr.rolling(window=self.period).mean()

        hl2 = (high + low) / 2
        upper_basic = hl2 + (self.multiplier * atr)
        lower_basic = hl2 - (self.multiplier * atr)

        upper_band = upper_basic.copy()
        lower_band = lower_basic.copy()
        trend = pd.Series(1, index=df.index)

        for i in range(1, len(df)):
            # Final Upper Band
            if upper_basic.iloc[i] < upper_band.iloc[i - 1] or close.iloc[i - 1] > upper_band.iloc[i - 1]:
                upper_band.iloc[i] = upper_basic.iloc[i]
            else:
                upper_band.iloc[i] = upper_band.iloc[i - 1]

            # Final Lower Band
            if lower_basic.iloc[i] > lower_band.iloc[i - 1] or close.iloc[i - 1] < lower_band.iloc[i - 1]:
                lower_band.iloc[i] = lower_basic.iloc[i]
            else:
                lower_band.iloc[i] = lower_band.iloc[i - 1]

            # Determine Trend
            if close.iloc[i] > upper_band.iloc[i - 1]:
                trend.iloc[i] = 1
            elif close.iloc[i] < lower_band.iloc[i - 1]:
                trend.iloc[i] = -1
            else:
                trend.iloc[i] = trend.iloc[i - 1]

        df['atr'] = atr
        df['upper_band'] = upper_band
        df['lower_band'] = lower_band
        df['trend'] = trend
        return df

    def generate_signal(self, candles: List[Dict[str, Any]], current_position: Optional[str] = None) -> Dict[str, Any]:
        if len(candles) < self.period + 5:
            return {"action": "HOLD", "reason": "Insufficient candles for Supertrend", "indicators": {}, "price": 0.0}

        df = pd.DataFrame(candles)
        df['close'] = pd.to_numeric(df['close'])
        df['high'] = pd.to_numeric(df['high'])
        df['low'] = pd.to_numeric(df['low'])
        df['open'] = pd.to_numeric(df['open'])

        df = self.calculate_supertrend(df)
        last_row = df.iloc[-1]
        prev_row = df.iloc[-2]

        current_price = float(last_row['close'])
        curr_trend = int(last_row['trend'])
        prev_trend = int(prev_row['trend'])

        indicators = {
            "trend": "BULLISH" if curr_trend == 1 else "BEARISH",
            "supertrend_line": float(last_row['lower_band'] if curr_trend == 1 else last_row['upper_band']),
            "atr": float(last_row['atr']) if pd.notna(last_row['atr']) else 0.0,
            "period": self.period,
            "multiplier": self.multiplier
        }

        # Check for Trend Flip
        if prev_trend == -1 and curr_trend == 1:
            if current_position == "sell":
                return {"action": "BUY", "reason": "Supertrend flipped Bullish (reversing short to long)", "indicators": indicators, "price": current_price}
            elif current_position != "buy":
                return {"action": "BUY", "reason": "Supertrend flipped Bullish (entry signal)", "indicators": indicators, "price": current_price}

        elif prev_trend == 1 and curr_trend == -1:
            if current_position == "buy":
                return {"action": "SELL", "reason": "Supertrend flipped Bearish (reversing long to short)", "indicators": indicators, "price": current_price}
            elif current_position != "sell":
                return {"action": "SELL", "reason": "Supertrend flipped Bearish (entry signal)", "indicators": indicators, "price": current_price}

        return {"action": "HOLD", "reason": f"Trend continuing {indicators['trend']}", "indicators": indicators, "price": current_price}
