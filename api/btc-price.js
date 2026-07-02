// Sources in priority order. CoinCap (sunset) and Binance (HTTP 451 from US) were
// removed — the rest are reliable and return real spot prices.
const SOURCES = [
  {
    name: 'coinbase',
    url: 'https://api.coinbase.com/v2/prices/BTC-USD/spot',
    parse: (data) => ({
      price: Math.round(parseFloat(data.data.amount)),
      change24h: null,
    }),
  },
  {
    name: 'kraken',
    url: 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD',
    parse: (data) => {
      if (data.error?.length > 0) throw new Error(data.error[0]);
      const pair = Object.keys(data.result)[0];
      return {
        price: Math.round(parseFloat(data.result[pair].c[0])),
        change24h: null,
      };
    },
  },
  {
    name: 'coingecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
    parse: (data) => ({
      price: Math.round(data.bitcoin.usd),
      change24h: data.bitcoin.usd_24h_change ?? null,
    }),
  },
  {
    name: 'blockchain.info',
    url: 'https://blockchain.info/ticker',
    parse: (data) => ({
      price: Math.round(data.USD.last),
      change24h: null,
    }),
  },
];

let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 60_000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return res.json(cache.data);
  }

  for (const source of SOURCES) {
    try {
      const resp = await fetch(source.url, {
        signal: AbortSignal.timeout(4000),
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) continue;
      const raw = await resp.json();
      const parsed = source.parse(raw);
      if (!parsed.price || parsed.price < 100) continue;

      const result = {
        price: parsed.price,
        change24h: parsed.change24h,
        source: source.name,
        timestamp: Date.now(),
      };
      cache = { data: result, timestamp: Date.now() };
      return res.json(result);
    } catch {
      continue;
    }
  }

  return res.status(502).json({ error: 'All price sources failed' });
}
