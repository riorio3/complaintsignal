import { useState, useMemo } from 'react';
import { useComplaints } from '../hooks/useComplaints';
import {
  groupByMonth,
  groupByIssue,
  groupByCompany,
  calculateMetrics,
  getUniqueIssues,
  getUniqueCompanies,
} from '../utils/dataProcessing';
import { MetricCard } from './MetricCard';
import { TrendChart } from './TrendChart';
import { IssueBreakdown } from './IssueBreakdown';
import { CompanyComparison } from './CompanyComparison';
import { Filters } from './Filters';

export function Dashboard() {
  const [filters, setFilters] = useState({});
  const { data, loading, error } = useComplaints(filters);

  // Process data for charts
  const trendData = useMemo(() => groupByMonth(data), [data]);
  const issueData = useMemo(() => groupByIssue(data), [data]);
  const companyData = useMemo(() => groupByCompany(data), [data]);
  const metrics = useMemo(() => calculateMetrics(data), [data]);

  // Get filter options from data
  const companies = useMemo(() => getUniqueCompanies(data), [data]);
  const issues = useMemo(() => getUniqueIssues(data), [data]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Crypto Complaints Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                CFPB Consumer Complaint Data Analysis
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Virtual Currency
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Filters */}
        <Filters
          filters={filters}
          setFilters={setFilters}
          companies={companies}
          issues={issues}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading complaints data...</span>
          </div>
        ) : (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Total Complaints"
                value={metrics.total.toLocaleString()}
                trend={metrics.trend}
                trendValue={metrics.trendPercent}
              />
              <MetricCard
                title="Timely Response Rate"
                value={`${metrics.timelyRate}%`}
                subtitle="Responses within 15 days"
              />
              <MetricCard
                title="Top Issue"
                value={metrics.topIssue}
                subtitle="Most reported problem"
              />
              <MetricCard
                title="Companies Tracked"
                value={companies.length}
                subtitle="In virtual currency space"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <TrendChart data={trendData} />
              <IssueBreakdown data={issueData} />
            </div>

            {/* Company Comparison */}
            <CompanyComparison data={companyData} />

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>
                Data sourced from{' '}
                <a
                  href="https://www.consumerfinance.gov/data-research/consumer-complaints/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  CFPB Consumer Complaint Database
                </a>
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
