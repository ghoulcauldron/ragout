# Ragoût: ragout.studio (alpha)

Static landing page. No build step. Three.js (r160) loads from jsDelivr; everything else is in this folder.

```
index.html    page + copy
style.css     layout, type, colors (the page background follows the dye)
main.js       scene, scroll stages, colorways, pH widget
shaders.js    the fabric: crumple, LWI dye, poly-cotton weave, sashiko
favicon.svg
vercel.json   clean URLs + basic headers
```

## How the apron works
One noise field crumples the cloth (vertex shader) and decides where dye pools and where folds resist (fragment shader). When the apron unfolds, the dye pattern is the imprint of the crumple, like low water immersion. Only the "cotton" yarns take full dye, so it reads heathered. Each section in `index.html` sets a stage with `data-crumple`, `data-scour`, `data-dye`, `data-mend` (0 to 1).

Edit colorways in `COLORWAYS` at the top of `main.js`.

## Upload from Android
1. Unzip `ragout-alpha.zip` (Files app: tap the zip, Extract).
2. github.com/ghoulcauldron/ragout, Add file, Upload files, select all 7 files, Commit.

## Deploy on Vercel
1. vercel.com, Add New, Project, import `ghoulcauldron/ragout`.
2. Framework preset: Other. Leave build and output settings empty. Deploy.

## Point ragout.studio at Vercel (Cloudflare DNS)
1. Vercel project, Settings, Domains: add `ragout.studio` and `www.ragout.studio`.
2. Cloudflare, ragout.studio, DNS, Records: add exactly what Vercel shows (usually an A record for `@` and a CNAME for `www`).
3. Set both records to DNS only (grey cloud). Vercel issues the SSL certificate.

## Before launch
- `hello@ragout.studio` in the join section is a placeholder. Set up the address (Cloudflare Email Routing works) or change the link.
- Add an Instagram link and a 1200x630 `og-image.jpg` when ready.
