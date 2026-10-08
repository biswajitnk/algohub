from fastapi import APIRouter, HTTPException, Query
import asyncio
from typing import List, Dict, Any, Optional
from app.engine import engine
from app.delta_client import DeltaExchangeClient

router = APIRouter(prefix="/market", tags=["Market Data"])

@router.get("/products")
async def get_popular_products():
    """Return tradable perpetual futures symbols on Delta Exchange."""
    try:
        products = await engine.delta_client.get_products()
        # Filter for popular perpetual futures
        filtered = []
        for p in products:
            if p.get("contract_type") == "perpetual_futures":
                filtered.append({
                    "id": p.get("id"),
                    "symbol": p.get("symbol"),
                    "description": p.get("description"),
                    "tick_size": p.get("tick_size"),
                    "contract_unit_currency": p.get("contract_unit_currency"),
                    "leverage": p.get("leverage")
                })
        return filtered[:50]  # top 50 perpetual futures
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tickers/batch")
async def get_batch_tickers(symbols: Optional[str] = Query(None, description="Comma-separated symbols or empty for all")):
    """Fetch live tickers for multiple symbols in a single ultra-fast batch call."""
    try:
        all_tickers = await engine.delta_client.get_all_tickers()
        requested_set = set(s.strip().upper() for s in symbols.split(",")) if symbols else None
        
        result_map: Dict[str, Dict[str, Any]] = {}
        for t in all_tickers:
            sym = t.get("symbol", "").upper()
            if not sym:
                continue
            if requested_set is None or sym in requested_set:
                close_p = t.get("close")
                mark_p = t.get("mark_price")
                change_24h = t.get("mark_change_24h") or t.get("ltp_change_24h") or "0"
                result_map[sym] = {
                    "symbol": sym,
                    "close": close_p,
                    "mark_price": mark_p,
                    "price": float(close_p or mark_p or 0),
                    "change": float(change_24h or 0),
                    "high": float(t.get("high") or 0),
                    "low": float(t.get("low") or 0),
                    "volume": float(t.get("volume") or 0),
                    "timestamp": t.get("timestamp")
                }
        return result_map
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ticker/{symbol}")
async def get_ticker(symbol: str):
    """Fetch real-time ticker for symbol."""
    try:
        ticker = await engine.delta_client.get_ticker(symbol.upper())
        return ticker
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/candles/{symbol}")
async def get_candles(
    symbol: str,
    resolution: str = Query("15m", description="1m, 5m, 15m, 1h, 1d"),
    count: int = Query(60, ge=10, le=300)
):
    """Fetch candlestick data for charts."""
    try:
        candles = await engine.delta_client.get_candles(symbol.upper(), resolution=resolution, count=count)
        return candles
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/us-tokens")
async def get_us_tokens():
    """Return all US Stock & TradFi tokens listed on Delta Exchange India."""
    try:
        products = await engine.delta_client.get_products()
        us_tokens = []
        for p in products:
            if p.get("contract_type") != "perpetual_futures":
                continue
            specs = p.get("product_specs") or {}
            tags = specs.get("tags") or []
            top_tag = specs.get("top_tag", "")
            
            # Check TradFi / stock / ETF tokens
            is_tradfi = top_tag == "tradfi" or any(t.lower() in ["xstock", "bstocks", "tradfi"] for t in tags)
            if is_tradfi:
                u_asset = p.get("underlying_asset") or {}
                us_tokens.append({
                    "id": p.get("id"),
                    "symbol": p.get("symbol"),
                    "description": p.get("description"),
                    "underlying_name": u_asset.get("name"),
                    "underlying_symbol": u_asset.get("symbol"),
                    "contract_unit_currency": p.get("contract_unit_currency"),
                    "tick_size": p.get("tick_size"),
                    "default_leverage": p.get("default_leverage"),
                    "tags": tags
                })
        return sorted(us_tokens, key=lambda x: x["symbol"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from app.strategies.rsi_ema_breakout import RSIEMABreakoutStrategy
from app.categories import CATEGORY_STOCKS

@router.get("/scan-category")
async def scan_category(
    category: str = Query("ALL", description="ALL, MegaCap, Semis & AI, Growth & Tech"),
    timeframe: str = Query("1d", description="Resolution/Timeframe: 5m, 15m, 30m, 1h, 2h, 4h, 1d")
):
    """Scan stocks across category and evaluate RSI 14 & 20 EMA criteria for chosen timeframe."""
    default_min_gains = {
        "5m": 0.2,
        "15m": 0.3,
        "30m": 0.5,
        "1h": 0.7,
        "2h": 1.0,
        "4h": 1.5,
        "1d": 2.0,
    }
    tf = timeframe.lower().strip()
    min_gain = default_min_gains.get(tf, 2.0)
    strat = RSIEMABreakoutStrategy(params={"min_today_gain_pct": min_gain})
    
    target_stocks = []
    if category == "ALL":
        for cat, stocks in CATEGORY_STOCKS.items():
            for s in stocks:
                target_stocks.append({**s, "category": cat})
    elif category in CATEGORY_STOCKS:
        for s in CATEGORY_STOCKS[category]:
            target_stocks.append({**s, "category": category})
    else:
        for cat, stocks in CATEGORY_STOCKS.items():
            for s in stocks:
                target_stocks.append({**s, "category": cat})

    client = engine.delta_client or DeltaExchangeClient(exchange_type="india")

    async def _scan_single(item):
        sym = item["symbol"]
        try:
            candles = await client.get_candles(symbol=sym, resolution=tf, count=45)
            if not candles or len(candles) < 25:
                return None
            
            signal = strat.generate_signal(candles, current_position=None)
            ind = signal.get("indicators", {})
            action = signal.get("action", "HOLD")
            
            c1 = ind.get("c1_rsi_dip", False)
            c2 = ind.get("c2_rsi_above_50", False)
            c3 = ind.get("c3_ema_cross", False)
            c4 = ind.get("c4_yesterday_cross", False)
            c5 = ind.get("c5_today_gain", False)
            met_count = sum([1 for c in [c1, c2, c3, c4, c5] if c])
            
            return {
                "symbol": sym,
                "name": item["name"],
                "category": item["category"],
                "price": signal.get("price", 0.0),
                "action": action,
                "is_match": action == "BUY",
                "criteria_met_count": met_count,
                "indicators": ind,
                "suggested_sl": signal.get("suggested_sl"),
                "target_1_2": signal.get("target_1_2"),
                "reason": signal.get("reason", ""),
                "timeframe": tf,
                "min_gain_pct": min_gain
            }
        except Exception:
            return None

    raw_results = await asyncio.gather(*[_scan_single(item) for item in target_stocks])
    results = [r for r in raw_results if r is not None]
    results.sort(key=lambda x: (x["is_match"], x["criteria_met_count"]), reverse=True)
    return results


