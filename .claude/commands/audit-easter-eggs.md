---
description: Verify all Easter eggs in evers.no still work after a change
---

# Easter Egg Audit

Read `index.html` and verify each of the following is still functional (CSS classes present, JS event listeners attached, no syntax errors that would break them):

1. Type "prins" → triggers medieval mode
2. Triple-click `#heroImg` → same medieval mode
3. Type "run" → run effect
4. Type "waffle" → waffle effect
5. Type "thesis" → thesis effect
6. Type "viking" → viking effect
7. Type "mjød" → mjød effect
8. APNG transitions load from correct paths

Report status per Easter egg: OK / BROKEN / SUSPICIOUS. If broken, point to the exact line number and suggest the fix in "replace lines X–Y with: ..." format.

Do NOT modify the file. This is read-only diagnostic.
