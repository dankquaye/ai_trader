## 2024-05-18 - [Trade History Empty State]
**Learning:** Tables displaying dynamic data, such as the Trade History table, should implement a helpful empty state with an icon and message when no data is present, rather than leaving the table body empty.
**Action:** Implemented an empty state rendering logic in `app.js` using `colspan="7"` to span the table width.
## 2026-05-31 - [Modal Close Button Accessibility]
**Learning:** Interactive elements previously using `div` (like the modal close button) are being migrated to semantic `<button type='button'>` elements with `aria-label` attributes to support keyboard accessibility.
**Action:** Changed the `.modal-close` icon div in the reasoning modal to a `<button>` with appropriate ARIA label and focus ring styles.
