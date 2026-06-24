## 2024-05-18 - [Trade History Empty State]
**Learning:** Tables displaying dynamic data, such as the Trade History table, should implement a helpful empty state with an icon and message when no data is present, rather than leaving the table body empty.
**Action:** Implemented an empty state rendering logic in `app.js` using `colspan="7"` to span the table width.

## $(date +%Y-%m-%d) - Modal Accessibility and Focus States
**Learning:** Adding `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` directly to the `#reasoning-modal` container greatly enhances screen reader context when examining trade reasoning. Additionally, converting raw interactive `div` elements acting as buttons into semantic `<button>` tags with explicit `focus:ring-2 focus:ring-blue-500` utilities is required to pass basic keyboard navigation and accessibility standards within this app's Tailwind architecture.
**Action:** Always ensure modals utilize ARIA dialog attributes and all non-standard interactive UI elements are converted to semantic buttons with focus states before considering a feature fully accessible.
