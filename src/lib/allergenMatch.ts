// Only known food aliases are grouped. Unknown terms still use a conservative
// literal match against the declared allergens and ingredient list.
const aliases: Record<string, string[]> = {
  CHICKEN: ["雞", "雞肉", "雞油", "雞脂", "雞肝", "雞粉", "chicken"],
  POULTRY: [
    "禽肉",
    "家禽",
    "poultry",
    "雞",
    "雞肉",
    "雞油",
    "鴨",
    "鴨肉",
    "鴨油",
  ],
  BEEF: ["牛", "牛肉", "牛脂", "牛肝", "牛粉", "beef"],
  FISH: [
    "魚",
    "魚類",
    "魚肉",
    "魚油",
    "魚粉",
    "鮭魚",
    "三文魚",
    "鮪魚",
    "鯖魚",
    "鱈魚",
    "fish",
    "salmon",
    "tuna",
    "cod",
  ],
  SOY: ["大豆", "黃豆", "豆漿", "豆腐", "豆粕", "soy", "soybean"],
  DAIRY: [
    "乳",
    "乳製品",
    "牛奶",
    "奶粉",
    "乳清",
    "起司",
    "dairy",
    "milk",
    "whey",
    "cheese",
  ],
  WHEAT: ["小麥", "麵粉", "麥麩", "wheat", "gluten"],
  EGG: ["蛋", "雞蛋", "蛋粉", "蛋白", "egg"],
  PORK: ["豬", "豬肉", "豬油", "pork"],
  DUCK: ["鴨", "鴨肉", "鴨油", "duck"],
};

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s\-_/()（）]+/g, "");
}

function groupFor(value: string) {
  const normalized = normalize(value);
  if (["禽肉", "家禽", "poultry"].some((term) => normalize(term) === normalized))
    return "POULTRY";
  return Object.entries(aliases).find(([group, names]) =>
    group !== "POULTRY" &&
    names.some((name) => normalize(name) === normalized),
  )?.[0];
}

export function allergenConflicts(
  petAllergies: string[],
  productAllergens: string[],
  ingredients: string[],
) {
  const declared = [...productAllergens, ...ingredients]
    .map(normalize)
    .filter(Boolean);
  return petAllergies.filter((allergy) => {
    const normalized = normalize(allergy);
    if (!normalized) return false;
    const group = groupFor(allergy);
    const terms = group
      ? [
          ...aliases[group]!,
          ...(group === "CHICKEN" || group === "DUCK"
            ? ["禽肉", "家禽", "poultry"]
            : []),
        ].map(normalize)
      : [normalized];
    return declared.some((item) => terms.some((term) => item.includes(term)));
  });
}
