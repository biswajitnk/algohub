from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseStrategy(ABC):
    """
    Abstract base class for all trading strategies.
    Strategies process candle/OHLCV data and output signals.
    """

    def __init__(self, name: str, params: Optional[Dict[str, Any]] = None):
        self.name = name
        self.params = params or {}

    @abstractmethod
    def generate_signal(self, candles: List[Dict[str, Any]], current_position: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze recent candles and return signal.
        
        Parameters:
        - candles: List of candles sorted oldest to newest:
                   [{'time': int, 'open': float, 'high': float, 'low': float, 'close': float, 'volume': float}, ...]
        - current_position: None, 'buy' (long), or 'sell' (short)
        
        Returns dict:
        {
            "action": "BUY" | "SELL" | "HOLD" | "CLOSE",
            "reason": str,
            "indicators": dict,
            "price": float
        }
        """
        pass
