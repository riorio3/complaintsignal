# BTC Price Update Fix - Session Notes

## Problem
- BTC price showing $78k (stale fallback) instead of live ~$71k
- Price not updating frequently enough from APIs

## What Was Done
Created `src/hooks/useCryptoPriceV2.js` with improvements:
- **Timeout**: 2s → 5s (more reliable)
- **Retry**: Added 3 retries with exponential backoff
- **APIs**: Added Kraken + CryptoCompare (now 5 sources)
- **Refresh**: 5 min → 1 min interval
- **Fallback**: Updated to $71k
- **Logging**: Console logs for debugging

## Current State
- V2 hook created and enabled via `USE_NEW_PRICE_HOOK = true` in PriceCorrelation.jsx
- "V2 TEST" badge shows in UI when V2 is active
- Changes committed and pushed to `claude/fix-btc-price-updates-iIMR5`

## Next Steps (When Ready)
1. Test in browser: `npm run dev` → http://localhost:5173/
2. Check console for `[BTC Price]` logs
3. Verify price shows ~$71k and updates every minute
4. If working: Replace old hook with V2 for production
5. Create PR to merge

## Files Changed
- `src/hooks/useCryptoPriceV2.js` (new)
- `src/components/PriceCorrelation.jsx` (modified)
