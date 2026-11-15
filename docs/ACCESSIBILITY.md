# Accessibility parity (TLM-091)

## Automated (in CI)
- `tests/browser/accessibility.spec.mjs` runs axe-core with WCAG 2.0/2.1/2.2 A and AA tags on all ten pages with no rule exclusions,
  on Chromium (desktop) and Firefox, and checks one `main` landmark, one `h1` and reduced-motion handling on every page.
- Every module journey is driven in Playwright through labelled form controls, roles and accessible names (desktop and Pixel 5),
  and every page is checked for horizontal overflow on mobile.

## Equivalent routes
| Concept | Non-visual / non-audio equivalent |
|---|---|
| Vision (Module 1) | SVG/text scene descriptions, numeric pixel traces, keyboard drawing |
| Teach a Machine (2) | Keyboard drawing grid and presets, tabular results |
| Model internals (3) | Numeric weight tables beside heatmaps, text traces |
| Music (5) | Visual transcript and captions; audio optional |
| Legal cases (7 in plan numbering: education/acquisition) | All text, source inspector |
| Economics (6) | Ledger tables; no chart-only information |
| Write the Law (7) | Plain-sentence rule descriptions; tables |
| Capstone (8) | Text-only |

## Not yet done (required before TLM-091 can be accepted)
- Manual screen-reader passes (NVDA/Firefox, VoiceOver/Safari, TalkBack/Chrome) and keyboard-only walkthroughs by a person.
- Contrast and zoom (200%/400%) checks beyond axe's automated rules.
