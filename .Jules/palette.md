## 2026-03-08 - Added Empty States to Dynamic Tables
**Learning:** Tables displaying dynamic data (like trade history or backtest results) lack initial empty states, which can make the UI appear broken or incomplete when no data is present.
**Action:** Always provide default empty state content (e.g., an icon and a helpful message) for dynamic tables and handle the zero-length data case in the JavaScript rendering functions.
