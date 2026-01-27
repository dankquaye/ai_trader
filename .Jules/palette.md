## 2024-05-23 - Accessible Modal Close Button
**Learning:** Icon-only buttons (like 'X' to close) are often implemented as clickable `<div>`s, which excludes keyboard users and screen readers.
**Action:** Always use `<button>` for interactive elements, add `aria-label` for icon-only buttons, and ensure visible focus states are present (e.g., `focus:ring`).
