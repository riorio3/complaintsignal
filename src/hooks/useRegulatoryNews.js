import { useState, useEffect, useCallback, useRef } from 'react';
import seedNews from '../data/recentNews.json';

// RSS-to-JSON proxies (free, no auth)
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';
const FEED2JSON_API = 'https://feed2json.org/convert?url=';

const NEWS_CACHE_KEY = 'complaintsignal_news_cache';
const NEWS_CACHE_MAX_AGE_DAYS = 60;

function pruneByAge(items) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NEWS_CACHE_MAX_AGE_DAYS);
  return items.filter((item) => new Date(item.date) >= cutoff);
}

// Seed JSON is committed daily by scripts/fetch-news.cjs (GitHub Action), so
// every visitor — including first-time ones — sees accumulated history that
// live RSS feeds can't provide on their own.
function loadSeedNews() {
  return Array.isArray(seedNews) ? pruneByAge(seedNews) : [];
}

function loadCachedNews() {
  try {
    const cached = localStorage.getItem(NEWS_CACHE_KEY);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    return pruneByAge(parsed);
  } catch {
    return [];
  }
}

function loadInitialNews() {
  return mergeAndDeduplicateNews(loadCachedNews(), loadSeedNews());
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
  {
    name: 'The Block',
    url: 'https://www.theblock.co/rss.xml',
    agency: 'NEWS',
    filterCrypto: false,
    filterRegulation: true,
  },
  {
    name: 'Bitcoin Magazine',
    url: 'https://bitcoinmagazine.com/feed',
    agency: 'NEWS',
    filterCrypto: false,
    filterRegulation: true,
  },
  // Daily-coverage feeds — broader scope, kept regulation-filtered to fill date gaps
  {
    name: 'Cointelegraph',
    url: 'https://cointelegraph.com/rss',
    agency: 'NEWS',
    filterCrypto: false,
    filterRegulation: true,
  },
  {
    name: 'CryptoSlate',
    url: 'https://cryptoslate.com/feed/',
    agency: 'NEWS',
    filterCrypto: false,
    filterRegulation: true,
  },
  {
    name: 'Bitcoin.com News',
    url: 'https://news.bitcoin.com/feed/',
    agency: 'NEWS',
    filterCrypto: false,
    filterRegulation: true,
  },
];

// Keywords to filter for crypto-related news (for SEC)
const CRYPTO_KEYWORDS = [
  'crypto', 'bitcoin', 'digital asset', 'virtual currency', 'blockchain',
  'coinbase', 'binance', 'kraken', 'gemini', 'ftx', 'celsius', 'voyager',
  'defi', 'nft', 'stablecoin', 'crypto exchange', 'digital token',
  'crypto trading', 'crypto asset', 'virtual asset', 'web3',
  'cryptocurrency', 'ethereum', 'ripple', 'tether', 'usdc',
  'solana', 'cardano', 'dogecoin'
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
  const [news, setNews] = useState(() => loadInitialNews());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const cacheRef = useRef(loadInitialNews());

  const fetchNews = useCallback(async () => {
    try {
      const freshNews = [];

      // Fetch from all sources in parallel. Query BOTH proxies and merge —
      // rss2json caps at ~10 items, feed2json often returns 25–60. Using both
      // gives us multi-month depth so daily news populates without gaps.
      const promises = NEWS_SOURCES.map(async (source) => {
        const parseItems = (items) =>
          items
            .filter(item => {
              const title = item.title || '';
              const desc = item.description || item.content || '';
              if (source.filterCrypto && !isCryptoRelated(title, desc)) return false;
              if (source.filterRegulation && !isRegulationRelated(title, desc)) return false;
              return true;
            })
            .map(item => ({
              title: item.title,
              description: (item.description || item.content || '').replace(/<[^>]*>/g, '').slice(0, 200) + '...',
              date: item.pubDate || item.date_published,
              url: item.link || item.url,
              agency: source.agency,
              source: source.name,
            }));

        const fetchFromProxy = async (proxyUrl) => {
          try {
            const response = await fetch(`${proxyUrl}${encodeURIComponent(source.url)}`);
            if (!response.ok) return [];
            const data = await response.json();
            const items = data.items || [];
            if (items.length === 0) return [];
            return parseItems(items);
          } catch {
            return [];
          }
        };

        const [rss2jsonItems, feed2jsonItems] = await Promise.all([
          fetchFromProxy(RSS2JSON_API),
          fetchFromProxy(FEED2JSON_API),
        ]);
        return [...rss2jsonItems, ...feed2jsonItems];
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
