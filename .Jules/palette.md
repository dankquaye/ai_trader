## 2024-05-18 - [Trade History Empty State]
**Learning:** Tables displaying dynamic data, such as the Trade History table, should implement a helpful empty state with an icon and message when no data is present, rather than leaving the table body empty.
**Action:** Implemented an empty state rendering logic in `app.js` using `colspan="7"` to span the table width.

## 2026-06-12 - [Accessible Modals]
**Learning:** Modal structures originally implemented with `div` elements for close actions lack focusability, semantic meaning, and screen reader announcements.
**Action:** Always migrate interactive icon-only `div` closures to semantic `<button type="button">` tags. Ensure they receive an explicit `aria-label` (e.g., "Close modal") and distinct focus states (`focus:ring-2`) to support full keyboard and screen reader accessibility. Ensure modal containers themselves carry `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` referencing their title ID.
