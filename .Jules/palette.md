## 2024-03-24 - Accessibility Gap: Icon-Only Buttons
**Learning:** Icon-only buttons (like the modal close button) were implemented as `div` elements without `aria-label` or focus styles, making them inaccessible to keyboard and screen reader users. This pattern likely exists elsewhere.
**Action:** Always verify interactive elements are semantic `<button>` or `<a>` tags with explicit `aria-label` attributes and visible focus states.
