# Brand assets: placeholder requirement

Only the **official, supplied** RentReadBuy brand files may be placed here.
The logo must never be redrawn, recreated, approximated, traced or AI-generated.

## Required from RentReadBuy

| File | Use | Preferred format |
|---|---|---|
| `rrb-logo.svg` (or official PNG) | Header and footer identity | SVG; transparent PNG at 2x minimum otherwise |
| `rrb-logo-reversed.*` (if one exists) | Use on dark/photographic backgrounds | SVG / transparent PNG |
| `favicon.ico`, `icon.png`, `apple-icon.png` | Browser and device icons | Official exports |
| Brand guidelines (colours, fonts, clear space) | Replace provisional tokens in `src/styles/tokens.css` | PDF |

After adding the logo, register it in `src/config/brand.ts` (`logo: { src, width, height, alt }`).
The header renders no logo until then.

Note: an `rrb-logo.png` exists in the folder above the project root
(`promotional-contents/membership-campaign/rrb-logo.png`). It has not been copied
because it has not been confirmed as the official production logo file.
