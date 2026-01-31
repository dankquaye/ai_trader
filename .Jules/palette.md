# Palette's Journal

This journal documents critical UX and accessibility learnings.

## 2023-10-27 - Semantic Buttons vs Divs
**Learning:** Using `div`s for interactive elements (like close buttons) breaks accessibility and requires manual CSS management (pointer-events). Replacing them with `<button>` immediately fixes focus order and keyboard support.
**Action:** Always use `<button>` for click actions, even for icon-only elements, and ensure they have `aria-label`.
