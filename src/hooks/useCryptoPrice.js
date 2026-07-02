import { useState, useEffect, useCallback, useRef } from 'react';

// Server-side proxy (no CORS issues — preferred source in production)
const OWN_API = '/api/btc-price';

// Direct client-side sources — all verified CORS-enabled (access-control-allow-origin: *).
// NOTE: CoinCap (api.coincap.io) was sunset and Binance returns HTTP 451 from US IPs,
// so both were removed. Coinbase, Kraken, and CoinGecko all work from the browser.
const COINBASE_API = 'https://api.coinbase.com/v2/prices/BTC-USD/spot';
const KRAKEN_API = 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// CoinGecko free tier rejects historical ranges over 365 days (error 10012),
// which is why the chart's live history silently failed before. Cap at 365.
const MAX_HISTORY_DAYS = 365;

// Cache configuration
const CACHE_KEY = 'btc_price_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_CACHE_TTL = 60 * 60 * 1000; // 1 hour — use stale cache before falling back to static

// Reduced timeout for faster failure detection
const REQUEST_TIMEOUT = 3000;

// Fallback static data in case all APIs fail
const FALLBACK_PRICES = {
  // 2019 - Bear Market Recovery
  '2019-01': 3600, '2019-02': 3800, '2019-03': 4000, '2019-04': 5200,
  '2019-05': 7500, '2019-06': 10800, '2019-07': 10500, '2019-08': 10200,
  '2019-09': 8500, '2019-10': 8300, '2019-11': 7500, '2019-12': 7200,
  // 2020 - COVID Crash & Recovery
  '2020-01': 8500, '2020-02': 9500, '2020-03': 6500, '2020-04': 7500,
  '2020-05': 9000, '2020-06': 9300, '2020-07': 9800, '2020-08': 11500,
  '2020-09': 10700, '2020-10': 13000, '2020-11': 17500, '2020-12': 24000,
  // 2021 - Bull Run & ATH
  '2021-01': 34000, '2021-02': 46000, '2021-03': 55000, '2021-04': 57000,
  '2021-05': 40000, '2021-06': 35000, '2021-07': 33000, '2021-08': 44000,
  '2021-09': 45000, '2021-10': 55000, '2021-11': 60000, '2021-12': 48000,
  // 2022 - Crypto Winter
  '2022-01': 41500, '2022-02': 39500, '2022-03': 44000, '2022-04': 40000,
  '2022-05': 31500, '2022-06': 21500, '2022-07': 22500, '2022-08': 21500,
  '2022-09': 19500, '2022-10': 20500, '2022-11': 17000, '2022-12': 16800,
  // 2023 - Recovery Year
  '2023-01': 21500, '2023-02': 23500, '2023-03': 28000, '2023-04': 29500,
  '2023-05': 27500, '2023-06': 30500, '2023-07': 29500, '2023-08': 26000,
  '2023-09': 27000, '2023-10': 34500, '2023-11': 37500, '2023-12': 42500,
  // 2024 - ETF Approval & Bull Run
  '2024-01': 43000, '2024-02': 52000, '2024-03': 70000, '2024-04': 65000,
  '2024-05': 67000, '2024-06': 62000, '2024-07': 66000, '2024-08': 59000,
  '2024-09': 63000, '2024-10': 68000, '2024-11': 90000, '2024-12': 97000,
  // 2025 - Jan–May approximate (pre live-window); Jun onward are real CoinGecko monthly averages
  '2025-01': 102000, '2025-02': 96000, '2025-03': 84000, '2025-04': 85000,
  '2025-05': 104000, '2025-06': 107448, '2025-07': 115068, '2025-08': 115083,
  '2025-09': 112962, '2025-10': 114210, '2025-11': 96899, '2025-12': 89006,
  // 2026 - Real CoinGecko monthly averages (safety net; live fetch overrides these)
  '2026-01': 90751, '2026-02': 69251, '2026-03': 69444, '2026-04': 73474,
  '2026-05': 78067, '2026-06': 63895, '2026-07': 61450,
};

// Pre-computed fallback array (optimization: avoid repeated conversion)
const FALLBACK_ARRAY = Object.entries(FALLBACK_PRICES)
  .map(([month, price]) => ({ month, price }))
  .sort((a, b) => a.month.localeCompare(b.month));

// Fetch from our own Vercel serverless API (server-side, no CORS)
async function fetchFromOwnAPI(timeout = REQUEST_TIMEOUT) {
  const response = await fetch(OWN_API, {
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error('Own API error');
  const data = await response.json();
  if (!data.price) throw new Error('No price in response');
  return {
    price: data.price,
    change24h: data.change24h,
    source: data.source || 'api',
  };
}

// Client-side fallbacks (in case serverless function is down). All CORS-enabled.
async function fetchFromCoinbase(timeout = REQUEST_TIMEOUT) {
  const response = await fetch(COINBASE_API, {
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error('Coinbase API error');
  const data = await response.json();
  return {
    price: Math.round(parseFloat(data.data.amount)),
    change24h: null,
    source: 'coinbase',
  };
}

async function fetchFromKraken(timeout = REQUEST_TIMEOUT) {
  const response = await fetch(KRAKEN_API, {
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error('Kraken API error');
  const data = await response.json();
  if (data.error?.length > 0) throw new Error(data.error[0]);
  const pair = Object.keys(data.result)[0];
  return {
    price: Math.round(parseFloat(data.result[pair].c[0])),
    change24h: null,
    source: 'kraken',
  };
}

async function fetchFromCoinGeckoSimple(timeout = REQUEST_TIMEOUT) {
  const url = `${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`;
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error('CoinGecko API error');
  const data = await response.json();
  if (!data.bitcoin?.usd) throw new Error('No price in CoinGecko response');
  return {
    price: Math.round(data.bitcoin.usd),
    change24h: data.bitcoin.usd_24h_change ?? null,
    source: 'coingecko',
  };
}

// Load cached data from localStorage
// fresh=true: only return if within TTL. fresh=false: return if within stale TTL.
function loadFromCache(fresh = true) {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const maxAge = fresh ? CACHE_TTL : STALE_CACHE_TTL;
      if (age < maxAge) {
        return data;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

// Save data to localStorage cache
function saveToCache(priceData, currentPrice) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: { priceData, currentPrice },
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore cache errors (quota exceeded, etc.)
  }
}

export function useCryptoPrice(coin = 'bitcoin', days = 2555, refreshInterval = 300000) {
  const [priceData, setPriceData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [dataSource, setDataSource] = useState(null);
  const isFetching = useRef(false);
  const retryTimeoutRef = useRef(null);

  // Load cached data on mount (instant display)
  useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      setPriceData(cached.priceData);
      setCurrentPrice(cached.currentPrice);
      setLoading(false);
      setIsLive(true);
      setDataSource('cache');
    }
  }, []);

  // Fetch current price: own API first (server-side, reliable), then client-side fallbacks.
  const fetchCurrentPrice = useCallback(async () => {
    // Phase 1: Our own serverless API (no CORS, fastest path)
    try {
      const result = await fetchFromOwnAPI();
      if (result?.price) return result;
    } catch {
      // Own API failed, try client-side sources
    }

    // Phase 2: Race client-side APIs as fallback (all CORS-enabled & US-accessible)
    try {
      const result = await Promise.any([
        fetchFromCoinbase().then(r => r?.price ? r : Promise.reject('no price')),
        fetchFromKraken().then(r => r?.price ? r : Promise.reject('no price')),
        fetchFromCoinGeckoSimple().then(r => r?.price ? r : Promise.reject('no price')),
      ]);
      if (result?.price) return result;
    } catch {
      // All client-side sources failed
    }
    return null;
  }, []);

  // Fetch historical data from CoinGecko (CORS-enabled). Free tier caps history at
  // 365 days — requesting more returns an error with zero prices, so we clamp.
  const fetchHistoricalData = useCallback(async () => {
    const cappedDays = Math.min(days, MAX_HISTORY_DAYS);
    const apiUrl = `${COINGECKO_API}/coins/${coin}/market_chart?vs_currency=usd&days=${cappedDays}&interval=daily`;
    try {
      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error('CoinGecko historical error');
      const data = await response.json();
      if (data.prices?.length > 0) return data;
    } catch {
      // CoinGecko failed
    }
    return null;
  }, [coin, days]);

  const fetchPriceData = useCallback(async () => {
    // Prevent duplicate requests
    if (isFetching.current) return;
    isFetching.current = true;

    let gotLivePrice = false;
    let gotHistoricalData = false;

    try {
      // PARALLEL: Fetch both current price and historical data simultaneously
      const [priceResult, historyResult] = await Promise.allSettled([
        fetchCurrentPrice(),
        fetchHistoricalData(),
      ]);

      // Process current price result
      if (priceResult.status === 'fulfilled' && priceResult.value) {
        setCurrentPrice(priceResult.value);
        setIsLive(true);
        setDataSource(priceResult.value.source || 'api');
        gotLivePrice = true;
      }

      // Process historical data result
      if (historyResult.status === 'fulfilled' && historyResult.value) {
        const historyData = historyResult.value;

        // Process price data into monthly averages
        const monthlyPrices = {};
        historyData.prices.forEach(([timestamp, price]) => {
          const date = new Date(timestamp);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyPrices[monthKey]) {
            monthlyPrices[monthKey] = { sum: 0, count: 0 };
          }
          monthlyPrices[monthKey].sum += price;
          monthlyPrices[monthKey].count++;
        });

        // Merge real recent months (last ≤365 days) onto the full static history.
        // CoinGecko free only returns ~12 months, so static fills 2019→last year while
        // the live fetch keeps recent months accurate and self-updating.
        const merged = { ...FALLBACK_PRICES };
        Object.entries(monthlyPrices).forEach(([month, data]) => {
          merged[month] = Math.round(data.sum / data.count);
        });
        const processed = Object.entries(merged)
          .map(([month, price]) => ({ month, price }))
          .sort((a, b) => a.month.localeCompare(b.month));

        if (processed.length > 0) {
          setPriceData(processed);
          gotHistoricalData = true;

          // Use historical latest price as fallback if live price failed
          if (!gotLivePrice) {
            const latestPrice = historyData.prices[historyData.prices.length - 1];
            if (latestPrice) {
              setCurrentPrice({
                price: Math.round(latestPrice[1]),
                change24h: null,
              });
            }
            setIsLive(true);
          }

          // Cache successful data
          saveToCache(processed, priceResult.value || { price: Math.round(historyData.prices[historyData.prices.length - 1][1]), change24h: null });
        }
      }

      // If historical data failed, try stale cache before static fallback
      if (!gotHistoricalData) {
        const staleCache = loadFromCache(false);
        if (staleCache?.priceData?.length > 0) {
          setPriceData(staleCache.priceData);
          if (!gotLivePrice && staleCache.currentPrice) {
            setCurrentPrice(staleCache.currentPrice);
            setDataSource('cache');
          }
        } else {
          setPriceData(FALLBACK_ARRAY);
          if (!gotLivePrice) {
            const latestMonth = Object.keys(FALLBACK_PRICES).sort().pop();
            setCurrentPrice({
              price: FALLBACK_PRICES[latestMonth],
              change24h: null,
            });
            setDataSource('fallback');
          }
        }
      }

      setIsLive(gotLivePrice || gotHistoricalData);
      setLastUpdated(new Date());
      setError(null);

    } catch {
      // Complete failure - try stale cache, then static fallback
      const staleCache = loadFromCache(false);
      if (staleCache?.priceData?.length > 0) {
        setPriceData(staleCache.priceData);
        setCurrentPrice(staleCache.currentPrice || { price: null, change24h: null });
        setDataSource('cache');
      } else {
        setPriceData(FALLBACK_ARRAY);
        const latestMonth = Object.keys(FALLBACK_PRICES).sort().pop();
        setCurrentPrice({
          price: FALLBACK_PRICES[latestMonth],
          change24h: null,
        });
        setDataSource('fallback');
      }
      setIsLive(false);
      setLastUpdated(new Date());
      setError(null);
    } finally {
      setLoading(false);
      isFetching.current = false;

      // If we didn't get live data, schedule a fast retry in 30s
      // (instead of waiting the full 5-min interval)
      if (!gotLivePrice && !gotHistoricalData) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          if (!isFetching.current) fetchPriceData();
        }, 30000);
      }
    }
  }, [fetchCurrentPrice, fetchHistoricalData]);

  // Initial fetch on mount
  useEffect(() => {
    fetchPriceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh (default 5 minutes)
  useEffect(() => {
    const interval = setInterval(fetchPriceData, refreshInterval);
    return () => {
      clearInterval(interval);
      clearTimeout(retryTimeoutRef.current);
    };
  }, [fetchPriceData, refreshInterval]);

  return { priceData, currentPrice, loading, error, lastUpdated, isLive, dataSource, refetch: fetchPriceData };
}
