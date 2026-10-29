import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const dir = new URL("../.github/ISSUE_TEMPLATE/", import.meta.url);

// GitHub only reports an issue_template in the community profile for Markdown templates.
test("issue templates include Markdown files with front matter", () => {
  for (const name of ["bug_report.md", "feature_request.md"]) {
    assert.ok(existsSync(new URL(name, dir)), `${name} is missing`);
    const text = readFileSync(new URL(name, dir), "utf8");
    assert.match(text, /^---\nname: .+\nabout: .+\nlabels: .+\n---\n/, `${name} front matter`);
  }
});

test("issue templates do not duplicate the Markdown templates as forms", () => {
  const forms = readdirSync(dir).filter((n) => /^(bug_report|feature_request)\.ya?ml$/.test(n));
  assert.deepEqual(forms, []);
});
