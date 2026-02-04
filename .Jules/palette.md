## 2026-02-04 - Missing Utilities & A11y
**Learning:** The app relies on manually defined utility classes in index.html (like .pointer-events-none) which were missing, causing modal overlays to block interaction. Also, icon-only buttons consistently lack ARIA labels.
**Action:** Verify existence of critical utility classes in style blocks and audit icon-only buttons for labels.
