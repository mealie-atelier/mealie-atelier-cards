/**
 * Pure mapping of Mealie shopping items to destination lines (port of the Bridge mapping).
 * No I/O, so every rule here is tested directly.
 */
import { createHash } from "node:crypto";

export const TITLE_MAX = 255;
export const NOTE_IN_TITLE_MAX = 60;
export const DESCRIPTION_MAX = 1000;
// Bring! shows the name and the detail text in two short lines.
export const BRING_NAME_MAX = 100;
export const BRING_SPEC_MAX = 200;
const FRACTIONS = [
  [1 / 4, "1/4"],
  [1 / 3, "1/3"],
  [1 / 2, "1/2"],
  [2 / 3, "2/3"],
  [3 / 4, "3/4"],
];

const text = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");
const truncate = (value, limit) =>
  value.length <= limit ? value : value.slice(0, limit - 1).trimEnd() + "…";

/** Numeric quantity, or null when absent, zero or not a number. */
export function quantityOf(item) {
  const value = item?.quantity;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** Renders a quantity without unit conversion: `1 1/2`, `0,25` or `300`. */
export function formatQuantity(value, { fraction, decimalComma }) {
  if (fraction) {
    const whole = Math.floor(value);
    const rest = value - whole;
    for (const [target, label] of FRACTIONS)
      if (Math.abs(rest - target) <= 0.01) return whole ? `${whole} ${label}` : label;
  }
  const plain = value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return decimalComma ? plain.replace(".", ",") : plain;
}

const foodOf = (item) =>
  item?.food && typeof item.food === "object" && text(item.food.name) ? item.food : null;
const unitOf = (item) => (item?.unit && typeof item.unit === "object" ? item.unit : null);

export function unitText(unit, quantity) {
  if (!unit) return "";
  if (unit.useAbbreviation && text(unit.abbreviation)) return text(unit.abbreviation);
  if (quantity !== null && quantity > 1 && text(unit.pluralName)) return text(unit.pluralName);
  return text(unit.name);
}

/**
 * Returns `{ title, description }` for one source item, or null when it has no text.
 * `quantity` overrides the item's own amount (merged lines); `undefined` means no override.
 * With `layout: "bring"` the line is a Bring! item: `name` is the item name, `spec` its detail
 * text (amount, unit and note) and `title` the readable form `name (spec)` that duplicates are
 * compared by. The note always survives in `spec`, so `description` stays null.
 */
export function mapItem(
  item,
  { decimalComma = false, supportsDescription = false, quantity, layout = "line" } = {},
) {
  const amount = quantity === undefined ? quantityOf(item) : quantity;
  const food = foodOf(item);
  const note = text(item?.note);
  let name;
  let extra = "";
  if (food) {
    const plural = text(food.pluralName);
    name = amount !== null && amount > 1 && plural ? plural : text(food.name);
    extra = note;
  } else if (note) {
    name = note;
  } else {
    // Mealie's display text already carries quantity and unit, so it is used as is.
    const display = text(item?.display);
    if (!display) return null;
    if (layout === "bring") {
      const only = truncate(display, BRING_NAME_MAX);
      return { title: only, description: null, name: only, spec: "" };
    }
    return { title: truncate(display, TITLE_MAX), description: null };
  }
  const unit = unitOf(item);
  const amountText =
    amount !== null ? formatQuantity(amount, { fraction: !!unit?.fraction, decimalComma }) : "";
  const quantityPart = [amountText, unitText(unit, amount)].filter(Boolean).join(" ");
  if (layout === "bring") {
    const label = truncate(name, BRING_NAME_MAX);
    const spec = truncate([quantityPart, extra].filter(Boolean).join(", "), BRING_SPEC_MAX);
    return { title: bringTitle(label, spec), description: null, name: label, spec };
  }
  let title = [quantityPart, name].filter(Boolean).join(" ");
  let description = null;
  if (extra) {
    if (supportsDescription) description = truncate(extra, DESCRIPTION_MAX);
    // The note must survive even when the destination has no description field.
    else title = `${title} (${truncate(extra, NOTE_IN_TITLE_MAX)})`;
  }
  return { title: truncate(title, TITLE_MAX), description };
}

/** The readable form of a Bring! item that lines and destination items are compared by. */
export const bringTitle = (name, spec) => (spec ? `${name} (${spec})` : name);

/** Comparison form of a title: NFKC, casefolded, single spaces, `1,5` equals `1.5`. */
export function normalize(value) {
  if (typeof value !== "string") return "";
  const folded = value.normalize("NFKC").toLowerCase().replaceAll("ß", "ss");
  return folded
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(?<=\d),(?=\d)/g, ".");
}

function refId(item, key, nested) {
  const value = item?.[key];
  if (typeof value === "string" && value) return value;
  const object = item?.[nested];
  return object && typeof object === "object" && typeof object.id === "string" ? object.id : null;
}

/** SHA-256 over the fields that define what was sent; independent of key order. */
export function fingerprint(item, checked) {
  const food = item?.food && typeof item.food === "object" ? item.food : {};
  const unit = unitOf(item) || {};
  const quantity =
    typeof item?.quantity === "number" && Number.isFinite(item.quantity) ? item.quantity : null;
  const canonical = {
    checked: checked === undefined ? !!item?.checked : checked,
    food_id: refId(item, "foodId", "food"),
    food_name: text(food.name) || null,
    note: text(item?.note) || null,
    quantity,
    unit_id: refId(item, "unitId", "unit"),
    unit_name: text(unit.name) || null,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/**
 * Lines merge only with the same food (or note), the same note and the same unit. Requiring an
 * equal note keeps a note such as "festkochend" from vanishing in a merge.
 */
export function mergeKey(item) {
  if (quantityOf(item) === null) return null;
  const note = normalize(item.note);
  const foodId = foodOf(item) ? refId(item, "foodId", "food") : null;
  const unitId = refId(item, "unitId", "unit");
  if (foodId) return JSON.stringify([`food:${foodId}`, note, unitId]);
  if (note) return JSON.stringify(["note", note, unitId]);
  return null;
}

/**
 * Plans one batch in order: what to send, merge, skip as duplicate or skip as empty.
 * `destinationOpen` maps normalised titles of open destination items to their uid (null when
 * unknown or ambiguous), `inFlight` maps normalised titles of other records of the rule that are
 * being sent to their record key. A duplicate of an earlier line in the same batch joins that
 * line as a member (`merged_into`), so it shares the lead's result instead of counting as
 * delivered before the lead was accepted.
 */
export function planBatch(
  entries,
  { policy, decimalComma, supportsDescription, layout, destinationOpen, inFlight },
) {
  const options = { decimalComma, supportsDescription, layout };
  const lines = [];
  const byKey = new Map();
  const groups = new Map();
  for (const [key, item] of entries) {
    const mapped = mapItem(item, options);
    const line = {
      key,
      title: mapped ? mapped.title : "",
      description: mapped ? mapped.description : null,
      name: mapped?.name ?? null,
      spec: mapped?.spec ?? null,
      action: mapped ? "send" : "skip_empty",
      merged_into: null,
      members: [],
      duplicate_of: null,
    };
    lines.push(line);
    byKey.set(key, line);
    if (!mapped || policy !== "skip_exact_merge_same_unit") continue;
    const groupKey = mergeKey(item);
    if (groupKey === null) continue;
    const lead = groups.get(groupKey);
    if (!lead) {
      groups.set(groupKey, { key, item, total: quantityOf(item) });
      continue;
    }
    lead.total += quantityOf(item) || 0;
    line.action = "merge";
    line.merged_into = lead.key;
    byKey.get(lead.key).members.push(key);
    const merged = mapItem(lead.item, { ...options, quantity: Math.round(lead.total * 1e6) / 1e6 });
    Object.assign(byKey.get(lead.key), {
      title: merged.title,
      name: merged.name ?? null,
      spec: merged.spec ?? null,
    });
  }
  if (policy === "none") return lines;
  const planned = new Map();
  for (const line of lines) {
    if (line.action !== "send") continue;
    const title = normalize(line.title);
    if (destinationOpen.has(title)) {
      line.action = "skip_duplicate";
      line.duplicate_of = destinationOpen.get(title);
    } else if (inFlight.has(title)) {
      line.action = "skip_duplicate";
      line.duplicate_of = inFlight.get(title);
    } else if (planned.has(title)) {
      const lead = byKey.get(planned.get(title));
      line.action = "skip_duplicate";
      line.duplicate_of = lead.key;
      line.merged_into = lead.key;
      lead.members.push(line.key, ...line.members);
      for (const member of line.members) byKey.get(member).merged_into = lead.key;
      line.members = [];
    } else {
      planned.set(title, line.key);
    }
  }
  return lines;
}
