import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/design-system/editor.css", import.meta.url), "utf8");

const rule = (selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.notEqual(at, -1, `missing rule ${selector}`);
  return css.slice(at, css.indexOf("}", at));
};

const luminance = ([r, g, b]) => {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

test("filled editor controls carry white text and icons on a darkened theme primary", () => {
  for (const selector of [".editor-primary", ".setup-progress li.complete > span"]) {
    const body = rule(selector);
    assert.match(body, /background: var\(--ed-accent-fill\)/, selector);
    assert.match(body, /color: var\(--ed-on-accent\)/, selector);
  }
  assert.match(css, /--ed-on-accent: var\(--text-primary-color, #fff\)/);
  assert.doesNotMatch(css, /color: #1[34]251b/);
  assert.match(css, /border: solid var\(--ed-on-accent\)/, "the checkbox tick is white too");
});

test("white on the filled accent reaches 4.5:1 for the usual Home Assistant blues", () => {
  const share =
    Number(
      css.match(/--ed-accent-fill: color-mix\(in srgb, var\(--ed-accent\) (\d+)%, #000\)/)?.[1],
    ) / 100;
  assert.ok(share > 0.5, "the fill stays recognisably the theme colour");
  for (const primary of [
    [3, 169, 244],
    [0, 154, 199],
    [78, 148, 196],
  ]) {
    const ratio = 1.05 / (luminance(primary.map((c) => c * share)) + 0.05);
    assert.ok(ratio >= 4.5, `${primary}: ${ratio.toFixed(2)}`);
  }
});
