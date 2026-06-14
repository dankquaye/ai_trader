## 2024-05-18 - [Trade History Empty State]
**Learning:** Tables displaying dynamic data, such as the Trade History table, should implement a helpful empty state with an icon and message when no data is present, rather than leaving the table body empty.
**Action:** Implemented an empty state rendering logic in `app.js` using `colspan="7"` to span the table width.

## 2024-05-20 - [Semantic Buttons for Modals]
**Learning:** Interactive elements previously using `div` (like the modal close button) are being migrated to semantic `<button type='button'>` elements with `aria-label` attributes and appropriate focus states to support keyboard accessibility.
**Action:** Migrated modal close elements in `index.html` to semantic `<button type="button">` with `aria-label="Close modal"` and `focus:outline-none focus:ring-2 focus:ring-blue-500` classes to improve accessibility.
