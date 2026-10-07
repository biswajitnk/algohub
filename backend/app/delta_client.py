import time
import hmac
import hashlib
import json
import urllib.parse
from typing import Optional, Dict, Any, List
import httpx
import logging

logger = logging.getLogger(__name__)

class DeltaExchangeClient:
    """
    Async client for Delta Exchange (supports both Delta India and Delta Global)
    Handles public market data and private authenticated REST actions (orders, positions, balances).
    Equipped with persistent HTTP connection pooling and high-speed in-memory caching.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        exchange_type: str = "india",  # "india" or "global"
        timeout: float = 10.0
    ):
        self.api_key = api_key
        self.api_secret = api_secret
        self.exchange_type = exchange_type.lower()
        
        if self.exchange_type == "global":
            self.base_url = "https://api.delta.exchange"
            self.ws_url = "wss://socket.delta.exchange"
        else:
            self.base_url = "https://api.india.delta.exchange"
            self.ws_url = "wss://socket.india.delta.exchange"

        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _get_client(self) -> httpx.AsyncClient:
        """Get or initialize persistent HTTP connection pool with keep-alive."""
        if self._client is None or self._client.is_closed:
            limits = httpx.Limits(max_keepalive_connections=20, max_connections=50, keepalive_expiry=30.0)
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                limits=limits,
                headers={"User-Agent": "DeltaAlgoTrading/1.0"}
            )
        return self._client

    async def close(self):
        """Gracefully close HTTP client connection pool."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def _get_cached(self, key: str, max_age: float = 3.0) -> Optional[Any]:
        """Retrieve unexpired value from in-memory cache."""
        if key in self._cache:
            entry = self._cache[key]
            if (time.time() - entry["ts"]) < max_age:
                return entry["data"]
        return None

    def _set_cached(self, key: str, data: Any):
        """Store value in in-memory cache with current timestamp."""
        self._cache[key] = {"data": data, "ts": time.time()}

    def invalidate_cache(self, prefix: Optional[str] = None):
        """Invalidate cache entries, useful immediately after placing or cancelling orders."""
        if prefix:
            keys_to_del = [k for k in self._cache if k.startswith(prefix)]
            for k in keys_to_del:
                self._cache.pop(k, None)
        else:
            self._cache.clear()

    def _generate_signature(self, method: str, path: str, query_or_body: str, timestamp: str) -> str:
        """Generate HMAC-SHA256 signature for Delta Exchange API."""
        if not self.api_secret:
            return ""
        message = f"{method}{timestamp}{path}{query_or_body}"
        return hmac.new(
            self.api_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

    def _get_headers(self, method: str, path: str, query_or_body: str = "") -> Dict[str, str]:
        """Construct authentication and standard headers."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "DeltaAlgoTrading/1.0"
        }
        if self.api_key and self.api_secret:
            timestamp = str(int(time.time()))
            signature = self._generate_signature(method, path, query_or_body, timestamp)
            headers["api-key"] = self.api_key
            headers["timestamp"] = timestamp
            headers["signature"] = signature
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        payload: Optional[Dict[str, Any]] = None,
        auth_required: bool = False
    ) -> Dict[str, Any]:
        """Execute async HTTP request to Delta Exchange API using pooled client with keep-alive."""
        if auth_required and (not self.api_key or not self.api_secret):
            raise ValueError("API Key and Secret are required for this action.")

        url = f"{self.base_url}{path}"
        query_str = ""
        if params:
            query_str = f"?{urllib.parse.urlencode(params)}"
            url = f"{url}{query_str}"

        body_str = ""
        if payload is not None:
            body_str = json.dumps(payload, separators=(',', ':'))

        sign_data = query_str if method.upper() == "GET" else body_str
        headers = self._get_headers(method.upper(), path, sign_data)

        client = self._get_client()
        try:
            if method.upper() == "GET":
                response = await client.get(url, headers=headers)
            elif method.upper() == "POST":
                response = await client.post(url, headers=headers, content=body_str)
            elif method.upper() == "DELETE":
                response = await client.request("DELETE", url, headers=headers, content=body_str if body_str else None)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Delta API HTTP error: {e.response.status_code} - {e.response.text}")
            try:
                err_json = e.response.json()
                err_msg = err_json.get("error", {}).get("message", str(e))
            except Exception:
                err_msg = e.response.text or str(e)
            raise RuntimeError(f"Delta API error ({e.response.status_code}): {err_msg}")
        except Exception as e:
            logger.error(f"Delta API Connection error: {str(e)}")
            raise RuntimeError(f"Connection to Delta Exchange failed: {str(e)}")

    # ------------------ Public Market Data ------------------

    async def get_products(self) -> List[Dict[str, Any]]:
        """Fetch all tradable products from Delta (cached 60s)."""
        cached = self._get_cached("products", max_age=60.0)
        if cached is not None:
            return cached
        data = await self._request("GET", "/v2/products")
        result = data.get("result", [])
        if result:
            self._set_cached("products", result)
        return result

    async def get_product_by_symbol(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Find product metadata by symbol (e.g. 'BTCUSD')."""
        products = await self.get_products()
        for p in products:
            if p.get("symbol") == symbol:
                return p
        return None

    async def get_all_tickers(self) -> List[Dict[str, Any]]:
        """Fetch all real-time tickers in a single batch request (cached 5s)."""
        cached = self._get_cached("all_tickers", max_age=5.0)
        if cached is not None:
            return cached
        data = await self._request("GET", "/v2/tickers")
        result = data.get("result", [])
        if result:
            self._set_cached("all_tickers", result)
        return result

    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """Fetch real-time ticker for a symbol (with in-memory cache)."""
        sym_key = f"ticker_{symbol.upper()}"
        cached = self._get_cached(sym_key, max_age=4.0)
        if cached is not None:
            return cached

        # Check if all_tickers cache is available
        all_tickers = self._get_cached("all_tickers", max_age=5.0)
        if all_tickers:
            for t in all_tickers:
                if t.get("symbol", "").upper() == symbol.upper():
                    self._set_cached(sym_key, t)
                    return t

        data = await self._request("GET", f"/v2/tickers/{symbol}")
        result = data.get("result", {})
        if result:
            self._set_cached(sym_key, result)
        return result

    async def get_candles(
        self,
        symbol: str,
        resolution: str = "5m",
        count: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch historical candlestick bars.
        Supported resolutions: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 1d
        """
        res_seconds = {
            "1m": 60, "3m": 180, "5m": 300, "15m": 900, "30m": 1800,
            "1h": 3600, "2h": 7200, "4h": 14400, "6h": 21600, "1d": 86400,
            "1D": 86400, "1w": 604800, "1W": 604800
        }.get(resolution, 86400)

        now = int(time.time())
        start = now - (res_seconds * count)

        params = {
            "symbol": symbol,
            "resolution": resolution,
            "start": start,
            "end": now
        }
        data = await self._request("GET", "/v2/history/candles", params=params)
        candles = data.get("result", [])
        # Return sorted chronologically (oldest to newest)
        return sorted(candles, key=lambda x: x.get("time", 0))

    # ------------------ Private Authenticated Actions ------------------

    async def test_connection(self) -> Dict[str, Any]:
        """Verify API keys with Delta Exchange."""
        try:
            balances = await self.get_wallet_balances()
            return {"success": True, "message": "Connection verified successfully!", "balances": balances}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def get_wallet_balances(self) -> List[Dict[str, Any]]:
        """Fetch user wallet balances (cached 3s)."""
        cached = self._get_cached("wallet_balances", max_age=3.0)
        if cached is not None:
            return cached
        data = await self._request("GET", "/v2/wallet/balances", auth_required=True)
        result = data.get("result", [])
        self._set_cached("wallet_balances", result)
        return result

    async def get_positions(self) -> List[Dict[str, Any]]:
        """Fetch all active user open positions from Delta Exchange (cached 3s)."""
        cached = self._get_cached("positions", max_age=3.0)
        if cached is not None:
            return cached
        try:
            data = await self._request("GET", "/v2/positions/margined", auth_required=True)
            positions = data.get("result", [])
            # Filter for non-zero open positions
            filtered = [p for p in positions if float(p.get("size", 0)) != 0]
            self._set_cached("positions", filtered)
            return filtered
        except Exception as e:
            logger.warning(f"Error fetching margined positions: {e}")
            return []

    async def get_total_balance_usd(self) -> Dict[str, float]:
        """Fetch total wallet balance in USD equivalent."""
        balances = await self.get_wallet_balances()
        total_balance = 0.0
        available_balance = 0.0

        for b in balances:
            asset = b.get("asset_symbol", "").upper()
            bal = float(b.get("balance", 0) or 0)
            avail = float(b.get("available_balance", 0) or 0)

            if asset in ["USD", "USDT", "USDC"]:
                total_balance += bal
                available_balance += avail
            elif bal > 0:
                # If holding other assets (BTC, ETH, etc.), convert or include
                total_balance += bal
                available_balance += avail

        return {
            "total_balance": round(total_balance, 2),
            "available_balance": round(available_balance, 2)
        }

    async def get_open_orders(self, product_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Fetch open orders."""
        params = {"state": "open"}
        if product_id:
            params["product_id"] = product_id
        data = await self._request("GET", "/v2/orders", params=params, auth_required=True)
        return data.get("result", [])

    async def place_order(
        self,
        product_id: int,
        size: int,
        side: str,  # "buy" or "sell"
        order_type: str = "market_order",  # "market_order" or "limit_order"
        limit_price: Optional[float] = None,
        stop_loss_price: Optional[float] = None,
        take_profit_price: Optional[float] = None
    ) -> Dict[str, Any]:
        """Place an order on Delta Exchange."""
        payload: Dict[str, Any] = {
            "product_id": product_id,
            "size": size,
            "side": side.lower(),
            "order_type": order_type
        }
        if order_type == "limit_order" and limit_price is not None:
            payload["limit_price"] = str(limit_price)

        # Bracket orders / Auto stop loss if provided
        if stop_loss_price is not None:
            payload["stop_loss_order"] = {
                "order_type": "market_order",
                "stop_price": str(stop_loss_price)
            }

        data = await self._request("POST", "/v2/orders", payload=payload, auth_required=True)
        self.invalidate_cache("positions")
        self.invalidate_cache("wallet_balances")
        return data.get("result", {})

    async def cancel_order(self, order_id: str, product_id: int) -> Dict[str, Any]:
        """Cancel a specific order."""
        payload = {"id": order_id, "product_id": product_id}
        data = await self._request("DELETE", "/v2/orders", payload=payload, auth_required=True)
        self.invalidate_cache("positions")
        self.invalidate_cache("wallet_balances")
        return data.get("result", {})

    async def cancel_all_orders(self, product_id: Optional[int] = None) -> Dict[str, Any]:
        """Emergency cancel all open orders."""
        payload: Dict[str, Any] = {}
        if product_id:
            payload["product_id"] = product_id
        data = await self._request("POST", "/v2/orders/cancel_all", payload=payload, auth_required=True)
        self.invalidate_cache("positions")
        self.invalidate_cache("wallet_balances")
        return data.get("result", {})

    async def close_position(self, product_id: int, size: int, current_side: str) -> Dict[str, Any]:
        """
        Close a position by sending an offsetting market order.
        If currently long ('buy'), sell the size.
        If currently short ('sell'), buy the size.
        """
        opposite_side = "sell" if current_side.lower() == "buy" else "buy"
        res = await self.place_order(
            product_id=product_id,
            size=size,
            side=opposite_side,
            order_type="market_order"
        )
        self.invalidate_cache("positions")
        self.invalidate_cache("wallet_balances")
        return res
