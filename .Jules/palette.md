# Palette's Journal

## 2024-05-22 - Form Accessibility
**Learning:** Found critical form inputs (API Token, Stake, Duration) without associated labels or ARIA descriptions. This is a common pattern in rapid prototypes.
**Action:** Always check `for` attributes on labels and `aria-label` on inputs when `label` is missing or visual-only.
