## 2024-05-18 - [Trade History Empty State]
**Learning:** Tables displaying dynamic data, such as the Trade History table, should implement a helpful empty state with an icon and message when no data is present, rather than leaving the table body empty.
**Action:** Implemented an empty state rendering logic in `app.js` using `colspan="7"` to span the table width.

## 2026-06-01 - [Interactive Elements and Forms Accessibility]
**Learning:** Interactive elements such as modal close buttons should use semantic `<button>` tags with `aria-label` instead of `div` elements, and form inputs must have associated `<label>` elements rather than just relying on `placeholder` attributes. Focus states are also essential for keyboard navigation.
**Action:** Migrated the modal close `div` to a `<button type="button">` with focus states, and added semantic `label`s and focus indicators to the Support Form inputs in `index.html`.
