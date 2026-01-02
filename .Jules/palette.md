## 2026-01-02 - Modal Accessibility Pattern
**Learning:** Modals implemented with `div` buttons and no keyboard support create significant accessibility barriers. Users expect `Esc` to close modals and `Tab` to focus on close buttons.
**Action:** When implementing or fixing modals, always use semantic `<button>` elements for close actions, add `aria-label` for icon-only buttons, and explicitly bind `Escape` key and outside-click listeners. Ensure `pointer-events` logic matches visual visibility.
