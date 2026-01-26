import { useState, useEffect, useMemo } from 'react';
import complaintsData from '../data/complaints.json';

// Extract complaints from the API response format
const allComplaints = complaintsData.hits?.hits?.map(hit => hit._source) || [];

export function useComplaints(filters = {}) {
  const [loading, setLoading] = useState(true);

  // Filter data based on filters
  const data = useMemo(() => {
    let filtered = [...allComplaints];

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

    return filtered;
  }, [filters.company, filters.issue, filters.dateFrom, filters.dateTo]);

  // Simulate loading state for UX
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  return { data, loading, error: null };
}
