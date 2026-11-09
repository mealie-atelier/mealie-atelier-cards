/* Meal plan range: pure date logic and entry filtering, shared by the views, the loader and the print sheet. */
const AtelierWeek = (() => {
  const START_MODES = ["monday", "sunday", "today"];
  const ENTRY_TYPES = ["breakfast", "lunch", "dinner", "side", "snack", "drink", "dessert"];
  const MAX_DAYS = 14;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  /** Whole days from 1 to 14; anything unusable falls back to a week. */
  function normalizeDays(value) {
    const n = Math.trunc(Number(value));
    if (!Number.isFinite(n) || value === "" || value === null || value === undefined) return 7;
    return Math.min(MAX_DAYS, Math.max(1, n));
  }
  function normalizeStart(value) {
    return START_MODES.includes(value) ? value : "monday";
  }
  /** Known entry types only, in the given order; a non-list means "all". */
  function normalizeTypes(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((type, i) => ENTRY_TYPES.includes(type) && value.indexOf(type) === i);
  }
  /** First day of the range that contains `date` (midnight, local time). */
  function rangeStart(date, mode) {
    const back =
      { sunday: date.getDay(), today: 0 }[normalizeStart(mode)] ?? (date.getDay() + 6) % 7;
    return addDays(date, -back);
  }
  /** Last day of a range that begins at `start`. */
  function rangeEnd(start, days) {
    return addDays(start, normalizeDays(days) - 1);
  }
  /** Start of the previous (direction -1) or next (direction 1) range. */
  function shiftRange(start, days, direction) {
    return addDays(start, normalizeDays(days) * (direction < 0 ? -1 : 1));
  }
  /** Entries whose type is listed; an empty list keeps everything. */
  function filterEntries(entries, types) {
    const list = Array.isArray(entries) ? entries : [];
    const keep = normalizeTypes(types);
    return keep.length ? list.filter((entry) => keep.includes(entry?.entryType)) : list;
  }
  return {
    ENTRY_TYPES,
    MAX_DAYS,
    normalizeDays,
    normalizeStart,
    normalizeTypes,
    rangeStart,
    rangeEnd,
    shiftRange,
    filterEntries,
  };
})();
