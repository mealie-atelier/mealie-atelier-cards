// Build a standalone print document and escape every Mealie field before rendering it.
function buildPrintDocument(
  kind,
  { recipe, shopping, mealplan, activeList, weekStart, locale, settings, translate },
) {
  const t = (key, values) => (typeof translate === "function" ? translate(key, values) : key);
  const words = {
    recipe: t("printDocRecipe"),
    shopping: t("printDocShoppingList"),
    week: t("printDocWeeklyPlan"),
    ingredients: t("ingredients"),
    method: t("instructions"),
    servings: t("servings"),
    time: t("printDocTotalTime"),
    notes: kind === "recipe" ? t("journalNote") : t("printNotes"),
    items: t("items"),
    checked: t("done"),
    print: t("printSavePdf"),
    close: t("printDocCloseWindow"),
    created: t("printDocFromYourKitchen"),
    empty: t("printDocNoItems"),
    made: t("printMadeWithLove"),
    page: t("printDocYourWeeklyPlan"),
    dishes: t("printDocMeals"),
    noPlan: t("noPlan"),
    shop: t("shopping"),
    listed: t("printDocListed"),
    nutrition: t("nutrition"),
    nutritionCaution: t("printDocNutritionCaution"),
  };
  const style = ["editorial", "compact", "minimal"].includes(settings?.print_style)
    ? settings.print_style
    : "editorial";
  const notes = settings?.print_notes !== false;
  const checkboxes = settings?.print_checkboxes !== false;
  const includeCompleted = settings?.print_completed === true;
  const includeNutrition = settings?.print_nutrition === true;
  const time = (value) =>
    value === undefined || value === null || value === "" ? "" : String(value);
  const duration = (value) => {
    if (typeof value === "number") return `${value} ${t("printDocMinAbbr")}`;
    const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(String(value || ""));
    return m
      ? [m[1] ? `${m[1]} h` : "", m[2] ? `${m[2]} min` : ""].filter(Boolean).join(" ")
      : time(value);
  };
  const mealType = (value) =>
    ({
      breakfast: t("breakfast"),
      lunch: t("lunch"),
      dinner: t("dinner"),
      side: t("printDocSide"),
      dessert: t("printDocDessert"),
      drink: t("printDocDrink"),
      snack: t("printDocSnack"),
    })[value] || value;
  const meta = (label, value) =>
    value !== ""
      ? `<div class="meta-box"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`
      : "";
  const tick = () => (checkboxes ? '<span class="tick" aria-hidden="true"></span>' : "");
  const textRow = (value) =>
    `<div class="ingredient-row">${tick()}<span>${esc(value)}</span></div>`;
  const data = Array.isArray(recipe?.recipeIngredient) ? recipe.recipeIngredient : [];
  const instructions = Array.isArray(recipe?.recipeInstructions) ? recipe.recipeInstructions : [];
  const description = String(recipe?.description || "").trim();
  const longFlow =
    instructions.length > 10 ||
    data.length > 18 ||
    instructions.some((x) => instructionText(x).length > 450);
  const printMacro = (label, value) => {
    const clean = String(value ?? "").trim();
    return clean
      ? `<div class="nutrition-macro"><strong>${esc(clean)}</strong><span>${esc(label)}</span></div>`
      : "";
  };
  const nutritionData = recipe?.nutrition;
  const nutrition =
    kind === "recipe" && includeNutrition && nutritionData && typeof nutritionData === "object"
      ? `<section class="nutrition-print"><h2>${esc(words.nutrition)}</h2><div class="nutrition-macros">${[
          printMacro(t("printDocCalories"), nutritionData.calories),
          printMacro(t("printDocProtein"), nutritionData.proteinContent),
          printMacro(t("printDocCarbs"), nutritionData.carbohydrateContent),
          printMacro(t("printDocFat"), nutritionData.fatContent),
          printMacro(t("printDocFiber"), nutritionData.fiberContent),
          printMacro(t("printDocSugar"), nutritionData.sugarContent),
        ].join("")}</div><p class="nutrition-footnote">${esc(words.nutritionCaution)}</p></section>`
      : "";
  const photo =
    kind === "recipe" &&
    style !== "minimal" &&
    settings?.print_image === true &&
    imageOk(recipe?.imageUrl)
      ? `<div class="recipe-photo"><img src="${esc(imageOk(recipe.imageUrl))}" alt="" /></div>`
      : "";
  const noteLines =
    notes && !(kind === "recipe" && instructions.length > 18)
      ? `<section class="note-section"><h2>${esc(words.notes)}</h2><div class="write-line"></div><div class="write-line"></div></section>`
      : "";
  let heading = "",
    body = "",
    landscape = kind === "mealplan";
  if (kind === "recipe") {
    const servings = AtelierStudio.recipeServings(recipe);
    const yieldLabel =
      recipe?.recipeYieldQuantity && recipe?.recipeYield
        ? `${recipe.recipeYieldQuantity} ${recipe.recipeYield}`
        : time(recipe?.recipeYield);
    heading = `<div class="eyebrow">${esc(words.recipe)} · ${esc(words.created)}</div><h1>${esc(recipe?.name || words.recipe)}</h1>${description ? `<p class="dek">${esc(description)}</p>` : ""}
       <div class="meta-grid">${meta(servings ? words.servings : t("printDocYield"), servings ? `${servings} ${words.servings}` : yieldLabel)}${meta(words.time, duration(recipe?.totalTime))}</div>`;
    const list = data.length
      ? data.map((row) => textRow(ingredientName(row))).join("")
      : `<p class="quiet">${esc(words.empty)}</p>`;
    const process = instructions.length
      ? instructions
          .map(
            (row, i) =>
              `<div class="method-row"><span class="method-index">${String(i + 1).padStart(2, "0")}</span><p>${esc(instructionText(row))}</p></div>`,
          )
          .join("")
      : `<p class="quiet">${esc(words.empty)}</p>`;
    body = `${photo}${nutrition}<div class="recipe-columns ${longFlow ? "long-flow" : ""}"><section class="ingredients"><h2>${esc(words.ingredients)} <span class="count">${data.length}</span></h2>${list}</section>
    <section class="method"><h2>${esc(words.method)}</h2>${process}</section></div>${noteLines}`;
  } else if (kind === "shopping") {
    const lists = asArray(shopping?.lists);
    const selected = lists.find((x) => String(x.id) === String(activeList)) || lists[0];
    const id = selected?.id;
    const items = asArray(shopping?.items).filter(
      (x) => String(x.shoppingListId) === String(id) && (includeCompleted || !x.checked),
    );
    heading = `<div class="eyebrow">${esc(words.shopping)} · ${esc(words.created)}</div><h1>${esc(selected?.name || words.shop)}</h1>
      <p class="dek">${esc(t(items.length === 1 ? "printDocItems.one" : "printDocItems.other", { count: items.length }))} · ${esc(new Intl.DateTimeFormat(locale || "de-DE", { day: "numeric", month: "long", year: "numeric" }).format(new Date()))}</p>`;
    body = `<section class="shopping-print"><h2>${esc(words.shop)}</h2><div class="shopping-items ${items.length > 12 ? "two-columns" : ""}">
      ${items.length ? items.map((item) => `<div class="shopping-print-row">${tick()}<span>${esc(item.display || item.note || item.food?.name || "")}</span><b>${item.quantity && item.quantity !== 1 ? esc(item.quantity) : ""}</b></div>`).join("") : `<p class="quiet">${esc(words.empty)}</p>`}
      </div></section>${noteLines}`;
  } else if (kind === "mealplan") {
    const mondayDate =
      weekStart instanceof Date && !Number.isNaN(weekStart.getTime())
        ? weekStart
        : monday(new Date());
    const lastDate = addDays(mondayDate, 6);
    const period = `${dayString(locale || "de-DE", mondayDate, { day: "numeric", month: "short" })} – ${dayString(locale || "de-DE", lastDate, { day: "numeric", month: "short", year: "numeric" })}`;
    heading = `<div class="eyebrow">${esc(words.week)} · ${esc(words.created)}</div><h1>${esc(words.page)}</h1><p class="dek">${esc(period)}</p>`;
    const all = asArray(mealplan);
    body = `<section class="week-print">${Array.from({ length: 7 }, (_, i) => {
      const d = addDays(mondayDate, i),
        ymd = dateYmd(d),
        meals = all.filter((x) => x.date === ymd);
      return `<div class="week-day"><div class="weekday">${esc(dayString(locale || "de-DE", d, { weekday: "long" }))}<strong>${esc(dayString(locale || "de-DE", d, { day: "numeric", month: "short" }))}</strong></div>
        ${meals.length ? meals.map((meal) => `<div class="week-meal"><small>${esc(mealType(meal.entryType || ""))}</small><b>${esc(mealName(meal))}</b></div>`).join("") : `<p>${esc(words.noPlan)}</p>`}</div>`;
    }).join("")}</section>${noteLines}`;
  } else {
    throw Error("Unsupported print document");
  }
  const pageName =
    kind === "recipe" ? recipe?.name : kind === "shopping" ? words.shopping : words.week;
  const css = `
  :root{--paper:#fffefb;--ink:#22352d;--soft:#627568;--sage:#8a9e8d;--rule:#d7ded5;--pale:#f1f4ef}
  *{box-sizing:border-box} html,body{margin:0} body{background:#e8ede8;color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
  .print-toolbar{position:sticky;top:0;z-index:10;background:#1b2c25;padding:14px 20px;display:flex;gap:10px;justify-content:center;align-items:center;box-shadow:0 9px 30px #0002}
  .print-toolbar button{border:1px solid #ffffff55;background:transparent;color:white;border-radius:10px;padding:11px 16px;font:650 13px inherit;cursor:pointer}
  .print-toolbar .primary{background:#a8c5ac;color:#15291c;border:0;font-weight:750}
  .sheet{width:210mm;min-height:297mm;margin:26px auto 40px;background:var(--paper);padding:17mm 17mm 14mm;box-shadow:0 22px 60px #1831222e}
  .sheet.landscape{width:297mm;min-height:210mm;padding:15mm 17mm}
  .masthead{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--rule);padding-bottom:12px;margin-bottom:30px;color:var(--soft);font-size:9px;font-weight:800;letter-spacing:2px}
  .masthead .atelier-credit{font-size:8px;font-weight:600;letter-spacing:.35px;text-transform:none;white-space:nowrap;color:var(--soft)}.masthead .atelier-credit a{text-decoration:none;color:inherit;border-bottom:1px solid currentColor}.atelier-credit-heart{color:#b66d67}
  .logo{font-size:12px;color:var(--ink);letter-spacing:1.7px}.logo b{color:#7c9c87}
  .eyebrow{color:#779583;font-weight:800;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px}
  h1{font-family:Georgia,"Times New Roman",serif;font-size:38px;font-weight:400;line-height:1.12;letter-spacing:-1.15px;max-width:700px;margin:0 0 12px}
  .dek{font-size:11px;line-height:1.6;color:var(--soft);max-width:600px;margin:0 0 21px}
  .meta-grid{display:flex;gap:28px;flex-wrap:wrap;margin:24px 0 31px}
  .meta-box span{display:block;color:var(--soft);font-size:9px;text-transform:uppercase;letter-spacing:1.7px;margin-bottom:5px}
  .meta-box strong{font-size:13px;font-weight:700}
  h2{font-size:11px;letter-spacing:2.4px;font-weight:850;color:var(--ink);text-transform:uppercase;display:flex;align-items:center;gap:9px;margin:0 0 21px;padding-bottom:12px;border-bottom:1px solid var(--rule)}
  .count{color:var(--sage);font-weight:600;letter-spacing:0}
  .recipe-photo{height:48mm;overflow:hidden;margin:-4mm 0 11mm;border-radius:3px;break-inside:avoid}
  .recipe-photo img{display:block;width:100%;height:100%;object-fit:cover}
  .nutrition-print{margin:0 0 10mm;break-inside:avoid;page-break-inside:avoid}.nutrition-print h2{margin-bottom:10px}
  .nutrition-macros{display:flex;flex-wrap:wrap;gap:11px}.nutrition-macro{display:flex;flex-direction:column;gap:4px;min-width:20mm;padding:4px 8px 6px 0}
  .nutrition-macro strong{font-size:14px;font-weight:650;color:var(--ink)}.nutrition-macro span{font-size:9px;color:var(--soft)}
  .nutrition-footnote{font-size:8px;color:var(--soft);margin:5px 0 0;line-height:1.4}
  .recipe-columns{display:grid;grid-template-columns:61mm 1fr;gap:16mm;align-items:start}
  .recipe-columns.long-flow{display:block}.recipe-columns.long-flow .ingredients{margin-bottom:28px}.recipe-columns.long-flow .ingredients .ingredient-row{display:inline-flex;min-width:45%;max-width:100%;padding-right:12px;vertical-align:top}
  .ingredient-row{min-height:31px;display:flex;align-items:start;gap:11px;padding:9px 0;border-bottom:1px solid #edf0eb;font-size:11px;line-height:1.55;break-inside:avoid;page-break-inside:avoid}
  .tick{display:inline-block;flex-shrink:0;border:1.35px solid #93a99a;border-radius:2px;width:13px;height:13px;margin-top:2px}
  .method-row{display:grid;grid-template-columns:28px 1fr;align-items:start;gap:12px;margin:0 0 19px;break-inside:avoid;page-break-inside:avoid}
  .method-index{font-family:Georgia,serif;font-size:21px;line-height:1;color:#779583}
  .method-row p{margin:0;font-size:11px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}
  .quiet{font-size:11px;color:var(--soft)}
  .note-section{margin-top:24px;break-inside:avoid}.note-section h2{margin-bottom:13px}.write-line{border-bottom:1px solid var(--rule);height:19px}
  .shopping-items{max-width:100%}.shopping-items.two-columns{columns:2;column-gap:17mm}
  .shopping-print-row{display:flex;gap:13px;padding:10px 0;border-bottom:1px solid var(--rule);font-size:11px;line-height:1.5;break-inside:avoid}
  .shopping-print-row span:not(.tick){flex:1;overflow-wrap:anywhere}.shopping-print-row b{font-weight:500;color:var(--soft)}
  .week-print{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5mm;align-items:start}
  .week-day{border-top:3px solid #8dab98;padding-top:12px;break-inside:avoid;min-width:0}
  .weekday{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;line-height:1.6;margin-bottom:18px}
  .weekday strong{font-weight:500;font-size:10px;color:var(--soft);display:block;letter-spacing:0;text-transform:none}
  .week-day p{font-size:10px;color:var(--soft)}
  .week-meal{border-bottom:1px solid var(--rule);padding:12px 0;break-inside:avoid}.week-meal small{font-size:9px;letter-spacing:1px;color:var(--soft);display:block;margin-bottom:7px}.week-meal b{font-family:Georgia,serif;font-size:14px;line-height:1.36;font-weight:400;overflow-wrap:anywhere}
  .footer{display:flex;justify-content:space-between;gap:15px;margin-top:30px;padding-top:11px;border-top:1px solid var(--rule);color:var(--soft);font-size:8px;letter-spacing:1.5px;break-inside:avoid}
  .minimal .masthead,.minimal .footer{color:#65716c}.minimal .eyebrow{color:#4f5c56}.minimal .tick{border-color:#67716b}
  .minimal .week-day{border-color:#4f5c56}
  .compact h1{font-size:30px}.compact .masthead{margin-bottom:18px}.compact .meta-grid{margin:12px 0 19px}.compact .ingredient-row{padding:6px 0;min-height:25px}.compact .method-row{margin-bottom:12px}.compact .method-row p{line-height:1.55}.compact .method-index{font-size:18px}.compact h2{margin-bottom:12px}.compact .note-section{margin-top:16px}
  @page{size:${landscape ? "A4 landscape" : "A4 portrait"};margin:${landscape ? "12mm 14mm" : "13mm 15mm"}}
  @media print{
   html,body{background:white!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}
   .print-toolbar{display:none!important}
   .sheet,.sheet.landscape{width:auto!important;min-height:0!important;margin:0!important;padding:0!important;box-shadow:none!important;background:white}
   .masthead{margin-top:0}.footer{margin-top:22px}
   /* Photo recipe: balance a meaningful hero image with a useful, single-sheet note area. */
   .sheet.has-photo .recipe-photo{height:33mm;margin-bottom:6mm}
   .sheet.has-photo .meta-grid{margin:14px 0 19px}
   .sheet.has-photo .note-section{margin-top:13px}
   .sheet.has-photo .footer{margin-top:15px}
   h1,h2,.masthead,.recipe-photo,.meta-grid,.week-day{break-after:avoid;page-break-after:avoid}
   .recipe-columns{break-inside:auto}.recipe-columns.long-flow{display:block}
  }
  @media(max-width:920px){.sheet{transform-origin:top center;max-width:100%;width:auto;min-height:70vh;margin:12px;padding:25px}.sheet.landscape{width:auto;min-height:55vh;padding:25px}.recipe-columns{grid-template-columns:1fr;gap:20px}.week-print{grid-template-columns:repeat(7,minmax(0,1fr))}}
  @media(max-width:590px){.sheet{padding:23px 18px}.print-toolbar{flex-wrap:wrap}.masthead{flex-wrap:wrap}.masthead .atelier-credit{width:100%;justify-content:flex-end}.week-print{grid-template-columns:repeat(2,minmax(0,1fr))}.shopping-items.two-columns{columns:1}h1{font-size:30px}}
  `;
  return `<!DOCTYPE html><html lang="${esc(locale || "en")}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(pageName || "Mealie Atelier")}</title><style>${css}</style></head>
   <body><nav class="print-toolbar"><button type="button" class="primary" id="print-now">${esc(words.print)}</button><button type="button" id="close-print">${esc(words.close)}</button></nav>
   <article class="sheet ${landscape ? "landscape" : ""} ${photo ? "has-photo" : ""} ${esc(style)}"><header class="masthead"><span class="logo">MEALIE <b>ATELIER</b></span><span>${esc(t("printEdition"))}</span>${AtelierUI.attribution({ lead: t("creditMadeWith"), by: t("creditBy") })}</header>
   <section class="document-heading">${heading}</section>${body}${kind === "recipe" && instructions.length > 18 ? "" : `<footer class="footer"><span>${esc(words.made)}</span><span>${esc(words.created)}</span></footer>`}</article></body></html>`;
}
