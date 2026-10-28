import { petLabels, type ActivePet, type Product } from "./types";
export function matchProduct(product: Product, pet: ActivePet) {
  const conflicts = pet.allergies.filter((allergen) =>
    product.allergens.includes(allergen),
  );
  const stage =
    pet.ageMonths < 12 ? "JUNIOR" : pet.ageMonths >= 84 ? "SENIOR" : "ADULT";
  const sameSpecies = product.type === pet.type;
  const sameStage = product.lifeStages.includes(stage);
  const safe = sameSpecies && (product.kind === "SUPPLIES" || (sameStage && conflicts.length === 0));
  const label = !sameSpecies
    ? `${petLabels[product.type]}適用`
    : product.kind === "SUPPLIES"
      ? `適合${pet.name}的生活用品`
    : conflicts.length
      ? `過敏原警示：${conflicts.join("、")}`
      : !sameStage
        ? "不適合目前年齡"
        : `為${pet.name}專屬精選`;
  return {
    conflicts,
    sameSpecies,
    sameStage,
    safe,
    label,
    score: safe ? 3 : !sameSpecies ? 0 : conflicts.length ? 1 : 2,
  };
}
