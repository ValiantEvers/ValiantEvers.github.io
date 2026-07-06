---
description: Verify all Easter eggs in evers.no still work after a change
---

# Easter Egg Audit

Read `index.html` and verify each of the following is still functional (CSS classes present, JS listeners attached, no syntax errors that would break them). All keyboard triggers are desktop-only (gated behind a touch-device check).

Keyboard triggers:
1. Type "prins" / "prince" (or "prins valiant" / "prince valiant") → medieval mode
2. Type "run" → run effect
3. Type "waffle" / "vaffel" → waffle effect
4. Type "thesis" → thesis effect
5. Type "viking" → viking effect
6. Type "mjød" / "mjod" → mjød effect
7. Type "penger" → money-emoji rain
8. Type "tangen" → opens ft.com
9. Type "jobb" → opens /strategi.html (PRIVATE, noindex — verify it still opens, but NEVER advertise or add a clue for it)
10. Konami code (up up down down left right left right b a) → confetti + 360-degree spin + hue-rotate

Click trigger (works on mobile too):
11. Triple-click `#heroImg` → same medieval mode

Also verify:
12. GIF/APNG transitions load from correct paths
13. Discovery clues intact: prins clue in `ff1d` (no/en/fr), waffle clue in `ff3d` (no/en), console greeting `<script>` right after `#pageFlash`

Report status per item: OK / BROKEN / SUSPICIOUS. If broken, point to the exact line number and suggest the fix in "replace lines X–Y with: ..." format.

Do NOT modify the file. This is read-only diagnostic.
