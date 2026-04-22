## 2024-05-18 - [Trade History Empty State]
**Learning:** Tables displaying dynamic data, such as the Trade History table, should implement a helpful empty state with an icon and message when no data is present, rather than leaving the table body empty.
**Action:** Implemented an empty state rendering logic in `app.js` using `colspan="7"` to span the table width.

## 2024-05-18 - [Icon-Only Buttons & Semantic Modals]
**Learning:** Icon-only interactive elements (like the 'Pause Bot' toggle and modal close icons) severely impact accessibility for screen reader users when built with `div`s and no `aria-label`s.
**Action:** Always verify that all icon-only buttons use a semantic `<button type="button">` with a descriptive, dynamic `aria-label` (e.g. toggling 'Pause Bot' / 'Resume Bot' based on application state).
