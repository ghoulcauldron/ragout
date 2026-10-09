# Ragout: ragout.studio (alpha)

Static landing page. No build step. Three.js (r160) loads from jsDelivr; everything else is in this folder.

```
index.html    page + copy
style.css     layout, type, colors (the page background follows the dye)
main.js       scene, scroll stages, colorways, pH widget
shaders.js    the fabric: crumple, LWI dye, poly-cotton weave, sashiko
logo.svg      lockup C (final), traced from ragout_logo_C_final.png
og-image.png  link preview: lockup C in Oxidized Guacamole on deep beet
favicon.svg
vercel.json   clean URLs + basic headers
```

## How the apron works
The dye follows the LWI recipe in the Colorway System & Dye-Treatment Spec: a warped vein field (three scales plus blotch), normalized, raised to 0.6 and quantized into the colorway's 8-step ramp. The same vein field lifts the fold ridges in 3D, so the dark veins sit on the creases. Press and hold deforms the actual mesh: the cloth gathers toward your finger and springs back on release. Each section in `index.html` sets a stage with `data-crumple`, `data-scour`, `data-dye`, `data-mend` (0 to 1).

Colorways (ramps and backgrounds) live in `COLORWAYS` at the top of `main.js`. When real swatch values arrive, replace the ramps there.

## Upload from Android
1. Unzip `ragout-alpha.zip` (Files app: tap the zip, Extract).
2. github.com/ghoulcauldron/ragout, Add file, Upload files, select all files, Commit.

## Deploy on Vercel
1. vercel.com, Add New, Project, import `ghoulcauldron/ragout`.
2. Framework preset: Other. Leave build and output settings empty. Deploy.

## Point ragout.studio at Vercel (Cloudflare DNS)
1. Vercel project, Settings, Domains: add `ragout.studio` and `www.ragout.studio`.
2. Cloudflare, ragout.studio, DNS, Records: add exactly what Vercel shows (usually an A record for `@` and a CNAME for `www`).
3. Set both records to DNS only (grey cloud). Vercel issues the SSL certificate.

## Before launch
- `hello@ragout.studio` in the join section is a placeholder. Set up the address (Cloudflare Email Routing works) or change the link.
- Add an Instagram link when ready.
