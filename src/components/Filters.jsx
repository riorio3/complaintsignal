import { useState } from 'react';
import { CalendarPicker } from './CalendarPicker';

const DATE_RANGES = [
  { label: 'All Time', value: 'all' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
  { label: '2Y', value: '2y' },
  { label: 'Custom', value: 'custom' },
];

function getDateFrom(range) {
  if (range === 'all') return undefined;
  const now = new Date();
  const months = range === '6m' ? 6 : range === '1y' ? 12 : 24;
  now.setMonth(now.getMonth() - months);
  return now.toISOString().slice(0, 10);
}

export function Filters({ filters, setFilters, companies, issues }) {
  const [rangeMode, setRangeMode] = useState('all');

  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRange = (range) => {
    setRangeMode(range);
    if (range === 'custom') return;
    const dateFrom = getDateFrom(range);
    setFilters(prev => ({ ...prev, dateFrom, dateTo: undefined }));
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'all').length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 sm:mb-6">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <select
          value={filters.company || 'all'}
          onChange={e => handleChange('company', e.target.value)}
          className="flex-1 min-w-[140px] rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs sm:text-sm py-1.5 px-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Companies</option>
          {companies.map(company => (
            <option key={company} value={company}>
              {company.length > 30 ? `${company.substring(0, 30)}...` : company}
            </option>
          ))}
        </select>

        <select
          value={filters.issue || 'all'}
          onChange={e => handleChange('issue', e.target.value)}
          className="flex-1 min-w-[140px] rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs sm:text-sm py-1.5 px-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Issues</option>
          {issues.map(issue => (
            <option key={issue} value={issue}>
              {issue.length > 30 ? `${issue.substring(0, 30)}...` : issue}
            </option>
          ))}
        </select>

        <div className="flex items-center rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
          {DATE_RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => handleRange(r.value)}
              className={`px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                rangeMode === r.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {rangeMode === 'custom' && (
          <>
            <CalendarPicker
              label=""
              placeholder="From"
              value={filters.dateFrom || ''}
              onChange={v => handleChange('dateFrom', v || undefined)}
            />
            <CalendarPicker
              label=""
              placeholder="To"
              value={filters.dateTo || ''}
              onChange={v => handleChange('dateTo', v || undefined)}
            />
          </>
        )}

        {filters.state && (
          <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-md">
            <span className="font-medium text-blue-600 dark:text-blue-400">{filters.state}</span>
            <button
              onClick={() => handleChange('state', null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-0.5"
            >
              ✕
            </button>
          </span>
        )}

        {activeFiltersCount > 0 && (
          <button
            onClick={() => { setFilters({}); setRangeMode('all'); }}
            className="px-2.5 py-1.5 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Reset ({activeFiltersCount})
          </button>
        )}
      </div>
    </div>
  );
}
