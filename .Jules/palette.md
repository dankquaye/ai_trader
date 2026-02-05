## 2024-10-26 - Non-semantic Interactive Elements
**Learning:** The codebase uses `div.cursor-pointer` for interactive elements (like modal close buttons), which lacks keyboard focus and semantic meaning.
**Action:** Audit `cursor-pointer` usage and replace with semantic `<button>` elements, ensuring `type="button"` is added to prevent form submission in unexpected contexts.
