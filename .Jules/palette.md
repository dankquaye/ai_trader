## 2025-02-18 - Missing Utility Classes in Tailwind Setup
**Learning:** This project lacks a Tailwind build step, meaning utility classes like `.opacity-0` and `.pointer-events-none` are not automatically generated. This caused a critical issue where invisible modal overlays blocked UI interactions because they defaulted to visible/blocking.
**Action:** When working on this repo, manually verify that referenced utility classes exist in `index.html`'s `<style>` block or add them if missing. Do not assume Tailwind classes work out-of-the-box without a build process.
