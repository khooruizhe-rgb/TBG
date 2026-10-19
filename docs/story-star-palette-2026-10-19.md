# Perfect-star palette correction

- All perfect-star gradients now run diagonally from dark at the top left to light at the bottom right, replacing the former vertical highlight bands.
- Chapter thirteen gives each of its three stars the complete seven-color rainbow. Its palette and diagonal shading apply in both chapter selection and the winning match result.
- Chapter four uses saturated blue (`#2563eb`) for Eientei stars. The card faction palette remains independent of this star-specific override.

Rainbow stars use separate decorative glyph spans, with their existing accessible star count on the enclosing rating. The rainbow class is enabled only for a perfect clear, and is removed when a match is cleared or replayed. Stars accumulated across separate victories retain their ordinary appearance. Existing chapter-six gold and the three independent Sage colors remain available, with the new diagonal shading.

The saved goal keys, perfect-clear conditions, game rules, AI policies, turn flow, card physics and mobile card layouts are unchanged. Rules version remains `2026-10-19-story-temple-v34`. Existing solid-color and forced-color fallbacks remain available.

Related regression suites cover actual saved ratings and match results, the real Temple three-star victory, cumulative saves and replay, the exact diagonal gradient and rainbow stops, Eientei blue, Sage/gold palettes, mobile introductions and existing star persistence. Tests use controlled DOM and CSS checks; browser pixel rendering is not measured.
