# GameZone PWA Icons

All icons in this folder are generated from `/public/logo.png`.

Required files:
- icon-72.png
- icon-96.png
- icon-128.png
- icon-144.png
- icon-152.png
- icon-192.png   ← also used as apple-touch-icon
- icon-384.png
- icon-512.png
- icon-512-maskable.png  ← logo centered on #7c3aed purple background with safe-zone padding

## How to generate

Use https://www.pwabuilder.com/imageGenerator or https://realfavicongenerator.net

Upload your logo.png and set background color to #7c3aed (purple).
Download all sizes and place them here.

For the maskable icon (icon-512-maskable.png):
- Canvas: 512x512, background #7c3aed
- Logo centered, scaled to ~60% of canvas (safe zone)
- This ensures no clipping on Android adaptive icons or iOS flexible layouts
