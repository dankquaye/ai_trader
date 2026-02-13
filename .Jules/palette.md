## 2025-05-18 - Missing Tailwind Utility Classes
**Learning:** This project lacks a Tailwind build step, causing critical utility classes like `.pointer-events-none` and `.opacity-0` to be missing. This broke modal accessibility (overlay blocking clicks).
**Action:** Manually add missing utility classes to `index.html`'s `<style>` block when encountered, rather than attempting to rebuild CSS.
