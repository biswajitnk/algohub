import logging
from typing import Tuple, Optional, Dict, Any
from app.notifications import notifier
from app.config import settings

logger = logging.getLogger(__name__)

class RiskManager:
    """
    Enforces risk guardrails to protect capital when running 24/7 on a VPS:
    - Maximum daily loss limit
    - Maximum leverage limit
    - Stop-loss and Take-profit price calculations
    - Emergency Kill Switch
    """

    def __init__(
        self,
        max_daily_loss: float = 100.0,
        max_leverage: int = 10,
        kill_switch: bool = False
    ):
        self.max_daily_loss = max_daily_loss
        self.max_leverage = max_leverage
        self.kill_switch = kill_switch

    def update_limits(self, max_daily_loss: float, max_leverage: int, kill_switch: bool):
        self.max_daily_loss = max_daily_loss
        self.max_leverage = max_leverage
        self.kill_switch = kill_switch

    def validate_order(
        self,
        side: str,
        price: float,
        allocation_usd: float,
        leverage: int,
        today_realized_pnl: float
    ) -> Tuple[bool, str]:
        """
        Check if an order violates risk parameters before execution.
        Returns: (is_allowed: bool, reason: str)
        """
        if self.kill_switch:
            return False, "Emergency Kill Switch is ACTIVE. All trading blocked."

        # Daily loss circuit breaker
        if today_realized_pnl <= -abs(self.max_daily_loss):
            return False, f"Daily loss limit hit (${abs(today_realized_pnl):.2f} >= ${self.max_daily_loss:.2f}). Trading paused for today."

        # Leverage limit
        if leverage > self.max_leverage:
            return False, f"Requested leverage ({leverage}x) exceeds maximum allowed limit ({self.max_leverage}x)."

        # Allocation sanity
        if allocation_usd <= 0:
            return False, "Order allocation must be greater than 0 USD."

        return True, "Risk validation passed."

    @staticmethod
    def calculate_sl_tp(
        side: str,
        entry_price: float,
        sl_pct: Optional[float] = None,
        tp_pct: Optional[float] = None
    ) -> Tuple[Optional[float], Optional[float]]:
        """
        Calculates absolute Stop Loss and Take Profit prices.
        Returns None for levels where percentage is not specified.
        """
        sl_price = None
        tp_price = None

        if sl_pct is not None and sl_pct > 0:
            if side.lower() == "buy":
                sl_price = round(entry_price * (1.0 - (sl_pct / 100.0)), 2)
            else:
                sl_price = round(entry_price * (1.0 + (sl_pct / 100.0)), 2)

        if tp_pct is not None and tp_pct > 0:
            if side.lower() == "buy":
                tp_price = round(entry_price * (1.0 + (tp_pct / 100.0)), 2)
            else:
                tp_price = round(entry_price * (1.0 - (tp_pct / 100.0)), 2)

        return sl_price, tp_price

    @staticmethod
    def calculate_pnl(
        side: str,
        entry_price: float,
        current_price: float,
        size_usd: float,
        leverage: int = 1
    ) -> Tuple[float, float]:
        """
        Calculates realized or unrealized PnL in USD and percentage.
        """
        if entry_price <= 0:
            return 0.0, 0.0

        if side.lower() == "buy":
            price_diff_pct = (current_price - entry_price) / entry_price
        else:
            price_diff_pct = (entry_price - current_price) / entry_price

        pnl_pct = price_diff_pct * 100.0 * leverage
        # PnL USD based on margin allocation (size_usd)
        pnl_usd = size_usd * (price_diff_pct * leverage)

        return round(pnl_usd, 2), round(pnl_pct, 2)

risk_manager = RiskManager()
