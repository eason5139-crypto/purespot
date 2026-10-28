import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { supplementalProducts } from "../src/lib/catalogExpansion";

const themes: Record<string, { paper: string; light: string; deep: string; english: string; shape: "bag" | "can" | "pouch" }> = {
  主食乾糧: { paper: "#e5d3be", light: "#f4e7d4", deep: "#8e614b", english: "DAILY DRY FOOD", shape: "bag" },
  主食罐頭: { paper: "#d4e1dc", light: "#ecf4ef", deep: "#477c75", english: "WET FOOD", shape: "can" },
  鮮食餐包: { paper: "#edd4c5", light: "#f9eee4", deep: "#ab6b53", english: "FRESH MEAL", shape: "pouch" },
  凍乾主食: { paper: "#d7dfd7", light: "#edf3eb", deep: "#647d6a", english: "FREEZE DRIED", shape: "bag" },
  風乾主食: { paper: "#e7dcc4", light: "#f6edda", deep: "#89724d", english: "AIR DRIED", shape: "bag" },
  機能配方: { paper: "#ded9e7", light: "#f2eff6", deep: "#796c91", english: "THOUGHTFUL RECIPE", shape: "bag" },
};

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function packageShape(shape: "bag" | "can" | "pouch") {
  if (shape === "can") return '<ellipse cx="300" cy="192" rx="132" ry="28" fill="#f7f5f0" stroke="#cabfb2" stroke-width="3"/><path d="M168 192h264v231c0 23-59 40-132 40s-132-17-132-40Z" fill="url(#pack)" stroke="#d2c5b8" stroke-width="3"/><ellipse cx="300" cy="423" rx="132" ry="28" fill="url(#pack)" stroke="#d2c5b8" stroke-width="3"/><ellipse cx="300" cy="192" rx="132" ry="28" fill="#f7f5f0" stroke="#cabfb2" stroke-width="3"/><ellipse cx="300" cy="192" rx="72" ry="13" fill="none" stroke="#d9cec3" stroke-width="3"/>';
  if (shape === "pouch") return '<path d="M181 142h238l-11 27 18 280c1 17-14 30-30 30H204c-16 0-31-13-30-30l18-280Z" fill="url(#pack)" stroke="#d1c3b4" stroke-width="3"/><path d="M182 168h236M189 184h222" stroke="#c7b6a6" stroke-width="3"/><path d="M208 144h184" stroke="#fffaf3" stroke-width="5" stroke-linecap="round"/>';
  return '<path d="M180 145h240l15 313c1 19-14 33-33 33H198c-19 0-34-14-33-33Z" fill="url(#pack)" stroke="#d2c3b4" stroke-width="3"/><path d="M183 166h234M182 178h236" stroke="#c8b6a7" stroke-width="3"/><path d="M191 145h218" stroke="#fffaf3" stroke-width="5" stroke-linecap="round"/>';
}

async function main() {
  const directory = join(process.cwd(), "public", "images", "products");
  await mkdir(directory, { recursive: true });
  for (const [index, product] of supplementalProducts.entries()) {
    const theme = themes[product.category];
    if (!theme) throw new Error(`Missing theme for ${product.category}`);
    const accent = index % 2 === 0 ? theme.deep : "#9b7559";
    const ingredient = product.ingredients[0] ?? "每日主食";
    const species = product.type === "CAT" ? "貓咪主食" : "狗狗主食";
    const artY = theme.shape === "can" ? 310 : 339;
    const titleY = theme.shape === "can" ? 385 : 420;
    const subtitleY = theme.shape === "can" ? 410 : 447;
    const art = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="${xml(product.name)}概念包裝示意">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${theme.light}"/><stop offset="1" stop-color="${theme.paper}"/></linearGradient><linearGradient id="pack" x2="1" y2="1"><stop stop-color="#fffdf8"/><stop offset="1" stop-color="#eee6d9"/></linearGradient><filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#5c4735" flood-opacity=".18"/></filter></defs>
<rect width="600" height="600" fill="url(#bg)"/><circle cx="300" cy="300" r="238" fill="#fffdf8" opacity=".35"/><circle cx="496" cy="105" r="78" fill="${accent}" opacity=".08"/><circle cx="92" cy="486" r="102" fill="${accent}" opacity=".09"/>
<text x="300" y="63" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" letter-spacing="5" fill="${theme.deep}">PURESPOT / SELECT</text>
<g filter="url(#shadow)">${packageShape(theme.shape)}</g>
<path d="M214 233h172" stroke="${accent}" stroke-width="2" opacity=".35"/><text x="300" y="218" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" font-weight="700" letter-spacing="3" fill="${theme.deep}">PURESPOT</text>
<text x="300" y="259" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" letter-spacing="2.5" fill="${theme.deep}">${theme.english}</text>
<circle cx="300" cy="${artY}" r="${theme.shape === "can" ? 46 : 60}" fill="${accent}" opacity=".14"/><ellipse cx="283" cy="${artY - 4}" rx="35" ry="19" fill="${accent}" opacity=".42" transform="rotate(-28 283 ${artY - 4})"/><ellipse cx="321" cy="${artY - 1}" rx="34" ry="18" fill="${accent}" opacity=".3" transform="rotate(27 321 ${artY - 1})"/><path d="M271 ${artY + 18}q29-40 58-45" fill="none" stroke="${theme.deep}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
<text x="300" y="${titleY}" text-anchor="middle" font-family="Noto Sans TC,Microsoft JhengHei,sans-serif" font-size="26" font-weight="700" fill="#3a332d">${xml(product.name)}</text>
<text x="300" y="${subtitleY}" text-anchor="middle" font-family="Noto Sans TC,Microsoft JhengHei,sans-serif" font-size="14" fill="${theme.deep}">${xml(ingredient)} · ${xml(species)}</text>
<text x="300" y="545" text-anchor="middle" font-family="Noto Sans TC,Microsoft JhengHei,sans-serif" font-size="13" letter-spacing="2" fill="${theme.deep}">概念包裝示意  /  ${product.bagGrams} g</text>
</svg>`;
    await writeFile(join(directory, `${product.id}.svg`), art, "utf8");
  }
  console.info(`Generated ${supplementalProducts.length} product illustrations`);
}

void main();
