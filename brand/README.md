# Cards brand assets

Cards uses the Week Dial mark: a cream plate seen from above, its rim notched into seven day sections with today in paprika, and a card grid on the plate. The masters live in the `brand/` folder of the [mealie-atelier/.github](https://github.com/mealie-atelier/.github) repository, together with the palette, clear space and minimum size rules ([`brand/README.md`](https://github.com/mealie-atelier/.github/tree/main/brand)). Never redraw the mark by hand; copy the generated files.

- `icon.svg` is the Cards app tile master (night tile, cream plate, herb card grid).
- `icon-192.png`, `icon-512.png` and `icon-1024.png` are exports of that master.
- `social-preview.png` is the 1280 × 640 GitHub social preview and `social-preview.jpg` the optimized GitHub upload (both under 1 MB). Both are byte-identical copies of `brand/social/mealie-atelier-cards-social-preview.*` in the `.github` repository, where they are generated; do not edit them here.

See [`CREDITS.md`](CREDITS.md) for the generator, the licence and the typeface credits.

The web app (`web/public/`) uses the web app family of the same set, and the demo copies `icon-192.png` as its favicon.

Re-export the PNGs from the masters with the `render.sh` script of the masters repository (Chrome headless):

```sh
render.sh icon.svg 192 icon-192.png
render.sh icon.svg 512 icon-512.png
render.sh icon.svg 1024 icon-1024.png
```
