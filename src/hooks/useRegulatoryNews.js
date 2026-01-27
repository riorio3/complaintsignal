import { useState, useEffect, useCallback } from 'react';

// RSS-to-JSON proxy (free, no auth)
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

// News sources
const NEWS_SOURCES = [
  {
    name: 'SEC Press Releases',
    url: 'https://www.sec.gov/news/pressreleases.rss',
    agency: 'SEC',
  },
  {
    name: 'CFTC Press Releases',
    url: 'https://www.cftc.gov/rss/pressreleasesfeed.xml',
    agency: 'CFTC',
  },
  {
    name: 'DOJ Press Releases',
    url: 'https://www.justice.gov/feeds/opa/justice-news.xml',
    agency: 'DOJ',
  },
];

// Keywords to filter for crypto-related news
const CRYPTO_KEYWORDS = [
  'crypto', 'bitcoin', 'digital asset', 'virtual currency', 'blockchain',
  'coinbase', 'binance', 'kraken', 'gemini', 'ftx', 'celsius', 'voyager',
  'defi', 'nft', 'token', 'stablecoin', 'exchange', 'trading platform'
];

function isCryptoRelated(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  return CRYPTO_KEYWORDS.some(keyword => text.includes(keyword));
}

export function useRegulatoryNews(refreshInterval = 60000) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchNews = useCallback(async () => {
    try {
      const allNews = [];

      // Fetch from all sources in parallel
      const promises = NEWS_SOURCES.map(async (source) => {
        try {
          const response = await fetch(`${RSS2JSON_API}${encodeURIComponent(source.url)}`);
          if (!response.ok) return [];

          const data = await response.json();
          if (data.status !== 'ok') return [];

          return (data.items || [])
            .filter(item => isCryptoRelated(item.title || '', item.description || ''))
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
      results.forEach(items => allNews.push(...items));

      // Sort by date (newest first)
      allNews.sort((a, b) => new Date(b.date) - new Date(a.date));

      setNews(allNews.slice(0, 20)); // Keep top 20
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
