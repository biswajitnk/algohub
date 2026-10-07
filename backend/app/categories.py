from typing import Dict, List, Any

CATEGORY_STOCKS: Dict[str, List[Dict[str, str]]] = {
    "MegaCap": [
        {"symbol": "NVDAXUSD", "name": "NVIDIA Corporation"},
        {"symbol": "AMZNXUSD", "name": "Amazon.com Inc."},
        {"symbol": "TSLAXUSD", "name": "Tesla Inc."},
        {"symbol": "AAPLXUSD", "name": "Apple Inc."},
        {"symbol": "METAXUSD", "name": "Meta Platforms"},
        {"symbol": "GOOGLXUSD", "name": "Alphabet Inc."},
    ],
    "Semis & AI": [
        {"symbol": "AMDBUSD", "name": "Advanced Micro Devices"},
        {"symbol": "ARMBUSD", "name": "ARM Holdings"},
        {"symbol": "INTCBUSD", "name": "Intel Corporation"},
        {"symbol": "MUBUSD", "name": "Micron Technology"},
        {"symbol": "MRVLBUSD", "name": "Marvell Technology"},
        {"symbol": "TSMBUSD", "name": "Taiwan Semiconductor"},
        {"symbol": "SKHYBUSD", "name": "SK Hynix"},
        {"symbol": "WDCBUSD", "name": "Western Digital"},
        {"symbol": "SNDKBUSD", "name": "SanDisk"},
        {"symbol": "LITEBUSD", "name": "Lumentum Holdings"},
        {"symbol": "NBISBUSD", "name": "Nebius AI Cloud"},
        {"symbol": "CBRSBUSD", "name": "Cerebras Systems"},
    ],
    "Growth & Tech": [
        {"symbol": "PLTRBUSD", "name": "Palantir Technologies"},
        {"symbol": "MSTRBUSD", "name": "MicroStrategy"},
        {"symbol": "COINXUSD", "name": "Coinbase Global"},
        {"symbol": "HOODBUSD", "name": "Robinhood Markets"},
        {"symbol": "CRCLXUSD", "name": "Circle Financial"},
        {"symbol": "RKLBBUSD", "name": "Rocket Lab USA"},
        {"symbol": "SPCXXUSD", "name": "SpaceX Token"},
        {"symbol": "BABABUSD", "name": "Alibaba Group"},
    ],
    "ETFs & Funds": [
        {"symbol": "SPYXUSD", "name": "S&P 500 Index ETF"},
        {"symbol": "QQQXUSD", "name": "Nasdaq 100 Index ETF"},
        {"symbol": "SOXLBUSD", "name": "Direxion Semi Bull 3X ETF"},
        {"symbol": "DRAMBUSD", "name": "Roundhill Memory ETF"},
        {"symbol": "EWYBUSD", "name": "iShares MSCI South Korea ETF"},
    ],
    "Commodities": [
        {"symbol": "OILUSD", "name": "US Oil Fund (USO)"},
        {"symbol": "SLVONUSD", "name": "iShares Silver Trust (SLV)"},
        {"symbol": "PAXGUSD", "name": "PAX Gold Token (Gold)"},
        {"symbol": "XAUTUSD", "name": "Tether Gold Token (Gold)"},
    ]
}

CATEGORY_MAP = {
    "CATEGORY_MEGACAP": "MegaCap",
    "CATEGORY_SEMIS_AI": "Semis & AI",
    "CATEGORY_GROWTH_TECH": "Growth & Tech",
    "CATEGORY_ETFS": "ETFs & Funds",
    "CATEGORY_COMMODITIES": "Commodities",
    "CATEGORY_ALL": "ALL"
}

CATEGORY_LABELS = {
    "CATEGORY_MEGACAP": "MegaCap Tech Basket (6 Stocks)",
    "CATEGORY_SEMIS_AI": "Semis & AI Basket (12 Stocks)",
    "CATEGORY_GROWTH_TECH": "Growth & Tech Basket (8 Stocks)",
    "CATEGORY_ETFS": "ETFs & Funds Basket (5 Tokens)",
    "CATEGORY_COMMODITIES": "Commodities Basket (4 Tokens)",
    "CATEGORY_ALL": "All US Stock Tokens Basket (35 Stocks)"
}

def is_category_symbol(symbol: str) -> bool:
    return symbol.upper().startswith("CATEGORY_")

def get_basket_label(symbol: str) -> str:
    return CATEGORY_LABELS.get(symbol.upper(), symbol.upper())

def get_symbols_for_target(symbol: str) -> List[str]:
    target = symbol.upper()
    if target == "CATEGORY_MEGACAP":
        return [s["symbol"] for s in CATEGORY_STOCKS["MegaCap"]]
    elif target in ["CATEGORY_SEMIS_AI", "CATEGORY_SEMIS"]:
        return [s["symbol"] for s in CATEGORY_STOCKS["Semis & AI"]]
    elif target in ["CATEGORY_GROWTH_TECH", "CATEGORY_GROWTH"]:
        return [s["symbol"] for s in CATEGORY_STOCKS["Growth & Tech"]]
    elif target in ["CATEGORY_ETFS", "CATEGORY_ETF"]:
        return [s["symbol"] for s in CATEGORY_STOCKS["ETFs & Funds"]]
    elif target in ["CATEGORY_COMMODITIES", "CATEGORY_COMMODITY"]:
        return [s["symbol"] for s in CATEGORY_STOCKS["Commodities"]]
    elif target in ["CATEGORY_ALL", "CATEGORY_ALL_STOCKS"]:
        seen = set()
        res = []
        for cat_list in CATEGORY_STOCKS.values():
            for s in cat_list:
                if s["symbol"] not in seen:
                    seen.add(s["symbol"])
                    res.append(s["symbol"])
        return res
    return [target]
