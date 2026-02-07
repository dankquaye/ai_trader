## 2024-05-22 - Toast Notifications & Interaction Fixes
**Learning:** Missing basic interaction CSS (`pointer-events-none`) can completely block users, and dynamic toasts MUST have `role='alert'` or `role='status'` to be perceived by screen readers.
**Action:** Always verify overlay interactions and ensure dynamic content is announced via ARIA live regions.
