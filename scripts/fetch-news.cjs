#!/usr/bin/env node

/**
 * Regulatory News Fetcher
 *
 * Fetches all RSS sources via rss2json + feed2json, applies the same
 * crypto/regulation keyword filters as the client hook, then merges into
 * src/data/recentNews.json (deduped by url/title, pruned to 60 days).
 *
 * Run daily via GitHub Actions so the JSON accumulates a history that
 * RSS feeds alone can't provide. Usage: node scripts/fetch-news.cjs
 */

const fs = require('fs');
const path = require('path');

const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';
const FEED2JSON_API = 'https://feed2json.org/convert?url=';
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'recentNews.json');
const MAX_AGE_DAYS = 60;

const NEWS_SOURCES = [
  { name: 'SEC Press Releases', url: 'https://www.sec.gov/news/pressreleases.rss', agency: 'SEC', filterCrypto: true },
  { name: 'Cointelegraph Regulation', url: 'https://cointelegraph.com/rss/tag/regulation', agency: 'NEWS', filterRegulation: true },
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', agency: 'NEWS', filterRegulation: true },
  { name: 'Decrypt', url: 'https://decrypt.co/feed', agency: 'NEWS', filterRegulation: true },
  { name: 'The Block', url: 'https://www.theblock.co/rss.xml', agency: 'NEWS', filterRegulation: true },
  { name: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/feed', agency: 'NEWS', filterRegulation: true },
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', agency: 'NEWS', filterRegulation: true },
  { name: 'CryptoSlate', url: 'https://cryptoslate.com/feed/', agency: 'NEWS', filterRegulation: true },
  { name: 'Bitcoin.com News', url: 'https://news.bitcoin.com/feed/', agency: 'NEWS', filterRegulation: true },
];

const CRYPTO_KEYWORDS = [
  'crypto', 'bitcoin', 'digital asset', 'virtual currency', 'blockchain',
  'coinbase', 'binance', 'kraken', 'gemini', 'ftx', 'celsius', 'voyager',
  'defi', 'nft', 'stablecoin', 'crypto exchange', 'digital token',
  'crypto trading', 'crypto asset', 'virtual asset', 'web3',
  'cryptocurrency', 'ethereum', 'ripple', 'tether', 'usdc',
  'solana', 'cardano', 'dogecoin',
];

const REGULATION_KEYWORDS = [
  'sec', 'cftc', 'doj', 'fbi', 'treasury', 'regulation', 'regulatory',
  'lawsuit', 'enforcement', 'fine', 'penalty', 'charged', 'indicted',
  'settlement', 'court', 'judge', 'ruling', 'ban', 'crackdown',
  'investigation', 'subpoena', 'compliance', 'license', 'approved',
  'senator', 'congress', 'bill', 'law', 'legislation', 'hearing',
];

const matchesAny = (text, keywords) => {
  const t = text.toLowerCase();
  return keywords.some((k) => t.includes(k));
};

async function fetchProxy(proxyUrl, source) {
  try {
    const res = await fetch(proxyUrl + encodeURIComponent(source.url));
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.items || [];
    return items
      .filter((item) => {
        const title = item.title || '';
        const desc = item.description || item.content || '';
        const blob = `${title} ${desc}`;
        if (source.filterCrypto && !matchesAny(blob, CRYPTO_KEYWORDS)) return false;
        if (source.filterRegulation && !matchesAny(blob, REGULATION_KEYWORDS)) return false;
        return true;
      })
      .map((item) => ({
        title: item.title,
        description:
          (item.description || item.content || '').replace(/<[^>]*>/g, '').slice(0, 200) + '...',
        date: item.pubDate || item.date_published,
        url: item.link || item.url,
        agency: source.agency,
        source: source.name,
      }))
      .filter((item) => item.date && !Number.isNaN(new Date(item.date).getTime()));
  } catch {
    return [];
  }
}

function loadExisting() {
  try {
    const raw = fs.readFileSync(OUTPUT_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeAndPrune(existing, incoming) {
  const seen = new Map();
  for (const item of incoming) seen.set(item.url || item.title, item);
  for (const item of existing) {
    const key = item.url || item.title;
    if (!seen.has(key)) seen.set(key, item);
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
  return [...seen.values()]
    .filter((item) => new Date(item.date) >= cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function main() {
  console.log(`Fetching ${NEWS_SOURCES.length} sources via rss2json + feed2json...`);
  const fresh = [];
  for (const source of NEWS_SOURCES) {
    const [a, b] = await Promise.all([
      fetchProxy(RSS2JSON_API, source),
      fetchProxy(FEED2JSON_API, source),
    ]);
    console.log(`  ${source.name}: rss2json=${a.length}, feed2json=${b.length}`);
    fresh.push(...a, ...b);
  }

  const existing = loadExisting();
  const merged = mergeAndPrune(existing, fresh);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2) + '\n');

  const dates = merged.map((i) => new Date(i.date).toISOString().slice(0, 10));
  const uniqueDays = new Set(dates).size;
  console.log(`\nWrote ${merged.length} items (${uniqueDays} unique days) to ${path.relative(process.cwd(), OUTPUT_FILE)}`);
  console.log(`Date range: ${dates[dates.length - 1]} -> ${dates[0]}`);
}

main().catch((err) => {
  console.error('fetch-news failed:', err);
  process.exit(1);
});
