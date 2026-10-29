import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

// GitHub counts these files in the community profile. Own copies make the score independent of
// whether the organization defaults are inherited.
test("the repository carries every file the GitHub community profile counts", () => {
  for (const name of [
    "README.md",
    "CONTRIBUTING.md",
    "LICENSE",
    ".github/CODE_OF_CONDUCT.md",
    ".github/pull_request_template.md",
    ".github/ISSUE_TEMPLATE/bug_report.md",
  ])
    assert.ok(read(name).trim().length > 100, `${name} is missing or empty`);
  assert.match(read(".github/CODE_OF_CONDUCT.md"), /^# Contributor Covenant Code of Conduct/);
});
