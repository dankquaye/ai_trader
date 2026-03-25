## 2026-03-25 - [Trade History Empty State]
**Learning:** Tables displaying dynamic data (like Trade History) should implement a helpful empty state with an icon and message when no data is present, rather than leaving the table body empty.
**Action:** Always check array lengths before rendering table rows, and return a `<tr><td colspan="X">...</td></tr>` with a helpful message if empty.
