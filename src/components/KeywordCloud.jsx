import { useMemo } from 'react';
import { extractKeywords, extractPhrases } from '../utils/textAnalysis';

export function KeywordCloud({ data }) {
  const keywords = useMemo(() => extractKeywords(data, 25), [data]);
  const phrases = useMemo(() => extractPhrases(data, 10), [data]);

  // Find max value for scaling
  const maxValue = keywords.length > 0 ? keywords[0].value : 1;

  // Scale font size based on frequency
  const getFontSize = (value) => {
    const scale = value / maxValue;
    return Math.max(12, Math.min(28, 12 + scale * 16));
  };

  // Get color based on frequency
  const getColor = (value) => {
    const scale = value / maxValue;
    if (scale > 0.7) return 'text-blue-700 dark:text-blue-400';
    if (scale > 0.4) return 'text-blue-600 dark:text-blue-500';
    if (scale > 0.2) return 'text-blue-500 dark:text-blue-600';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (keywords.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Common Keywords
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No narrative data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Common Keywords
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Extracted from complaint narratives
      </p>

      {/* Word Cloud */}
      <div className="flex flex-wrap gap-2 justify-center py-4 min-h-[150px]">
        {keywords.map(({ text, value }) => (
          <span
            key={text}
            className={`${getColor(value)} hover:underline cursor-default transition-colors`}
            style={{ fontSize: `${getFontSize(value)}px` }}
            title={`${value.toLocaleString()} occurrences`}
          >
            {text}
          </span>
        ))}
      </div>

      {/* Top Phrases */}
      {phrases.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Common Phrases:
          </p>
          <div className="flex flex-wrap gap-2">
            {phrases.slice(0, 8).map(({ text, value }) => (
              <span
                key={text}
                className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
              >
                "{text}" ({value})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
