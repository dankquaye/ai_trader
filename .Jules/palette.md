## 2024-05-24 - [Interactive Toggle Button Accessibility]
**Learning:** Interactive toggle buttons (e.g., 'Pause Bot') must dynamically update their `aria-label` attribute in `app.js` to reflect the current state (e.g., 'Resume Bot') alongside visual changes.
**Action:** Always include `setAttribute('aria-label', ...)` in the click handler for toggle buttons.

## 2024-05-24 - [Modal Visibility Control]
**Learning:** Utility classes `.opacity-0`, `.pointer-events-none`, and `.hidden` are manually defined in `index.html`'s `<style>` block to ensure correct `pointer-events` inheritance and prevent the modal overlay from intercepting clicks when hidden.
**Action:** Verify that these utility classes are present in the CSS or `<style>` block if relying on them for UI state management, especially when Tailwind build process is not guaranteed.

## 2024-05-24 - [Semantic Elements for Accessibility]
**Learning:** Interactive elements previously using `div.cursor-pointer` are being migrated to semantic `<button type='button'>` elements to support keyboard accessibility.
**Action:** Use `<button>` for all clickable elements that perform actions, and ensure `type="button"` is set to prevent form submission inside forms.
