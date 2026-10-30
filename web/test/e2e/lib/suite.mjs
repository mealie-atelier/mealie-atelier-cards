// Per-file browser lifecycle for node:test specs: launch in `before`, always close in `after`.
import { before, after } from "node:test";
import { launch } from "./browser.mjs";

export function browserSuite() {
  const state = { browser: null };
  before(async () => {
    state.browser = await launch();
  });
  after(async () => {
    await state.browser?.close();
  });
  return state;
}
