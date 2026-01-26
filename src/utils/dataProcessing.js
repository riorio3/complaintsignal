import { format, parseISO, startOfMonth } from 'date-fns';

/**
 * Group complaints by month for trend chart
 */
export function groupByMonth(complaints) {
  const grouped = {};

  complaints.forEach(complaint => {
    const date = complaint.date_received;
    if (!date) return;

    const monthKey = format(parseISO(date), 'yyyy-MM');

    if (!grouped[monthKey]) {
      grouped[monthKey] = 0;
    }
    grouped[monthKey]++;
  });

  // Convert to array and sort by date
  return Object.entries(grouped)
    .map(([month, count]) => ({
      month,
      label: format(parseISO(`${month}-01`), 'MMM yyyy'),
      count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Group complaints by issue type
 */
export function groupByIssue(complaints) {
  const grouped = {};

  complaints.forEach(complaint => {
    const issue = complaint.issue || 'Unknown';

    if (!grouped[issue]) {
      grouped[issue] = 0;
    }
    grouped[issue]++;
  });

  // Convert to array and sort by count
  return Object.entries(grouped)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Group complaints by company
 */
export function groupByCompany(complaints) {
  const grouped = {};

  complaints.forEach(complaint => {
    const company = complaint.company || 'Unknown';

    if (!grouped[company]) {
      grouped[company] = {
        total: 0,
        timelyResponse: 0,
        disputed: 0,
        closedWithRelief: 0,
      };
    }

    grouped[company].total++;

    if (complaint.timely === 'Yes') {
      grouped[company].timelyResponse++;
    }

    if (complaint.consumer_disputed === 'Yes') {
      grouped[company].disputed++;
    }

    if (
      complaint.company_response &&
      complaint.company_response.toLowerCase().includes('relief')
    ) {
      grouped[company].closedWithRelief++;
    }
  });

  // Convert to array with percentages
  return Object.entries(grouped)
    .map(([company, stats]) => ({
      company,
      total: stats.total,
      timelyRate: stats.total > 0 ? Math.round((stats.timelyResponse / stats.total) * 100) : 0,
      disputeRate: stats.total > 0 ? Math.round((stats.disputed / stats.total) * 100) : 0,
      reliefRate: stats.total > 0 ? Math.round((stats.closedWithRelief / stats.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Calculate summary metrics
 */
export function calculateMetrics(complaints, previousPeriodComplaints = []) {
  const total = complaints.length;
  const previousTotal = previousPeriodComplaints.length;

  const timelyCount = complaints.filter(c => c.timely === 'Yes').length;
  const timelyRate = total > 0 ? Math.round((timelyCount / total) * 100) : 0;

  // Find most common issue
  const issueGroups = groupByIssue(complaints);
  const topIssue = issueGroups[0]?.issue || 'N/A';

  // Calculate trend
  let trend = 'neutral';
  let trendPercent = 0;
  if (previousTotal > 0) {
    trendPercent = Math.round(((total - previousTotal) / previousTotal) * 100);
    trend = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'neutral';
  }

  return {
    total,
    timelyRate,
    topIssue,
    trend,
    trendPercent: Math.abs(trendPercent),
  };
}

/**
 * Get unique issues from complaints
 */
export function getUniqueIssues(complaints) {
  const issues = new Set();
  complaints.forEach(c => {
    if (c.issue) issues.add(c.issue);
  });
  return Array.from(issues).sort();
}

/**
 * Get unique companies from complaints
 */
export function getUniqueCompanies(complaints) {
  const companies = new Set();
  complaints.forEach(c => {
    if (c.company) companies.add(c.company);
  });
  return Array.from(companies).sort();
}
