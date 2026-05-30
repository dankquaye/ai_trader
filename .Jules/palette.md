## 2024-05-18 - [Trade History Empty State]
**Learning:** Tables displaying dynamic data, such as the Trade History table, should implement a helpful empty state with an icon and message when no data is present, rather than leaving the table body empty.
**Action:** Implemented an empty state rendering logic in `app.js` using `colspan="7"` to span the table width.

## 2024-05-18 - [Modal Accessibility]
**Learning:** Interactive elements acting as buttons (like modal close buttons) should use semantic `<button type='button'>` tags instead of `<div>`s, and require an `aria-label` when they only contain an icon. Custom modals also need `role="dialog"` and `aria-modal="true"` to ensure screen readers trap focus correctly and announce the element as a dialog.
**Action:** Migrated the modal close `<div>` to a `<button>` with `aria-label="Close modal"` and `focus-visible` styles, and added `role="dialog"` and `aria-modal="true"` to `#reasoning-modal` in `index.html`.
