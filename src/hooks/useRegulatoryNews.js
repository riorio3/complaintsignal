import { useState, useEffect, useCallback, useRef } from 'react';

// RSS-to-JSON proxy (free, no auth)
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

const NEWS_CACHE_KEY = 'complaintsignal_news_cache';
const NEWS_CACHE_MAX_AGE_DAYS = 30;

function loadCachedNews() {
  try {
    const cached = localStorage.getItem(NEWS_CACHE_KEY);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    // Prune items older than max age
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - NEWS_CACHE_MAX_AGE_DAYS);
    return parsed.filter(item => new Date(item.date) >= cutoff);
  } catch {
    return [];
  }
}

function saveCachedNews(items) {
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

function mergeAndDeduplicateNews(existing, incoming) {
  const seen = new Map();
  // Incoming (fresh) items take priority
  for (const item of incoming) {
    const key = item.url || item.title;
    seen.set(key, item);
  }
  for (const item of existing) {
    const key = item.url || item.title;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  const merged = Array.from(seen.values());
  merged.sort((a, b) => new Date(b.date) - new Date(a.date));
  return merged;
}

// News sources - mix of official and crypto news
const NEWS_SOURCES = [
  // Official government sources
  {
    name: 'SEC Press Releases',
    url: 'https://www.sec.gov/news/pressreleases.rss',
    agency: 'SEC',
    filterCrypto: true, // Only show crypto-related
  },
  // Crypto news - regulation focused
  {
    name: 'Cointelegraph Regulation',
    url: 'https://cointelegraph.com/rss/tag/regulation',
    agency: 'NEWS',
    filterCrypto: false, // Already crypto-focused
    filterRegulation: true, // Filter for regulatory news
  },
  {
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    agency: 'NEWS',
    filterCrypto: false,
    filterRegulation: true,
  },
  {
    name: 'Decrypt',
    url: 'https://decrypt.co/feed',
    agency: 'NEWS',
    filterCrypto: false,
    filterRegulation: true,
  },
];

// Keywords to filter for crypto-related news (for SEC)
const CRYPTO_KEYWORDS = [
  'crypto', 'bitcoin', 'digital asset', 'virtual currency', 'blockchain',
  'coinbase', 'binance', 'kraken', 'gemini', 'ftx', 'celsius', 'voyager',
  'defi', 'nft', 'token', 'stablecoin', 'exchange', 'trading platform',
  'cryptocurrency', 'ethereum', 'ripple', 'tether', 'usdc'
];

// Keywords to filter for regulatory news (for crypto news sources)
const REGULATION_KEYWORDS = [
  'sec', 'cftc', 'doj', 'fbi', 'treasury', 'regulation', 'regulatory',
  'lawsuit', 'enforcement', 'fine', 'penalty', 'charged', 'indicted',
  'settlement', 'court', 'judge', 'ruling', 'ban', 'crackdown',
  'investigation', 'subpoena', 'compliance', 'license', 'approved',
  'senator', 'congress', 'bill', 'law', 'legislation', 'hearing'
];

function isCryptoRelated(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  return CRYPTO_KEYWORDS.some(keyword => text.includes(keyword));
}

function isRegulationRelated(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  return REGULATION_KEYWORDS.some(keyword => text.includes(keyword));
}

export function useRegulatoryNews(refreshInterval = 60000) {
  const [news, setNews] = useState(() => loadCachedNews());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const cacheRef = useRef(loadCachedNews());

  const fetchNews = useCallback(async () => {
    try {
      const freshNews = [];

      // Fetch from all sources in parallel
      const promises = NEWS_SOURCES.map(async (source) => {
        try {
          const response = await fetch(`${RSS2JSON_API}${encodeURIComponent(source.url)}`);
          if (!response.ok) return [];

          const data = await response.json();
          if (data.status !== 'ok') return [];

          return (data.items || [])
            .filter(item => {
              const title = item.title || '';
              const desc = item.description || '';
              if (source.filterCrypto && !isCryptoRelated(title, desc)) return false;
              if (source.filterRegulation && !isRegulationRelated(title, desc)) return false;
              return true;
            })
            .map(item => ({
              title: item.title,
              description: item.description?.replace(/<[^>]*>/g, '').slice(0, 200) + '...',
              date: item.pubDate,
              url: item.link,
              agency: source.agency,
              source: source.name,
            }));
        } catch (err) {
          return [];
        }
      });

      const results = await Promise.all(promises);
      results.forEach(items => freshNews.push(...items));

      // Merge fresh items with cached items, deduplicate by URL/title
      const merged = mergeAndDeduplicateNews(cacheRef.current, freshNews);
      cacheRef.current = merged;
      saveCachedNews(merged);

      setNews(merged);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchNews, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchNews, refreshInterval]);

  return { news, loading, error, lastUpdated, refetch: fetchNews };
}
