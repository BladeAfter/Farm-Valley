import { mkdir, writeFile } from "node:fs/promises";
import { productionItemIds, productionItems } from "../../src/data/production";
const folder = "public/assets/products/production";
await mkdir(folder, { recursive: true });
const colors: Record<string, string> = {
  chickenFeed: "#d59b32",
  cowFeed: "#5b9f9c",
  goatFeed: "#a397bd",
  pigFeed: "#d58f7f",
  sheepFeed: "#80a77c",
};
function illustration(id: string) {
  if (id === "muffin")
    return `<path d="M23 44H73L66 80Q49 87 30 79Z" fill="#b68a67" stroke="#8d6545" stroke-width="2"/><path d="M31 48L36 78M45 48L47 82M59 48L58 80M68 47L64 74" stroke="#d2aa80" stroke-width="2"/><path d="M21 47Q12 33 27 24Q35 9 48 20Q67 9 75 30Q88 48 67 51Z" fill="url(#bread)" stroke="#b88643" stroke-width="2"/><path d="M31 28L36 32M48 24L53 29M65 32L68 36M43 39L46 42" stroke="#7d5339" stroke-width="4" stroke-linecap="round"/>`;
  if (id === "pie")
    return `<ellipse cx="48" cy="64" rx="36" ry="19" fill="#b47b42"/><ellipse cx="48" cy="51" rx="36" ry="22" fill="url(#bread)" stroke="#ab763b" stroke-width="3"/><ellipse cx="48" cy="49" rx="28" ry="15" fill="#ba7544"/><path d="M28 43L66 55M35 37L71 49M25 51L57 62M30 56L54 35M39 61L65 40" stroke="#edc47d" stroke-width="5" stroke-linecap="round"/><ellipse cx="48" cy="51" rx="34" ry="20" fill="none" stroke="#e6b66d" stroke-width="5" stroke-dasharray="4 4"/>`;
  if (id === "cornBread")
    return `<path d="M15 43L55 27L81 43V69L39 83L15 65Z" fill="url(#bread)" stroke="#ae7d41" stroke-width="2"/><path d="M16 43L56 28L80 43L39 59Z" fill="#f1d18a"/><path d="M40 60L80 44V68L40 82Z" fill="#e6c47a"/><path d="M47 63L56 60M64 64L69 61M51 72L59 69M69 53L73 51" stroke="#c29a58" stroke-width="3" stroke-linecap="round"/><path d="M22 41L50 32M31 48L60 38" stroke="#fff0be" stroke-width="3" stroke-linecap="round"/>`;
  if (id.endsWith("Feed"))
    return `<path d="M31 22Q48 17 65 22L62 33Q79 47 75 72Q70 85 47 85Q22 84 20 70Q18 49 34 33Z" fill="url(#sack)" stroke="#9b7541" stroke-width="2"/><path d="M32 23L62 24M33 30L63 31" stroke="#b69d6b" stroke-width="3"/><path d="M29 45Q48 37 69 45L68 67Q49 75 28 65Z" fill="${colors[id]}"/><path d="M48 47V65M47 53L39 48M48 58L56 52" fill="none" stroke="#fff3c8" stroke-width="3" stroke-linecap="round"/><path d="M27 72Q42 79 64 72" fill="none" stroke="#f3d9a4" stroke-width="3"/>`;
  if (id === "wool")
    return `<path d="M67 62Q83 69 74 80L88 81" fill="none" stroke="#b7ab8e" stroke-width="4" stroke-linecap="round"/><ellipse cx="46" cy="48" rx="31" ry="29" fill="url(#cream)" stroke="#afa28a" stroke-width="2"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M${24 + i * 5} 27Q${66 + i * 2} 41 ${31 + i * 7} 74" fill="none" stroke="#c1b496" stroke-width="2"/>`).join("")}<path d="M20 46Q43 52 71 45M20 56Q45 63 69 56M25 66Q46 69 61 67" fill="none" stroke="#fffaf0" stroke-width="3"/>`;
  if (id === "bacon" || id === "grilledBacon" || id === "baconEggs") {
    let art = `<ellipse cx="48" cy="67" rx="39" ry="17" fill="#e7ead9" stroke="#a4b4aa" stroke-width="2"/>${[0, 1, 2].map((i) => `<path d="M${16 + i * 18} 53L${32 + i * 18} 26Q${41 + i * 18} 24 ${43 + i * 18} 32L${29 + i * 18} 61Z" fill="${id === "bacon" ? "#cf7769" : "#aa5e3e"}" stroke="#854b35" stroke-width="1.5"/><path d="M${22 + i * 18} 49L${35 + i * 18} 29M${26 + i * 18} 52L${39 + i * 18} 31" stroke="#f6d1a0" stroke-width="3"/>`).join("")}`;
    if (id === "baconEggs")
      art += `<path d="M14 54Q4 43 19 40Q25 28 36 41Q49 46 42 57Q26 66 14 54Z" fill="#fff5d2" stroke="#e0c89e"/><ellipse cx="27" cy="46" rx="9" ry="7" fill="#edb52e"/>`;
    return art;
  }
  if (["cream", "butter", "cheese", "goatCheese"].includes(id)) {
    if (id === "cream")
      return `<path d="M25 38L30 77Q47 86 67 76L71 38Z" fill="url(#ceramic)" stroke="#889e9d" stroke-width="2"/><ellipse cx="48" cy="38" rx="23" ry="9" fill="#cedad0"/><path d="M29 35Q28 24 42 23Q39 15 52 15Q48 9 56 8Q71 23 63 30Q75 38 62 40L37 40Z" fill="url(#cream)" stroke="#dbcead" stroke-width="1.5"/><path d="M29 53Q49 60 67 52L65 66Q49 73 32 65Z" fill="#86aeb0"/>`;
    if (id === "butter")
      return `<ellipse cx="48" cy="70" rx="37" ry="13" fill="#e3e8d5" stroke="#a4b4aa"/><path d="M20 52L46 34L76 47L51 65Z" fill="#fff1a1" stroke="#d5b65c"/><path d="M20 52L51 65V77L20 64Z" fill="#dfb958"/><path d="M51 65L76 47V61L51 77Z" fill="#f5d77b"/><path d="M33 47L56 56" stroke="#fff8cf" stroke-width="4"/>`;
    return `<path d="M17 52L60 23L80 47L67 75L17 69Z" fill="${id === "goatCheese" ? "#f3e4b9" : "#ecc55f"}" stroke="#bda15d" stroke-width="2"/><path d="M17 52L60 23L70 51Z" fill="${id === "goatCheese" ? "#fff6d7" : "#ffe397"}"/><path d="M70 51L80 47L67 75L17 69L17 52Z" fill="${id === "goatCheese" ? "#d8c79b" : "#ddb650"}"/>${[
      [34, 57, 4],
      [52, 62, 5],
      [65, 55, 3],
      [55, 39, 3],
    ]
      .map(
        ([x, y, r]) =>
          `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.7}" fill="#b59a58" opacity=".7"/>`,
      )
      .join("")}`;
  }
  if (id.includes("IceCream")) {
    const scoop =
      id === "strawberryIceCream"
        ? "#ed9b9e"
        : id === "chocolateIceCream"
          ? "#8e5b40"
          : "#f7e6b4";
    return `<path d="M27 45L67 45L48 87Z" fill="url(#bread)" stroke="#b48442" stroke-width="2"/><path d="M34 52L54 72M29 60L49 80M62 53L42 74M58 65L47 77" stroke="#d5ad66" stroke-width="2"/><path d="M22 47Q17 39 26 34Q20 20 37 18Q44 7 55 16Q74 13 72 32Q83 40 71 49Z" fill="${scoop}" stroke="#bf9c75" stroke-width="1.5"/><path d="M30 26Q36 20 42 23" stroke="#fff4dc" stroke-width="4" stroke-linecap="round"/>`;
  }
  if (id.endsWith("Juice") || id === "syrup") {
    const color =
      id === "carrotJuice"
        ? "#e68f36"
        : id === "fruitJuice"
          ? "#de9771"
          : id === "syrup"
            ? "#b77a36"
            : "#d9bb56";
    return `<path d="M37 18H59V31Q72 40 72 49V78Q48 89 24 78V49Q24 39 37 31Z" fill="url(#glass)" stroke="#88a6a1" stroke-width="2"/><path d="M29 48Q48 54 67 48V75Q48 83 29 75Z" fill="${color}"/><rect x="34" y="11" width="28" height="12" rx="3" fill="#b18a53"/><path d="M34 49V73" stroke="#fff8dc" opacity=".6" stroke-width="4" stroke-linecap="round"/><path d="M40 58Q48 52 57 60L54 70H43Z" fill="#fff0bd" opacity=".9"/>`;
  }
  if (id === "brownSugar" || id === "whiteSugar")
    return `<path d="M18 71L23 35Q48 25 73 35L78 71Q49 87 18 71Z" fill="url(#sack)" stroke="#a8864e" stroke-width="2"/><ellipse cx="48" cy="36" rx="25" ry="10" fill="#8c7044"/><path d="M24 34L43 18L68 30L71 38Q47 46 24 34Z" fill="${id === "whiteSugar" ? "#fff9db" : "#bf8f4c"}"/>${[
      [37, 28],
      [44, 31],
      [52, 26],
      [60, 33],
      [47, 23],
    ]
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="1.5" fill="#fff7db" opacity=".7"/>`,
      )
      .join(
        "",
      )}<path d="M25 55Q48 65 72 54" stroke="#d6b67c" stroke-width="4"/>`;
  if (id.toLowerCase().includes("popcorn"))
    return `<path d="M21 43H76L67 82Q48 88 29 82Z" fill="#fff1d1" stroke="#b58a56" stroke-width="2"/><path d="M29 46L34 83M45 46V85M62 46L60 83" stroke="${id === "sweetPopcorn" ? "#cd8c9d" : "#d7805f"}" stroke-width="7"/>${[
      [25, 38],
      [37, 25],
      [51, 29],
      [64, 29],
      [73, 40],
      [54, 42],
      [38, 41],
      [47, 17],
    ]
      .map(
        ([x, y], i) =>
          `<path d="M${x - 7} ${y + 4}Q${x - 12} ${y - 7} ${x - 3} ${y - 7}Q${x + 4} ${y - 15} ${x + 7} ${y - 5}Q${x + 16} ${y + 3} ${x + 5} ${y + 7}Z" fill="${id === "butterPopcorn" ? "#f7d989" : id === "sweetPopcorn" ? "#e0bc80" : "#fff2c8"}" stroke="#cfb16f" stroke-width="1"/>`,
      )
      .join("")}`;
  if (id === "bakedPotato")
    return `<ellipse cx="48" cy="72" rx="37" ry="12" fill="#dfe7cf" stroke="#9eafa2"/><path d="M18 60Q10 36 36 30Q62 24 79 49Q83 71 55 74Q25 78 18 60Z" fill="#b9884d" stroke="#86623c" stroke-width="2"/><path d="M25 47L47 36L69 52L54 65Z" fill="#fff0b5"/><path d="M30 48L49 43L62 53L49 58Z" fill="#e6c668"/><path d="M31 54L36 52M47 49L50 52M54 58L58 56" stroke="#7f9a47" stroke-width="3"/>`;
  if (id.toLowerCase().includes("cake")) {
    const icing =
      id === "chocolateCake"
        ? "#8c533b"
        : id === "strawberryCake"
          ? "#edaaa0"
          : id === "carrotCake"
            ? "#f4d28a"
            : "#fff0c4";
    return `<ellipse cx="48" cy="76" rx="37" ry="10" fill="#d7e1ce" stroke="#9bab9e"/><path d="M19 43H77V69Q48 86 19 69Z" fill="url(#bread)" stroke="#ad793e" stroke-width="2"/><ellipse cx="48" cy="43" rx="29" ry="14" fill="${icing}" stroke="#d0af7d"/><path d="M19 43Q27 55 34 49Q42 62 49 51Q61 59 66 48Q74 53 77 43V52Q70 63 64 56Q54 67 48 59Q36 68 31 57Q24 62 19 53Z" fill="${icing}"/><path d="M24 65Q48 78 72 64" fill="none" stroke="#f2d49e" stroke-width="4"/><path d="M41 32Q41 21 48 25Q57 18 59 29Q62 38 50 38Z" fill="${id === "appleCake" ? "#b8bc58" : id === "chocolateCake" ? "#654b39" : "#cf7160"}"/><path d="M48 25Q50 17 58 19" stroke="#73914a" fill="none" stroke-width="3"/>`;
  }
  if (id === "cookie")
    return `<ellipse cx="48" cy="70" rx="32" ry="12" fill="#b58a4c"/><ellipse cx="45" cy="58" rx="31" ry="17" fill="url(#bread)" stroke="#ba8c4b" stroke-width="2"/><ellipse cx="52" cy="43" rx="29" ry="18" fill="#e5c077" stroke="#bd8f4c" stroke-width="2"/>${[
      [36, 39],
      [49, 49],
      [59, 34],
      [67, 46],
      [44, 29],
      [33, 49],
    ]
      .map(
        ([x, y]) =>
          `<ellipse cx="${x}" cy="${y}" rx="3" ry="2.5" fill="#83563a"/>`,
      )
      .join("")}`;
  return `<path d="M15 59Q9 32 36 25Q66 17 80 42Q93 68 66 76L30 78Q17 76 15 59Z" fill="url(#bread)" stroke="#ae7b3e" stroke-width="2"/><path d="M28 35L37 52M46 28L54 46M63 31L69 44" stroke="${id === "cornBread" ? "#f9e3a2" : "#fff1c5"}" stroke-width="6" stroke-linecap="round"/><path d="M21 66Q46 79 74 63" stroke="#bf8d4d" stroke-width="3" fill="none"/>`;
}
const defs = `<defs><linearGradient id="bread" x2=".3" y2="1"><stop stop-color="#f6d693"/><stop offset=".55" stop-color="#d6a05a"/><stop offset="1" stop-color="#ad733b"/></linearGradient><linearGradient id="sack" x2=".7" y2="1"><stop stop-color="#f1dfaa"/><stop offset="1" stop-color="#c1a066"/></linearGradient><linearGradient id="cream" x2=".6" y2="1"><stop stop-color="#fffcdf"/><stop offset="1" stop-color="#d9c89f"/></linearGradient><linearGradient id="ceramic" x2="1" y2="1"><stop stop-color="#edf4e5"/><stop offset="1" stop-color="#a9c2ba"/></linearGradient><linearGradient id="glass" x2="1" y2="1"><stop stop-color="#e0ece0" stop-opacity=".9"/><stop offset="1" stop-color="#a6c6be" stop-opacity=".8"/></linearGradient></defs>`;
for (const id of productionItemIds)
  await writeFile(
    `${folder}/${id}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><title>${productionItems[id].name}</title>${defs}${illustration(id)}</svg>`,
  );
await writeFile(
  "public/assets/products/fruits/cocoa.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">${defs}<path d="M39 23Q53 7 69 18Q87 35 66 65Q48 86 27 72Q12 56 27 35Z" fill="url(#bread)" stroke="#9c693c" stroke-width="2"/><path d="M58 19Q36 45 31 70M65 22Q46 49 39 75M70 27Q57 52 48 74" fill="none" stroke="#b77736" stroke-width="3"/><path d="M55 19Q55 8 63 7" stroke="#7e6740" stroke-width="4" fill="none"/><path d="M59 14Q41 -1 28 10Q34 26 59 14Z" fill="#739a49"/></svg>`,
);
console.log(
  productionItemIds.length +
    " original illustrated production icons and cacao.",
);
