## 2024-05-24 - Restoring Missing Critical Logic
**Learning:** Sometimes basic functionality (like event listener setup) is entirely missing from the codebase, causing crashes.
**Action:** Before implementing UX improvements, verify the app runs. If critical logic is missing, restore it concisely.

## 2024-05-24 - Semantic Buttons
**Learning:** Interactive elements like modal close icons should be `<button>` tags, not `<div>`s, for keyboard accessibility.
**Action:** Replace `div` with `button`, add `type="button"`, and include `aria-label`.

## 2024-05-24 - Missing Utility Classes
**Learning:** Tailwind utility classes like `opacity-0` and `pointer-events-none` might be missing from the build if not used previously.
**Action:** Manually define critical missing utility classes in `<style>` blocks if build tools are unavailable.
