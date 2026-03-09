import { useMemo, useState } from 'react';
import { useRegulatoryNews } from '../hooks/useRegulatoryNews';
import regulatoryActions from '../data/regulatoryActions.json';

const AGENCY_COLORS = {
  SEC: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DOJ: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CFTC: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  NYAG: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  FTC: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CFPB: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  OFAC: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  NEWS: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

const ITEMS_PER_PAGE = 10;

function NewsItem({ item, formatDate }) {
  return (
    <div className="flex items-start gap-1.5 sm:gap-3 p-1.5 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
      <div className="flex-shrink-0 w-14 sm:w-20 text-[9px] sm:text-xs font-medium text-gray-700 dark:text-gray-200">
        {formatDate(item.date)}
      </div>
      <div className="flex-1 min-w-0 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1 whitespace-nowrap">
          <span className={`inline-flex flex-shrink-0 px-1 sm:px-2 py-0.5 text-[9px] sm:text-xs font-medium rounded ${AGENCY_COLORS[item.agency] || 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'}`}>
            {item.agency}
          </span>
          <span className="text-[10px] sm:text-sm font-medium text-gray-900 dark:text-white">
            {item.target}
          </span>
        </div>
        <p className="text-[9px] sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 sm:line-clamp-none whitespace-nowrap sm:whitespace-normal">
          {item.description}
        </p>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] sm:text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 sm:mt-1 inline-block"
          >
            Source →
          </a>
        )}
      </div>
    </div>
  );
}

export function RegulatoryTimeline() {
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showHistorical, setShowHistorical] = useState(false);

  const { news: liveNews, loading, lastUpdated } = useRegulatoryNews(60000);

  const agencies = useMemo(() => {
    const agencySet = new Set([
      ...regulatoryActions.map(a => a.agency),
      ...liveNews.map(n => n.agency)
    ]);
    return ['all', ...Array.from(agencySet).sort()];
  }, [liveNews]);

  // Live/cached news feed — strictly chronological
  const newsItems = useMemo(() => {
    const items = liveNews.map(item => ({
      date: item.date,
      agency: item.agency,
      target: item.title,
      description: item.description,
      url: item.url,
    }));

    return items
      .filter(item => selectedAgency === 'all' || item.agency === selectedAgency)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [liveNews, selectedAgency]);

  // Historical notable enforcement actions — separate section
  const historicalItems = useMemo(() => {
    return regulatoryActions
      .filter(item => selectedAgency === 'all' || item.agency === selectedAgency)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedAgency]);

  const visibleNews = newsItems.slice(0, visibleCount);
  const hasMoreNews = newsItems.length > visibleCount;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
            Regulatory Actions
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            SEC, DOJ, CFTC enforcement + crypto news
            {lastUpdated && (
              <span className="block sm:inline sm:ml-2 text-xs text-gray-400">
                Updated {formatTime(lastUpdated)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={selectedAgency}
            onChange={(e) => {
              setSelectedAgency(e.target.value);
              setVisibleCount(ITEMS_PER_PAGE);
            }}
            className="text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md px-1 sm:px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {agencies.map(agency => (
              <option key={agency} value={agency}>
                {agency === 'all' ? 'All' : agency}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && newsItems.length === 0 && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Fetching latest news...</span>
        </div>
      )}

      {/* Live News Feed */}
      <div className="space-y-2 sm:space-y-3">
        {visibleNews.length === 0 && !loading ? (
          <p className="text-center text-gray-600 dark:text-gray-300 py-6 sm:py-8 text-[10px] sm:text-sm">
            No recent regulatory news found
          </p>
        ) : (
          visibleNews.map((item, index) => (
            <NewsItem key={`${item.url || item.target}-${index}`} item={item} formatDate={formatDate} />
          ))
        )}

        {/* Show More button */}
        {hasMoreNews && (
          <button
            onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
            className="w-full py-2 text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
          >
            Show more ({newsItems.length - visibleCount} remaining)
          </button>
        )}
      </div>

      {/* Notable Historical Actions — collapsible */}
      {historicalItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowHistorical(!showHistorical)}
            className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${showHistorical ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Notable Enforcement Actions ({historicalItems.length})
          </button>
          {showHistorical && (
            <div className="space-y-2 sm:space-y-3">
              {historicalItems.map((item, index) => (
                <NewsItem key={`hist-${item.date}-${index}`} item={item} formatDate={formatDate} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Agency Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          {Object.keys(AGENCY_COLORS).map(agency => (
            <button
              key={agency}
              onClick={() => {
                setSelectedAgency(selectedAgency === agency ? 'all' : agency);
                setVisibleCount(ITEMS_PER_PAGE);
              }}
              className={`inline-flex px-2 py-1 text-xs rounded transition-opacity ${AGENCY_COLORS[agency]} ${
                selectedAgency !== 'all' && selectedAgency !== agency ? 'opacity-50' : ''
              }`}
            >
              {agency}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
