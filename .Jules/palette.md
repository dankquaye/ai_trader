## 2024-05-23 - Accessible Modal Close Buttons
**Learning:** `div` elements used as buttons (like "Close Modal") are inaccessible to screen readers and keyboard users as they lack focus states, roles, and labels.
**Action:** Replace `div` with `<button>`, add `aria-label`, and ensure visible focus states are present (e.g., `focus:ring`).
