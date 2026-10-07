import logging
from typing import Optional, Dict, Any, List
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)

class NotificationManager:
    """
    Handles outbound notifications via Telegram Bot and internal WebSocket event broadcast.
    Provides rich formatting for Trade Open, Trade Close, Stop-Loss, Take-Profit, and Risk Alerts.
    """

    def __init__(self, bot_token: Optional[str] = None, chat_id: Optional[str] = None):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.active_websockets: List[Any] = []

    def update_credentials(self, bot_token: Optional[str], chat_id: Optional[str]):
        self.bot_token = bot_token
        self.chat_id = chat_id

    def register_websocket(self, websocket: Any):
        if websocket not in self.active_websockets:
            self.active_websockets.append(websocket)

    def unregister_websocket(self, websocket: Any):
        if websocket in self.active_websockets:
            self.active_websockets.remove(websocket)

    async def broadcast_ws(self, event_type: str, data: Dict[str, Any]):
        """Send live event to all connected web dashboard & mobile clients."""
        payload = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        }
        dead_connections = []
        for ws in self.active_websockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead_connections.append(ws)

        for dead in dead_connections:
            self.unregister_websocket(dead)

    async def send_telegram(self, text: str) -> bool:
        """Send message directly to the user's phone via Telegram."""
        if not self.bot_token or not self.chat_id:
            logger.info(f"Telegram not configured. Logged alert: {text}")
            return False

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                r = await client.post(url, json=payload)
                if r.status_code == 200:
                    return True
                else:
                    logger.warning(f"Telegram send failed ({r.status_code}): {r.text}")
                    return False
        except Exception as e:
            logger.error(f"Error sending Telegram notification: {e}")
            return False

    async def notify_trade_open(
        self,
        symbol: str,
        side: str,
        entry_price: float,
        size_usd: float,
        strategy_name: str,
        mode: str,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None
    ):
        """Alert when an algorithm opens a new position."""
        side_emoji = "🟢 BUY (LONG)" if side.lower() == "buy" else "🔴 SELL (SHORT)"
        mode_badge = "🧪 PAPER SIMULATION" if mode.upper() == "PAPER" else "⚡ LIVE REAL TRADING"
        
        sl_text = f"• 🛑 <b>Stop Loss:</b> ${stop_loss:,.2f}\n" if stop_loss else ""
        tp_text = f"• 🎯 <b>Take Profit:</b> ${take_profit:,.2f}\n" if take_profit else ""

        message = (
            f"<b>🚀 NEW TRADE OPENED!</b>\n\n"
            f"<b>Mode:</b> {mode_badge}\n"
            f"<b>Symbol:</b> #{symbol}\n"
            f"<b>Side:</b> {side_emoji}\n"
            f"<b>Strategy:</b> {strategy_name}\n"
            f"<b>Entry Price:</b> ${entry_price:,.2f}\n"
            f"<b>Size:</b> ${size_usd:,.2f}\n"
            f"{sl_text}"
            f"{tp_text}"
            f"⏰ <i>Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</i>"
        )
        await self.send_telegram(message)
        await self.broadcast_ws("TRADE_OPEN", {
            "symbol": symbol,
            "side": side,
            "entry_price": entry_price,
            "size_usd": size_usd,
            "strategy": strategy_name,
            "mode": mode,
            "stop_loss": stop_loss,
            "take_profit": take_profit
        })

    async def notify_trade_close(
        self,
        symbol: str,
        side: str,
        entry_price: float,
        exit_price: float,
        pnl: float,
        pnl_pct: float,
        reason: str,
        strategy_name: str,
        mode: str
    ):
        """Alert when a trade is closed."""
        pnl_emoji = "💰 PROFIT" if pnl >= 0 else "🛑 LOSS"
        sign = "+" if pnl >= 0 else ""
        mode_badge = "🧪 PAPER" if mode.upper() == "PAPER" else "⚡ LIVE"

        message = (
            f"<b>🏁 TRADE CLOSED ({pnl_emoji})</b>\n\n"
            f"<b>Mode:</b> {mode_badge}\n"
            f"<b>Symbol:</b> #{symbol} ({side.upper()})\n"
            f"<b>Strategy:</b> {strategy_name}\n"
            f"<b>Exit Reason:</b> {reason}\n"
            f"<b>Entry Price:</b> ${entry_price:,.2f}\n"
            f"<b>Exit Price:</b> ${exit_price:,.2f}\n"
            f"<b>PnL:</b> <b>{sign}${pnl:,.2f} ({sign}{pnl_pct:.2f}%)</b>\n"
            f"⏰ <i>Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</i>"
        )
        await self.send_telegram(message)
        await self.broadcast_ws("TRADE_CLOSE", {
            "symbol": symbol,
            "side": side,
            "entry_price": entry_price,
            "exit_price": exit_price,
            "pnl": pnl,
            "pnl_pct": pnl_pct,
            "reason": reason,
            "strategy": strategy_name,
            "mode": mode
        })

    async def notify_alert(self, title: str, text: str, level: str = "INFO"):
        """Send system or risk notification."""
        level_icons = {
            "INFO": "ℹ️",
            "WARNING": "⚠️",
            "ERROR": "🚨",
            "CRITICAL": "🔥"
        }
        icon = level_icons.get(level.upper(), "📢")
        message = f"<b>{icon} {title}</b>\n\n{text}\n\n⏰ <i>{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</i>"
        await self.send_telegram(message)
        await self.broadcast_ws("SYSTEM_ALERT", {
            "level": level,
            "title": title,
            "message": text
        })

# Global singleton
notifier = NotificationManager()
