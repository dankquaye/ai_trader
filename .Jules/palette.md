## 2024-05-23 - Accessibility Overlay Issue
**Learning:** Missing utility classes (`.opacity-0`, `.pointer-events-none`) in the CSS prevented correct pointer-event inheritance, causing a hidden modal overlay to intercept clicks and break the UI.
**Action:** Always verify that utility classes used in HTML (especially for overlay visibility toggling) are actually defined in the stylesheet or Tailwind config.

## 2024-05-23 - Interactive Element Semantics
**Learning:** Using `div` for interactive elements (like close buttons) without ARIA roles makes them inaccessible and requires custom keyboard handlers.
**Action:** Always use semantic `<button>` elements for actions.
