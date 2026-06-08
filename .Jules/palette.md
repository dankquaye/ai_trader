## 2024-05-18 - [Trade History Empty State]
**Learning:** Tables displaying dynamic data, such as the Trade History table, should implement a helpful empty state with an icon and message when no data is present, rather than leaving the table body empty.
**Action:** Implemented an empty state rendering logic in `app.js` using `colspan="7"` to span the table width.

## 2026-06-08 - [Modal Close Button Accessibility]
**Learning:** Interactive elements previously using `div` (like the modal close button) should be migrated to semantic `<button type='button'>` elements with `aria-label` attributes to support keyboard accessibility.
**Action:** Replaced the `div.modal-close` in the Trade Analysis modal with a `<button type="button" aria-label="Close modal">`, and added focus visible styles (`focus:outline-none focus:ring-2 focus:ring-blue-500 rounded`).
