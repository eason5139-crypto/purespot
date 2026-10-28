import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(new URL("../src/lib/lifestyleProducts.ts", import.meta.url), "utf8");
const rows = [...source.matchAll(/^  \["([\w-]+)", "([^"]+)", "([^"]+)", "[A-Z]+", "([^"]+)",/gm)];
if (rows.length !== 30) throw new Error(`Expected 30 lifestyle products, found ${rows.length}`);
const palettes = [
  ["#e9d9c8", "#ad7657", "#f7ede1"], ["#dde8df", "#64826a", "#f2f7f0"],
  ["#e6e1ef", "#807496", "#f7f4fa"], ["#f0ddd3", "#a96961", "#fff1e9"],
  ["#dce8e9", "#638b93", "#f2faf8"], ["#ebdfc9", "#937d54", "#fbf4e8"],
];
const escape = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const motifs = {
  "小動物主食": '<path d="M210 320c18-52 52-83 90-83s72 31 90 83" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round"/><path d="M224 321h152c-8 42-31 64-76 64s-68-22-76-64Z" fill="currentColor" opacity=".26"/><circle cx="259" cy="281" r="9" fill="currentColor"/><circle cx="302" cy="263" r="9" fill="currentColor"/><circle cx="343" cy="284" r="9" fill="currentColor"/>',
  "零食點心": '<path d="M223 299c-17-24-3-56 25-57 17-1 29 12 40 26 11-14 23-27 40-26 28 1 42 33 25 57l-65 74Z" fill="currentColor" opacity=".28" stroke="currentColor" stroke-width="9"/><circle cx="288" cy="286" r="14" fill="currentColor"/>',
  "玩具互動": '<circle cx="300" cy="307" r="68" fill="none" stroke="currentColor" stroke-width="12"/><path d="M237 286c35 3 53 19 61 86M328 241c-27 41-20 87 33 115M260 246c48 27 96 27 123 9" fill="none" stroke="currentColor" stroke-width="8" opacity=".65"/>',
  "居家用品": '<path d="m207 307 93-78 93 78v84H207Z" fill="currentColor" opacity=".23" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/><path d="M272 390v-52a28 28 0 0 1 56 0v52" fill="none" stroke="currentColor" stroke-width="10"/>',
  "清潔照護": '<path d="M262 263h76l10 100a20 20 0 0 1-20 22h-56a20 20 0 0 1-20-22Z" fill="currentColor" opacity=".22" stroke="currentColor" stroke-width="10"/><path d="M271 250v-24h58v24M287 311h26M278 333h44" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>',
  "外出用品": '<rect x="216" y="280" width="168" height="112" rx="20" fill="currentColor" opacity=".23" stroke="currentColor" stroke-width="10"/><path d="M258 279v-21c0-26 84-26 84 0v21M257 334h86" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>',
};
for (const [index, match] of rows.entries()) {
  const [, id, name, pet, category] = match;
  const [background, accent, paper] = palettes[index % palettes.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="${escape(name)}概念商品圖">
<defs><filter id="s"><feDropShadow dx="0" dy="22" stdDeviation="16" flood-color="#604936" flood-opacity=".18"/></filter><linearGradient id="g" x2="1" y2="1"><stop stop-color="${paper}"/><stop offset="1" stop-color="#fffdf8"/></linearGradient></defs>
<rect width="600" height="600" fill="${background}"/><circle cx="300" cy="286" r="235" fill="#fff" opacity=".24"/><circle cx="504" cy="91" r="71" fill="${accent}" opacity=".08"/>
<text x="300" y="62" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" letter-spacing="5" fill="${accent}">PURESPOT / SELECT</text>
<g filter="url(#s)"><rect x="144" y="120" width="312" height="386" rx="24" fill="url(#g)" stroke="${accent}" stroke-opacity=".28" stroke-width="3"/></g>
<path d="M169 174h262" stroke="${accent}" stroke-opacity=".24" stroke-width="2"/><text x="300" y="158" text-anchor="middle" font-family="Arial,sans-serif" font-size="21" font-weight="700" letter-spacing="4" fill="${accent}">PURESPOT</text>
<circle cx="300" cy="310" r="112" fill="${background}"/><g color="${accent}">${motifs[category]}</g>
<text x="300" y="451" text-anchor="middle" font-family="Arial,'Noto Sans TC',sans-serif" font-size="26" font-weight="700" fill="#3c302b">${escape(name)}</text>
<text x="300" y="482" text-anchor="middle" font-family="Arial,'Noto Sans TC',sans-serif" font-size="14" letter-spacing="2" fill="${accent}">${escape(pet)} · ${escape(category)}</text>
<text x="300" y="556" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" letter-spacing="3" fill="${accent}">DISPLAY CONCEPT</text></svg>`;
  writeFileSync(join(fileURLToPath(new URL("../public/images/products/", import.meta.url)), `${id}.svg`), svg);
}
console.log(`Generated ${rows.length} concept illustrations`);
