## 2025-05-23 - Critical CSS Dependencies for Accessibility
**Learning:** The application relies on utility classes (`.opacity-0`, `.pointer-events-none`) for modal interactions that were missing from the production CSS build. This caused the modal overlay to block all user interactions invisibly.
**Action:** Always verify that state-toggling utility classes exist in the computed styles or explicitly define critical functional styles in the component/page CSS to prevent "invisible blocker" bugs.

## 2025-05-23 - Interactive State Labels
**Learning:** Toggle buttons (like Play/Pause) often lack dynamic accessible labels. A static aria-label is insufficient for a button that changes function.
**Action:** Ensure event listeners update `aria-label` alongside the visual icon/text changes.
