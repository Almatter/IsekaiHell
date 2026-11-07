# Race image audit — 2026-11-07

Audited all 110 race records and 202 assigned race images.

- All 202 assigned files exist with exact tracked path/case matches.
- All 202 decode locally with Pillow; none are tiny placeholders or fully transparent.
- All 202 public GitHub Pages image URLs loaded successfully in the browser.
- Three races have no image assigned: **Diwose** (Prime / Intermediate), **Zentail** (Fae / Mundane), and **Zentox** (Fae / Intermediate).

There were no reproducible broken assigned image URLs in this audit. The three absent images are missing artwork, rather than corrupt files. A browser/network failure can still cause an otherwise valid image not to display.

Approval drafts were generated with the built-in image-generation tool, based on each race's description in data/races.js. They are kept outside the repository and are not installed on the live website:

- Diwose: C:/Users/novam/.codex/visualizations/2026/11/07/01a1b6fc-4467-7380-9934-e253b3291f6f/race-art-proposals/diwose.png
- Zentail: C:/Users/novam/.codex/visualizations/2026/11/07/01a1b6fc-4467-7380-9934-e253b3291f6f/race-art-proposals/zentail.png
- Zentox: C:/Users/novam/.codex/visualizations/2026/11/07/01a1b6fc-4467-7380-9934-e253b3291f6f/race-art-proposals/zentox.png

Review the anatomy, eyes, adult appearance, and species interpretation before approval. In particular, the Diwose draft depicts a shared body with adjacent fused heads; this interpretation should be confirmed by the setting author.
