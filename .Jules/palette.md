## 2026-06-15 - Reasoning Modal Accessibility
**Learning:** In a modal implementation, converting an interactive `div` (like a close icon) to a semantic `<button type="button">` is effective for accessibility, but it's crucial to retain original class names (like `.modal-close`) to prevent breaking existing JavaScript event listeners that target those classes.
**Action:** Always maintain existing functional class names when upgrading elements to semantic equivalents, and ensure ARIA attributes (`role`, `aria-modal`, `aria-labelledby`) are properly linked.
