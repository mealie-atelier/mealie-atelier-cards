const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/gi, "ss")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}:.-]+/gu, " ")
    .trim();

function parseQuery(query) {
  let text = normalize(query);
  const maxMatch = text.match(/\b(?:under|unter|max(?:imal)?|less than)\s*(\d+)\s*(?:min(?:ute)?s?)?\b/);
  const servingMatch = text.match(/\b(?:for|fur|serves?|portion(?:en)?|personen?)\s*(\d+)\b/);
  const maxMinutes = maxMatch ? Number(maxMatch[1]) : null;
  const servings = servingMatch ? Number(servingMatch[1]) : null;
  if (maxMatch) text = text.replace(maxMatch[0], " ");
  if (servingMatch) text = text.replace(servingMatch[0], " ");

  const diets = [];
  for (const [pattern, key] of [[/\bvegan\b/, "vegan"], [/\b(?:vegetarian|vegetarisch)\b/, "vegetarian"]]) {
    if (pattern.test(text)) {
      diets.push(key);
      text = text.replace(pattern, " ");
    }
  }
  const requiredIngredient = text.match(/\b(?:ingredient|zutat):\s*([\p{L}\p{N} -]+)/u)?.[1]?.trim() || "";
  if (requiredIngredient) text = text.replace(/\b(?:ingredient|zutat):\s*[\p{L}\p{N} -]+/u, " ");
  const excludeMatch = text.match(/\b(?:without|ohne|exclude):?\s*([\p{L}\p{N} -]+)/u);
  const excluded = excludeMatch?.[1]?.trim() || "";
  if (excludeMatch) text = text.replace(excludeMatch[0], " ");

  const stopWords = new Set(["a", "an", "and", "der", "die", "das", "for", "in", "mit", "of", "the", "to", "und", "with"]);
  const freeTerms = text.split(/\s+/).filter((term) => term && !stopWords.has(term));
  return {
    maxMinutes,
    servings,
    diets,
    requiredIngredient: normalize(requiredIngredient),
    excluded: normalize(excluded),
    freeTerms,
  };
}

function duration(recipe) {
  const direct = Number(recipe.totalTime);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const text = String(recipe.totalTime || "");
  const hours = Number(text.match(/(\d+)\s*(?:h|hours?)/i)?.[1] || 0);
  const minutes = Number(text.match(/(\d+)\s*(?:m|min|minutes?)/i)?.[1] || 0);
  return hours * 60 + minutes;
}

function recipeServings(recipe) {
  const direct = Number(recipe.recipeServings);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const explicit = String(recipe.recipeYield || "").match(/(?:^|\D)(\d+)\s*(?:portions?|servings?|people|personen)/i);
  return explicit ? Number(explicit[1]) : null;
}

function fields(recipe) {
  const ingredients = (recipe.recipeIngredient || []).map((row) => row.display || row.food?.name || "");
  return {
    title: normalize(recipe.name),
    ingredientText: normalize(ingredients.join(" ")),
    metadata: normalize([
      recipe.description,
      ...(recipe.searchTerms || []),
      ...(recipe.tags || []).map((tag) => typeof tag === "string" ? tag : tag.name),
      ...(recipe.recipeCategory || []).map((category) => category.name),
      ...(recipe.recipeCuisine || []).map((cuisine) => cuisine.name),
    ].join(" ")),
    tags: normalize((recipe.tags || []).map((tag) => typeof tag === "string" ? tag : tag.name).join(" ")),
  };
}

export function searchDemoRecipes(recipes, details, query) {
  const parsed = parseQuery(query);
  const detailsBySlug = new Map(details.map((recipe) => [recipe.slug, recipe]));
  return recipes
    .map((summary) => ({ summary, detail: detailsBySlug.get(summary.slug) || summary }))
    .filter(({ detail }) => {
      const indexed = fields(detail);
      const haystack = `${indexed.title} ${indexed.ingredientText} ${indexed.metadata} ${indexed.tags}`;
      if (parsed.diets.some((diet) => !indexed.tags.includes(diet))) return false;
      if (parsed.maxMinutes !== null && duration(detail) > parsed.maxMinutes) return false;
      if (parsed.servings !== null && recipeServings(detail) !== parsed.servings) return false;
      if (parsed.requiredIngredient && !indexed.ingredientText.includes(parsed.requiredIngredient)) return false;
      if (parsed.excluded && indexed.ingredientText.includes(parsed.excluded)) return false;
      return parsed.freeTerms.every((term) => haystack.includes(term));
    })
    .sort((left, right) => {
      const score = ({ summary, detail }) => {
        const indexed = fields(detail);
        return parsed.freeTerms.reduce((total, term) => total + (indexed.title.includes(term) ? 8 : indexed.ingredientText.includes(term) ? 5 : 1), 0);
      };
      return score(right) - score(left) || left.summary.name.localeCompare(right.summary.name);
    })
    .map(({ summary }) => summary);
}
