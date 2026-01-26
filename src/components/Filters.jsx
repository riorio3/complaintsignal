export function Filters({ filters, setFilters, companies, issues }) {
  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <select
            value={filters.company || 'all'}
            onChange={e => handleChange('company', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border"
          >
            <option value="all">All Companies</option>
            {companies.map(company => (
              <option key={company} value={company}>
                {company.length > 40 ? `${company.substring(0, 40)}...` : company}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
          <select
            value={filters.issue || 'all'}
            onChange={e => handleChange('issue', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border"
          >
            <option value="all">All Issues</option>
            {issues.map(issue => (
              <option key={issue} value={issue}>
                {issue.length > 40 ? `${issue.substring(0, 40)}...` : issue}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={e => handleChange('dateFrom', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border"
          />
        </div>

        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={e => handleChange('dateTo', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border"
          />
        </div>

        <button
          onClick={() => setFilters({})}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
