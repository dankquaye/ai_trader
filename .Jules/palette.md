## 2024-05-22 - [Functionality is the Foundation of UX]
**Learning:** I discovered that even the best visual UX improvements (like ARIA labels and transitions) are meaningless if the underlying interactivity is broken. A missing event listener initialization function (`setupEventListeners`) prevented any user interaction, making accessibility improvements moot until fixed.
**Action:** Always verify that the core application loop (init -> listeners -> render) is functional before applying micro-UX polishes. A "working" app is the prerequisite for a "delightful" app.
