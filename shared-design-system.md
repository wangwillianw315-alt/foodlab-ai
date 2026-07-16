# FoodLab AI Phase 2 Visual Specification

Phase 2 standardises the application shell only. It does not redesign internal analytical screens or create a shared component package.

## Foundation

- Deep Navy `#0B1F3A`: brand, primary navigation, headings
- Teal `#169C91`: shared platform accent and links
- Light Grey `#F5F7FA`: page and secondary surfaces
- White `#FFFFFF`: primary surface
- Product Development `#2563EB`
- Sensory `#D97706`
- Shelf Life `#7357C7`
- QA `#2E9D61`
- Success `#2E9D61`, Warning `#D99A24`, Error `#D9534F`, Neutral `#64748B`

## Typography and spacing

- System sans-serif stack; no external font dependency.
- Base body 14–16 px, line-height 1.5–1.7.
- Module title 18–22 px, FoodLab label 13–15 px.
- Shell spacing uses an 8 px base; header horizontal padding 20–32 px.

## Shape

- Cards and notices: 10–12 px radius.
- Buttons and inputs: 8 px radius.
- Badges: full pill radius.
- Borders: cool grey, 1 px, with restrained shadows.

## Module header

- Target height: 64–76 px.
- Left: FoodLab AI text/logo, module name, module-colour marker.
- Right: current module status, shared disclaimer link, and “Back to Portal”.
- Portal URL defaults to `http://localhost:5173` and may use `VITE_PORTAL_URL` where configured.
- Links open the Portal without transmitting records.

## Disclaimer

Use an amber or neutral bordered notice. State that the module is educational/research-planning software and does not replace validated methods, regulatory review, safety approval, or professional judgement.
