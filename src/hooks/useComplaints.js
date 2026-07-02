import { useState, useEffect, useMemo } from 'react';
// `?url` makes Vite emit the 25MB JSON as a separate hashed asset instead of
// inlining it into the JS bundle — the app shell loads fast and the data is
// fetched (and browser-cached) in parallel.
import complaintsUrl from '../data/complaints.json?url';

// Complaint data covers: Coinbase, Block/Cash App, Robinhood, Kraken, Gemini,
// Crypto.com, and more. Auto-refreshes weekly via GitHub Actions.
export function useComplaints(filters = {}) {
  const [staticComplaints, setStaticComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated] = useState(new Date());

  useEffect(() => {
    let cancelled = false;
    fetch(complaintsUrl)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load complaint data (HTTP ${response.status})`);
        return response.json();
      })
      .then(json => {
        if (cancelled) return;
        setStaticComplaints(json.hits?.hits?.map(hit => hit._source) || []);
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Filter data based on filters
  const data = useMemo(() => {
    let filtered = [...staticComplaints];

    // Filter by company
    if (filters.company && filters.company !== 'all') {
      filtered = filtered.filter(c => c.company === filters.company);
    }

    // Filter by issue
    if (filters.issue && filters.issue !== 'all') {
      filtered = filtered.filter(c => c.issue === filters.issue);
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(c => c.date_received >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(c => c.date_received <= filters.dateTo);
    }

    // Filter by state
    if (filters.state) {
      filtered = filtered.filter(c => c.state === filters.state);
    }

    return filtered;
  }, [staticComplaints, filters.company, filters.issue, filters.dateFrom, filters.dateTo, filters.state]);

  // Get date range from data
  const dateRange = useMemo(() => {
    if (staticComplaints.length === 0) return null;
    const dates = staticComplaints
      .map(c => c.date_received)
      .filter(Boolean)
      .sort();
    return {
      oldest: dates[0]?.slice(0, 10),
      newest: dates[dates.length - 1]?.slice(0, 10),
    };
  }, [staticComplaints]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    isLive: true, // Data is current as of last static update
    totalCount: staticComplaints.length,
    dateRange,
  };
}
