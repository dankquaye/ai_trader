## 2024-05-23 - Accessibility Gaps in Legacy Modals & Forms
**Learning:** Found critical accessibility patterns missing in the legacy UI:
1. Modal overlays relied on missing Tailwind utility classes (`.pointer-events-none`), causing them to block UI interaction even when visually "hidden".
2. Forms used placeholders as labels, which is a major accessibility violation.
3. Interactive elements (like Close icons) were implemented as `div`s instead of `button`s, breaking keyboard navigation.

**Action:**
1. Always verify that toggled classes (like `opacity-0`) are actually defined in the CSS if the build system is partial.
2. Use explicit `<label>` elements for all inputs.
3. Convert all interactive icons to `<button>` with `aria-label`.