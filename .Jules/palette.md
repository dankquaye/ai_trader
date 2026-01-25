## 2024-05-23 - [Invisible Modal Trap]
**Learning:** Critical utility classes (`opacity-0`, `pointer-events-none`) were missing from the style block, creating an invisible overlay that blocked all application interaction.
**Action:** When using utility classes for state management (especially visibility/interaction), verify they exist in the final CSS or inline styles, as they might be purged or missing in non-build environments.
