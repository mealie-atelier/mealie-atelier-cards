# Cards brand assets

The Cards icon uses the shared Mealie Atelier pasta photograph inside a recipe-card mark. The same aubergine, cream, pasta-gold and tomato-red palette is used by the organization identity and Bridge icon.

- `icon.svg` is the editable source; its photo dependency is included beside it.
- `icon-192.png`, `icon-512.png` and `icon-1024.png` are ready-to-use exports.
- `social-preview.svg` and `social-preview.png` are the GitHub repository preview artwork.
- `CREDITS.md` records the photograph attribution and source license.

Regenerate the icon exports from this directory with `rsvg-convert`:

```sh
rsvg-convert -w 192 -h 192 icon.svg > icon-192.png
rsvg-convert -w 512 -h 512 icon.svg > icon-512.png
rsvg-convert -w 1024 -h 1024 icon.svg > icon-1024.png
```
