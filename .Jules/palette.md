## 2024-05-23 - Modal Accessibility & Missing Utilities
**Learning:** Modal overlay blocked interactions due to missing utility classes (.pointer-events-none) in index.html style block. Close button was a div.
**Action:** Always check for missing critical utility classes in style blocks when Tailwind build step is absent. Use semantic buttons for modal controls.
