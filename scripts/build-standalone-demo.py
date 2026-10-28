"""Create an entirely offline, credential-free HTML showroom.

The HACS JS bundle itself does NOT permit data URI recipe images. Only the
preview copy enables the embedded, original demo food photo data.
"""

import base64
import re
from pathlib import Path

cards = Path(__file__).resolve().parents[1]
project = cards.parent
html = (cards / "demo/preview.html").read_text()
fixture = re.search(r'<script type="module">(.*?)</script>', html, re.DOTALL).group(1)
fixture = fixture.replace("import '../dist/mealie-atelier-cards.js';", "")
photos = {
    file.stem: "data:image/webp;base64," + base64.b64encode(file.read_bytes()).decode()
    for file in sorted((cards / "demo/food").glob("*.webp"))
}
assert len(photos) == 8
# Use protected in-memory photos only in this offline sample; production accepts
# authenticated, allowlisted proxy URLs and no data URIs.
fixture = fixture.replace(
    "imageUrl:`./food/${photoIds[i]}.webp`", "imageUrl:demoPhotos[photoIds[i]]"
)
assert "imageUrl:demoPhotos[photoIds[i]]" in fixture
fixture = fixture.replace(
    "const recipes=names.map(",
    "const demoPhotos="
    + __import__("json").dumps(photos, separators=(",", ":"))
    + ";\nconst recipes=names.map(",
)
js = (cards / "dist/mealie-atelier-cards.js").read_text()
old = "|| /^\\.\\/food\\/[a-z0-9-]+\\.webp$/.test(v)"
new = "|| /^data:image\\/webp;base64,[A-Za-z0-9+/=]+$/.test(v)"
assert js.count(old) == 1, "expected a single photo allowlist"
js = js.replace(old, new)
assert "</script" not in js.lower()
html = re.sub(
    r'<script type="module">.*?</script>',
    lambda m: "<script>" + js + "</script>\n<script>" + fixture + "</script>",
    html,
    flags=re.DOTALL,
)
html = html.replace(
    "MEALIE ATELIER / EDITORIAL KITCHEN EXPERIENCE",
    "MEALIE ATELIER / LIVE DEMO MIT BEISPIELREZEPTEN · OFFLINE & OHNE LOGIN",
)
html = html.replace(
    "<title>Mealie Atelier · Showcase</title>",
    "<title>Mealie Atelier · Interaktive Premium-Demo 0.9.3</title>",
)
assert len(html) > 500000
for path in [
    cards / "demo/standalone-preview.html",
    project / "qa/Mealie-Atelier-Interaktive-Demo-v0.9.3.html",
]:
    path.write_text(html)
    print(path, round(path.stat().st_size / 1024), "KiB")
