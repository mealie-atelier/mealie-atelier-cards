function matchLocaleTag(value) {
  const tag = String(value || "")
    .trim()
    .replaceAll("_", "-")
    .toLowerCase();
  if (!tag) return "";
  const locales = Object.keys(LABELS);
  return (
    locales.find((locale) => locale.toLowerCase() === tag) ||
    locales.find((locale) => locale.toLowerCase() === tag.split("-", 1)[0]) ||
    ""
  );
}

function resolveLanguage(preference, hassLanguage, browserLanguage) {
  if (preference && preference !== "auto") return matchLocaleTag(preference) || "en";
  return matchLocaleTag(hassLanguage) || matchLocaleTag(browserLanguage) || "en";
}

function translateLabel(locale, key, values = {}) {
  let message = LABELS[locale]?.[key] ?? LABELS.en?.[key] ?? key;
  if (typeof message !== "string") return key;
  return message.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (token, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : token,
  );
}

function translatePluralLabel(locale, key, count, values = {}) {
  const language = matchLocaleTag(locale) || "en";
  const category = new Intl.PluralRules(language).select(Number(count));
  const pluralKey = `${key}.${category}`;
  return translateLabel(
    language,
    LABELS[language]?.[pluralKey] !== undefined ? pluralKey : `${key}.other`,
    { ...values, count },
  );
}
