import { useState, useEffect, useCallback, useRef } from 'react';

// Multiple CORS proxies - race them for fastest response
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Alternative APIs (no CORS issues, more reliable)
const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';
const COINCAP_API = 'https://api.coincap.io/v2/assets/bitcoin';
const BLOCKCHAIN_INFO_API = 'https://blockchain.info/ticker';
const KRAKEN_API = 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD';
const COINBASE_API = 'https://api.coinbase.com/v2/prices/BTC-USD/spot';

// Cache configuration
const CACHE_KEY = 'btc_price_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_CACHE_TTL = 60 * 60 * 1000; // 1 hour — use stale cache before falling back to static

// Reduced timeout for faster failure detection
const REQUEST_TIMEOUT = 3000;

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 1500; // ms between retries

// Fallback static data in case API fails (2019 through Feb 2026)
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
  // 2025 - Post-Election Rally & Correction
  '2025-01': 102000, '2025-02': 96000, '2025-03': 82000, '2025-04': 84000,
  '2025-05': 103000, '2025-06': 106000, '2025-07': 97000, '2025-08': 59000,
  '2025-09': 63000, '2025-10': 69000, '2025-11': 96000, '2025-12': 94000,
  // 2026 - Current Year (updated with accurate prices)
  '2026-01': 95000, // January average
  '2026-02': 78000, // Current price ~$78k
};

// Pre-computed fallback array (optimization: avoid repeated conversion)
const FALLBACK_ARRAY = Object.entries(FALLBACK_PRICES)
  .map(([month, price]) => ({ month, price }))
  .sort((a, b) => a.month.localeCompare(b.month));

// Race multiple proxies - first successful response wins
async function fetchWithProxyRace(url, timeout = REQUEST_TIMEOUT) {
  const fetchPromises = CORS_PROXIES.map(async (proxy) => {
    const proxyUrl = proxy.includes('?')
      ? `${proxy}${encodeURIComponent(url)}`
      : `${proxy}${url}`;

    const response = await fetch(proxyUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) throw new Error('Response not ok');
    return response.json();
  });

  // Promise.any returns first fulfilled promise
  return Promise.any(fetchPromises);
}

// Fetch current price from Binance (no CORS, very reliable)
async function fetchFromBinance(timeout = REQUEST_TIMEOUT) {
  const response = await fetch(BINANCE_API, {
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error('Binance API error');
  const data = await response.json();
  return {
    price: Math.round(parseFloat(data.price)),
    change24h: null, // Binance ticker doesn't include 24h change
    source: 'binance',
  };
}

// Fetch current price from CoinCap (no CORS, generous limits)
async function fetchFromCoinCap(timeout = REQUEST_TIMEOUT) {
  const response = await fetch(COINCAP_API, {
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error('CoinCap API error');
  const data = await response.json();
  return {
    price: Math.round(parseFloat(data.data.priceUsd)),
    change24h: parseFloat(data.data.changePercent24Hr),
    source: 'coincap',
  };
}

// Fetch current price from Blockchain.info (no CORS, no key needed)
async function fetchFromBlockchainInfo(timeout = REQUEST_TIMEOUT) {
  const response = await fetch(BLOCKCHAIN_INFO_API, {
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error('Blockchain.info API error');
  const data = await response.json();
  return {
    price: Math.round(data.USD.last),
    change24h: null,
    source: 'blockchain.info',
  };
}

// Fetch current price from Kraken (no CORS, no key needed)
async function fetchFromKraken(timeout = REQUEST_TIMEOUT) {
  const response = await fetch(KRAKEN_API, {
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error('Kraken API error');
  const data = await response.json();
  if (data.error && data.error.length > 0) throw new Error(data.error[0]);
  const pair = Object.keys(data.result)[0];
  return {
    price: Math.round(parseFloat(data.result[pair].c[0])),
    change24h: null,
    source: 'kraken',
  };
}

// Fetch current price from Coinbase (no CORS, no key needed)
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

// Retry helper — retries a function up to maxRetries times with delay
async function withRetry(fn, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (result?.price) return result;
    } catch (err) {
      lastError = err;
    }
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error('All retry attempts failed');
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
  const [dataSource, setDataSource] = useState(null); // 'binance', 'coincap', 'coingecko', 'coinbase', 'kraken', 'blockchain.info', 'cache', or 'fallback'
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

  // Fetch current price with aggressive multi-source fallback chain.
  // Strategy: race the two fastest sources first, then cascade through
  // remaining sources one at a time. Each source gets retry attempts.
  const fetchCurrentPrice = useCallback(async () => {
    // Phase 1: Race CoinCap + Binance (both fast, no CORS)
    try {
      const result = await Promise.any([
        fetchFromCoinCap().then(r => r?.price ? r : Promise.reject('no price')),
        fetchFromBinance().then(r => r?.price ? r : Promise.reject('no price')),
      ]);
      if (result?.price) return result;
    } catch {
      // Both failed, continue to phase 2
    }

    // Phase 2: Try remaining sources sequentially with retries
    const fallbackSources = [
      fetchFromCoinbase,
      fetchFromKraken,
      fetchFromBlockchainInfo,
    ];

    for (const fetchFn of fallbackSources) {
      try {
        const result = await withRetry(fetchFn, 1, 1000);
        if (result?.price) return result;
      } catch {
        // This source failed, try next
      }
    }

    // Phase 3: CoinGecko with CORS proxies as last resort
    const priceUrl = `${COINGECKO_API}/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true`;
    try {
      const data = await fetchWithProxyRace(priceUrl);
      if (data[coin]) {
        return {
          price: Math.round(data[coin].usd),
          change24h: data[coin].usd_24h_change,
          source: 'coingecko',
        };
      }
    } catch {
      // All sources failed
    }
    return null;
  }, [coin]);

  // Fetch historical data (races all proxies)
  const fetchHistoricalData = useCallback(async () => {
    const apiUrl = `${COINGECKO_API}/coins/${coin}/market_chart?vs_currency=usd&days=${days}&interval=daily`;

    try {
      const data = await fetchWithProxyRace(apiUrl, 5000); // Slightly longer for historical
      if (data.prices && data.prices.length > 0) {
        return data;
      }
    } catch {
      // All proxies failed
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

        // Convert to array format
        const processed = Object.entries(monthlyPrices)
          .map(([month, data]) => ({
            month,
            price: Math.round(data.sum / data.count),
          }))
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

    } catch (err) {
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

  // Initial fetch (skip if we have valid cache)
  useEffect(() => {
    const cached = loadFromCache();
    if (!cached) {
      fetchPriceData();
    } else {
      // Still fetch in background to update cache
      fetchPriceData();
    }
  }, [fetchPriceData]);

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
