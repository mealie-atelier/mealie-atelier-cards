/** Pure mapping for the built-in Home Assistant Mealie integration (meal plan and shopping lists). */

/** Rows of a `mealie.get_mealplan` response in the shape the meal plan views read. */
export function mapNativeMealplan(response) {
  const rows = Array.isArray(response?.mealplan) ? response.mealplan : [];
  return rows
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const recipe = row.recipe && typeof row.recipe === "object" ? row.recipe : null;
      return {
        id: row.mealplan_id,
        entryType: row.entry_type,
        date: String(row.mealplan_date || "").slice(0, 10),
        title: row.title || "",
        text: row.description || "",
        recipe: recipe
          ? { ...recipe, id: recipe.id || recipe.recipe_id || recipe.slug, imageUrl: "" }
          : null,
      };
    });
}

/** Entity ids of the todo lists that belong to the built-in Mealie integration. */
export function nativeTodoEntityIds(entities) {
  return Object.values(entities || {})
    .filter(
      (entity) =>
        entity?.platform === "mealie" &&
        typeof entity.entity_id === "string" &&
        entity.entity_id.startsWith("todo."),
    )
    .map((entity) => entity.entity_id);
}

/** Shopping data in the shape the shopping view reads; `responses` maps entity id to its get_items answer. */
export function mapNativeShopping(entityIds, states, responses) {
  const lists = [];
  const items = [];
  for (const entityId of entityIds) {
    const rows = responses?.[entityId]?.items;
    if (!Array.isArray(rows)) continue;
    lists.push({ id: entityId, name: states?.[entityId]?.attributes?.friendly_name || entityId });
    for (const row of rows) {
      if (!row || row.uid == null) continue;
      const summary = String(row.summary || "");
      items.push({
        id: String(row.uid),
        display: summary,
        note: summary,
        checked: row.status === "completed",
        shoppingListId: entityId,
      });
    }
  }
  return { lists, items };
}
