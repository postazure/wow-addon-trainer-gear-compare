import { safe } from "./log";

/** One reagent slot: any of these items, this many of them. */
interface ReagentSlot {
  itemIDs: number[];
  quantity: number;
}

/** What a recipe needs and makes. */
export interface Recipe {
  /** Items made by one craft. */
  makes: number;
  slots: ReagentSlot[];
}

/** Recipes never change in a session, so found ones are cached for good. */
const cache = new Map<number, Recipe>();

/** The recipe's spell id, from the trainer tooltip's data. */
function recipeSpellID(index: number): number | undefined {
  const get = C_TooltipInfo?.GetTrainerService;
  if (get === undefined) return undefined;
  const info = safe("trainer service info", () => get(index));
  if (info === undefined) return undefined;
  const spellType = Enum?.TooltipDataType?.Spell;
  if (spellType !== undefined && info.type !== spellType) return undefined;
  const id = info.id;
  return typeof id === "number" && id > 0 ? id : undefined;
}

/** Required slots only. Without the enum, every slot that needs something counts. */
function isRequired(slot: ReagentSlotSchematic): boolean {
  const basic = Enum?.CraftingReagentType?.Basic;
  if (basic !== undefined && slot.reagentType !== basic) return false;
  return typeof slot.quantityRequired === "number" && slot.quantityRequired > 0;
}

function toRecipe(schematic: RecipeSchematic): Recipe | undefined {
  const slots: ReagentSlot[] = [];
  for (const slot of schematic.reagentSlotSchematics ?? []) {
    if (!isRequired(slot)) continue;
    const itemIDs: number[] = [];
    for (const reagent of slot.reagents ?? []) {
      if (typeof reagent.itemID === "number" && reagent.itemID > 0) itemIDs.push(reagent.itemID);
    }
    if (itemIDs.length === 0) return undefined;
    slots.push({ itemIDs, quantity: slot.quantityRequired ?? 0 });
  }
  if (slots.length === 0) return undefined;
  const made = schematic.quantityMin;
  return { makes: typeof made === "number" && made >= 1 ? made : 1, slots };
}

/**
 * Reagents and count made for the trainer service at this index, from
 * C_TradeSkillUI.GetRecipeSchematic. Undefined when the client can't say.
 */
export function recipeFor(index: number): Recipe | undefined {
  const getSchematic = C_TradeSkillUI?.GetRecipeSchematic;
  if (getSchematic === undefined) return undefined;
  const spellID = recipeSpellID(index);
  if (spellID === undefined) return undefined;
  const hit = cache.get(spellID);
  if (hit) return hit;
  const schematic = safe("recipe schematic", () => getSchematic(spellID, false));
  if (schematic === undefined) return undefined;
  const recipe = toRecipe(schematic);
  if (recipe) cache.set(spellID, recipe);
  return recipe;
}
