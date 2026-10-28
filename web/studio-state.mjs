/** Durable private-by-default kitchen profile, household pantry, journal and cooking sessions. */
import { mkdir, readFile, writeFile, rename, chmod } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
const DATA_DIR = resolve(process.env.ATELIER_DATA_DIR || join(import.meta.dirname, "data"));
const PATH = join(DATA_DIR, "studio.json");
const VALUE_UNITS = new Set(["g", "ml", "stück"]);
const bad = (m) => Object.assign(new Error(m), { status: 400 });
const str = (s, n = 120) => {
  if (typeof s !== "string" || !s.trim() || s.length > n) throw bad("Invalid text");
  return s.trim();
};
const date = (s) => {
  if (!s) return "";
  if (
    typeof s !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    Number.isNaN(Date.parse(s)) ||
    new Date(s + "T12:00:00Z").toISOString().slice(0, 10) !== s
  )
    throw bad("Invalid date");
  return s;
};
export const initial = () => ({
  revision: 0,
  profile: {
    people: 2,
    maxMinutes: 40,
    diets: [],
    mealStyle: "any",
    kidFriendly: false,
    usePantry: true,
    exclude: [],
    cookbooks: [],
    quietHours: false,
  },
  pantry: [],
  journal: {},
  family: { members: [], session: null },
  savedAt: null,
});
let queue = Promise.resolve();
export async function load() {
  try {
    const json = JSON.parse(await readFile(PATH, "utf8"));
    if (!json || typeof json !== "object" || !Number.isInteger(json.revision))
      throw Error("Invalid studio database");
    return { ...initial(), ...json };
  } catch (e) {
    if (e.code === "ENOENT") return initial();
    throw e;
  }
}
export function apply(state, action, payload = {}) {
  const next = structuredClone(state);
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw bad("Invalid studio payload");
  switch (action) {
    case "profile_set": {
      const people = Number(payload.people),
        maxMinutes = Number(payload.maxMinutes);
      if (
        !Number.isInteger(people) ||
        people < 1 ||
        people > 20 ||
        !Number.isInteger(maxMinutes) ||
        maxMinutes < 5 ||
        maxMinutes > 360
      )
        throw bad("Invalid household size / time budget");
      const allowed = ["vegan", "vegetarian"];
      const diets = Array.isArray(payload.diets) ? payload.diets : [];
      if (diets.length > 2 || diets.some((x) => !allowed.includes(x)))
        throw bad("Unsupported diet tag");
      const mealStyle =
        payload.mealStyle ??
        (diets.includes("vegan") ? "vegan" : diets.includes("vegetarian") ? "vegetarian" : "any");
      if (!["any", "vegetarian", "vegan", "meat", "fish"].includes(mealStyle))
        throw bad("Unsupported meal style");
      const exclude = Array.isArray(payload.exclude) ? payload.exclude : [];
      if (
        exclude.length > 30 ||
        exclude.some((x) => typeof x !== "string" || !x.trim() || x.length > 80)
      )
        throw bad("Invalid excluded ingredients");
      const cookbooks = Array.isArray(payload.cookbooks) ? payload.cookbooks : [];
      if (
        cookbooks.length > 30 ||
        cookbooks.some((x) => typeof x !== "string" || !/^[-a-z0-9]{1,100}$/.test(x))
      )
        throw bad("Invalid cookbook selection");
      next.profile = {
        people,
        maxMinutes,
        diets,
        mealStyle,
        kidFriendly: payload.kidFriendly === true,
        usePantry: payload.usePantry !== false,
        exclude: exclude.map((x) => x.trim()),
        cookbooks: [...new Set(cookbooks)],
        quietHours: payload.quietHours === true,
      };
      break;
    }
    case "pantry_put": {
      const name = str(payload.name),
        amount = Number(payload.amount),
        unit = str(payload.unit, 12);
      if (!Number.isFinite(amount) || amount < 0 || amount > 1e7 || !VALUE_UNITS.has(unit))
        throw bad("Invalid pantry amount / unit");
      const row = {
        id: payload.id ? str(payload.id, 80) : randomUUID(),
        name,
        amount,
        unit,
        expires: date(payload.expires),
        staple: payload.staple === true,
      };
      const i = next.pantry.findIndex((x) => x.id === row.id);
      if (i >= 0) next.pantry[i] = row;
      else {
        if (next.pantry.length >= 300) throw bad("Pantry limit reached");
        next.pantry.push(row);
      }
      break;
    }
    case "pantry_delete": {
      next.pantry = next.pantry.filter((x) => x.id !== str(payload.id, 80));
      break;
    }
    case "journal_set": {
      const slug = str(payload.slug, 150),
        note = String(payload.note || "");
      const rating = Number(payload.rating) || 0;
      if (note.length > 1200 || !Number.isInteger(rating) || rating < 0 || rating > 5)
        throw bad("Invalid review");
      next.journal[slug] = {
        rating,
        note,
        lastCooked:
          payload.cooked === true
            ? new Date().toISOString()
            : next.journal[slug]?.lastCooked || null,
        favorite: payload.favorite === true,
        updated: new Date().toISOString(),
      };
      if (Object.keys(next.journal).length > 1500) throw bad("Too many journal entries");
      break;
    }
    case "family_member": {
      if (payload.remove) {
        const memberId = str(payload.id, 80);
        if (next.family.session?.tasks.some((x) => x.memberId === memberId))
          throw bad("This person still has cooking tasks. Remove or finish the tasks first.");
        next.family.members = next.family.members.filter((x) => x.id !== memberId);
        break;
      }
      const member = {
        id: payload.id ? str(payload.id, 80) : randomUUID(),
        name: str(payload.name, 60),
        child: payload.child === true,
      };
      const i = next.family.members.findIndex((x) => x.id === member.id);
      if (i >= 0) next.family.members[i] = member;
      else {
        if (next.family.members.length >= 20) throw bad("Too many family members");
        next.family.members.push(member);
      }
      break;
    }
    case "session_start": {
      if (next.family.session && payload.replace_existing !== true)
        throw Object.assign(
          new Error("A cooking session is already active. Confirm replacing it first."),
          { status: 409 },
        );
      const slug = str(payload.slug, 150),
        name = str(payload.name, 180);
      next.family.session = {
        id: randomUUID(),
        slug,
        name,
        step: 0,
        started: new Date().toISOString(),
        tasks: [],
        timers: [],
        revision: 0,
      };
      break;
    }
    case "session_step": {
      const s = next.family.session;
      if (!s || s.id !== payload.session_id) throw bad("Cooking session changed");
      const step = Number(payload.step);
      if (!Number.isInteger(step) || step < 0 || step > 500) throw bad("Invalid cooking step");
      s.step = step;
      s.revision++;
      break;
    }
    case "session_task": {
      const s = next.family.session;
      if (!s || s.id !== payload.session_id) throw bad("Cooking session changed");
      if (payload.remove) {
        s.tasks = s.tasks.filter((x) => x.id !== str(payload.id, 80));
        break;
      }
      const existing = s.tasks.find((x) => x.id === payload.id);
      if (existing && Object.keys(payload).sort().join(",") === "done,id,session_id")
        payload = { ...existing, ...payload };
      const t = {
        id: payload.id ? str(payload.id, 80) : randomUUID(),
        text: str(payload.text, 300),
        memberId: str(payload.memberId, 80),
        done: payload.done === true,
        adultApproved: payload.adultApproved === true,
      };
      if (!next.family.members.some((m) => m.id === t.memberId)) throw bad("Unknown family member");
      if (next.family.members.find((m) => m.id === t.memberId)?.child && !t.adultApproved)
        throw bad("Child task needs adult approval");
      const i = s.tasks.findIndex((x) => x.id === t.id);
      if (i >= 0) s.tasks[i] = t;
      else {
        if (s.tasks.length >= 40) throw bad("Too many tasks");
        s.tasks.push(t);
      }
      s.revision++;
      break;
    }
    case "session_timer": {
      const s = next.family.session;
      if (!s || s.id !== payload.session_id) throw bad("Cooking session changed");
      if (payload.remove) {
        s.timers = s.timers.filter((x) => x.id !== str(payload.id, 80));
        break;
      }
      const minutes = Number(payload.minutes);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240 || s.timers.length >= 16)
        throw bad("Invalid timer");
      s.timers.push({
        id: randomUUID(),
        name: str(payload.name, 70),
        deadline: Date.now() + minutes * 60000,
      });
      s.revision++;
      break;
    }
    case "session_end": {
      if (next.family.session?.id !== payload.session_id) throw bad("Cooking session changed");
      next.family.session = null;
      break;
    }
    default:
      throw bad("Unknown studio operation");
  }
  next.revision = state.revision + 1;
  next.savedAt = new Date().toISOString();
  return next;
}
export async function update(action, payload, expectedRevision) {
  const task = queue.then(async () => {
    const state = await load();
    if (
      expectedRevision !== undefined &&
      expectedRevision !== null &&
      Number(expectedRevision) !== state.revision
    )
      throw Object.assign(new Error("Data changed on another device. Refresh before editing"), {
        status: 409,
      });
    const next = apply(state, action, payload);
    await mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
    const temp = PATH + "." + randomUUID() + ".tmp";
    await writeFile(temp, JSON.stringify(next, null, 2), { mode: 0o600, flag: "wx" });
    await chmod(temp, 0o600);
    await rename(temp, PATH);
    return next;
  });
  queue = task.catch(() => {});
  return task;
}
