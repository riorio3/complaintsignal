// Common stop words to filter out
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she',
  'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
  'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that',
  'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an',
  'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of',
  'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just',
  'don', 'should', 'now', 'xxxx', 'xx', 'would', 'could', 'also', 'get', 'got',
  'said', 'one', 'two', 'three', 'told', 'even', 'still', 'since', 'back',
  'been', 'being', 'made', 'make', 'take', 'went', 'going', 'want', 'wanted',
  'coinbase', 'company', 'account', 'money', 'time', 'day', 'days', 'week',
  'weeks', 'month', 'months', 'year', 'years', 'email', 'phone', 'called'
]);

// Fraud-related keywords (matches IssueInsights.jsx fraud category)
const FRAUD_KEYWORDS = [
  'scam', 'scammed', 'scammer',
  'fraud', 'fraudulent', 'defrauded',
  'stolen', 'stole', 'stealing', 'theft',
  'hacked', 'hack', 'hacker', 'hacking',
  'unauthorized', 'unauthorised',
  'phishing', 'phished',
  'fake', 'impersonator', 'impersonation',
  'identity theft', 'criminals', 'criminal',
  'compromised', 'breached',
  'someone accessed', 'not me', 'didnt authorize'
];

// Common complaint themes to look for
const THEME_KEYWORDS = {
  'Account Access': ['locked', 'lock', 'access', 'login', 'verification', 'verify', 'disabled', 'restricted', 'suspended'],
  'Customer Service': ['support', 'response', 'contact', 'help', 'waiting', 'ignored', 'no response', 'customer service'],
  'Withdrawal Issues': ['withdraw', 'withdrawal', 'transfer', 'funds', 'money', 'bank', 'deposit'],
  'Security': ['security', 'secure', 'hacked', 'unauthorized', '2fa', 'authentication'],
  'Documentation': ['documents', 'id', 'identity', 'verify', 'verification', 'kyc', 'selfie', 'photo'],
};

/**
 * Extract keywords from complaint narratives
 */
export function extractKeywords(complaints, limit = 30) {
  const wordCounts = {};

  complaints.forEach(complaint => {
    const narrative = complaint.complaint_what_happened;
    if (!narrative) return;

    // Tokenize and clean
    const words = narrative
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !STOP_WORDS.has(word));

    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
  });

  // Sort by count and return top keywords
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, value]) => ({ text, value }));
}

/**
 * Extract bigrams (two-word phrases) from narratives
 */
export function extractPhrases(complaints, limit = 20) {
  const phraseCounts = {};

  complaints.forEach(complaint => {
    const narrative = complaint.complaint_what_happened;
    if (!narrative) return;

    const words = narrative
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word));

    // Create bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
    }
  });

  return Object.entries(phraseCounts)
    .filter(([phrase, count]) => count >= 5) // Only phrases appearing 5+ times
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, value]) => ({ text, value }));
}

/**
 * Detect fraud-related complaints
 */
export function detectFraudComplaints(complaints) {
  const fraudComplaints = [];
  const fraudKeywordsLower = FRAUD_KEYWORDS.map(k => k.toLowerCase());

  complaints.forEach(complaint => {
    const narrative = (complaint.complaint_what_happened || '').toLowerCase();
    const issue = (complaint.issue || '').toLowerCase();

    const hasFraudKeyword = fraudKeywordsLower.some(keyword =>
      narrative.includes(keyword) || issue.includes(keyword)
    );

    if (hasFraudKeyword) {
      fraudComplaints.push(complaint);
    }
  });

  return fraudComplaints;
}

/**
 * Calculate fraud percentage
 */
export function calculateFraudRate(complaints) {
  if (complaints.length === 0) return 0;
  const fraudCount = detectFraudComplaints(complaints).length;
  return Math.round((fraudCount / complaints.length) * 100);
}

/**
 * Calculate fraud rate by company
 */
export function getFraudRateByCompany(complaints) {
  const companyData = {};

  complaints.forEach(complaint => {
    const company = complaint.company || 'Unknown';
    if (!companyData[company]) {
      companyData[company] = { total: 0, fraud: 0 };
    }
    companyData[company].total++;
  });

  const fraudComplaints = detectFraudComplaints(complaints);
  fraudComplaints.forEach(complaint => {
    const company = complaint.company || 'Unknown';
    if (companyData[company]) {
      companyData[company].fraud++;
    }
  });

  return Object.entries(companyData)
    .map(([company, data]) => ({
      company,
      total: data.total,
      fraudCount: data.fraud,
      fraudRate: data.total > 0 ? Math.round((data.fraud / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Categorize complaints by theme
 */
export function categorizeByTheme(complaints) {
  const themes = {};

  Object.keys(THEME_KEYWORDS).forEach(theme => {
    themes[theme] = 0;
  });

  complaints.forEach(complaint => {
    const narrative = (complaint.complaint_what_happened || '').toLowerCase();

    Object.entries(THEME_KEYWORDS).forEach(([theme, keywords]) => {
      if (keywords.some(keyword => narrative.includes(keyword))) {
        themes[theme]++;
      }
    });
  });

  return Object.entries(themes)
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get complaints with narratives
 */
export function getComplaintsWithNarratives(complaints) {
  return complaints.filter(c => c.complaint_what_happened && c.complaint_what_happened.length > 50);
}
