## 2024-05-18 - [Trade History Empty State]
**Learning:** Tables displaying dynamic data, such as the Trade History table, should implement a helpful empty state with an icon and message when no data is present, rather than leaving the table body empty.
**Action:** Implemented an empty state rendering logic in `app.js` using `colspan="7"` to span the table width.

## 2026-06-02 - [Modal Close Button Accessibility]
**Learning:** Interactive elements like modal close buttons must use semantic `<button type='button'>` elements with `aria-label` attributes to support keyboard navigation and screen readers, instead of using `div` elements.
**Action:** Replaced the `div` modal close button in `index.html` with a `<button>` and added appropriate ARIA attributes and focus styles.
