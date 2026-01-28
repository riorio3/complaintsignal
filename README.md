# ComplaintChain

> Crypto Complaint Intelligence Dashboard

**[Live Demo](https://complaintchain.vercel.app)**

ComplaintChain visualizes 21,000+ consumer complaints filed against cryptocurrency companies with the CFPB (Consumer Financial Protection Bureau), cross-referenced with BTC price data and regulatory enforcement actions.

---

## Features

### Analytics
- **BTC Price vs Complaints** - Interactive chart showing correlation between Bitcoin price movements and complaint volume (with live BTC price)
- **Complaint Trends** - Monthly complaint volume over 6+ years of data
- **Company Comparison** - Side-by-side metrics for 200+ crypto companies (response rates, dispute rates, resolution times)
- **Pattern Analysis** - AI-powered issue categorization and trend detection
- **Geographic Distribution** - Complaints by state with interactive map

### Data Sources
- **CFPB Database** - Real consumer complaints (updated regularly)
- **Live BTC Price** - CoinGecko API integration
- **Regulatory News** - Live feed of SEC, DOJ, CFTC enforcement actions + crypto news

### Tools
- **Complaint Search** - Look up any complaint by ID
- **Market Event Overlay** - Major crypto events (crashes, regulations, hacks) mapped on charts
- **Dark/Light Mode** - Full theme support

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Data | CFPB API, CoinGecko API |
| Deployment | Vercel |

---

## Quick Start

```bash
# Clone
git clone https://github.com/riorio3/complaintchain.git
cd complaintchain

# Install
npm install

# Run
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Key Insights

Some interesting findings from the data:

- **Correlation**: Complaint volume tends to spike during market downturns
- **Top Issues**: "Managing, opening, or closing account" and "Fraud/scams" dominate
- **Response Rates**: Vary significantly between companies (40-98%)
- **Growth**: Crypto complaints grew 10x from 2019 to 2024

---

## Screenshots

*Dashboard showing BTC price correlation, regulatory timeline, and company metrics*

---

## Contributing

Issues and PRs welcome.

---

## License

MIT

---

Built by [Rio](https://github.com/riorio3)
