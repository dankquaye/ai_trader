## 2024-05-23 - Dynamic ARIA Labels for Toggle Buttons
**Learning:** Icon-only toggle buttons (like Play/Pause) require dynamic `aria-label` updates to communicate state changes to screen readers. Static labels ("Pause Bot") become incorrect when the state changes.
**Action:** Always implement a state toggle handler that updates `aria-label` alongside the visual icon change.
