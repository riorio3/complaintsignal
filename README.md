# Crypto Complaints Dashboard

A React dashboard analyzing consumer complaints against cryptocurrency companies using data from the CFPB (Consumer Financial Protection Bureau).

## Features

- **Complaint Trends**: Line chart showing complaint volume over time
- **Issue Breakdown**: Bar chart of top complaint categories
- **Company Comparison**: Table comparing crypto companies by response metrics
- **Interactive Filters**: Filter by company, issue type, and date range
- **Key Metrics**: Total complaints, timely response rate, top issues

## Data Source

This dashboard uses the [CFPB Consumer Complaint Database API](https://www.consumerfinance.gov/data-research/consumer-complaints/), which contains real consumer complaints submitted to the CFPB about financial products and services.

The dashboard filters for complaints related to "Virtual Currency" products.

## Tech Stack

- React + Vite
- Recharts for data visualization
- Tailwind CSS for styling
- date-fns for date handling

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Deployment

This project is configured for easy deployment on Vercel:

1. Push to GitHub
2. Import project in Vercel
3. Deploy

## Project Purpose

Built to demonstrate QC analytics skills for compliance/regulatory roles in fintech. The dashboard showcases:

- Root cause analysis through trend identification
- Pattern recognition in complaint data
- Regulatory data awareness (CFPB)
- Data visualization and reporting capabilities
