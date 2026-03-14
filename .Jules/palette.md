## 2024-05-24 - Semantic HTML for Modals
**Learning:** Interactive elements like modal close buttons often use `<div>` tags with `cursor-pointer`, which breaks keyboard accessibility and screen readers.
**Action:** Always migrate interactive `<div>` elements to semantic `<button type="button">` with `aria-label` attributes for icon-only buttons to ensure they are accessible.
