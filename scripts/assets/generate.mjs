import { mkdirSync, writeFileSync } from "node:fs";
const svg = (body, w = 200, h = 200) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const assets = {
  "trees/oak": svg(
    '<ellipse cx="100" cy="176" rx="65" ry="17" fill="#254b35" opacity=".16"/><path d="M92 168L96 77h17l5 91-14 8z" fill="#926345"/><path d="M102 121L65 86M105 100l35-30" stroke="#926345" stroke-width="9"/><g fill="#4e8b44" stroke="#376d3b" stroke-width="3"><circle cx="65" cy="82" r="38"/><circle cx="135" cy="76" r="38"/><circle cx="99" cy="45" r="42"/><circle cx="101" cy="95" r="42"/></g><g fill="#76aa50"><ellipse cx="83" cy="39" rx="22" ry="13"/><ellipse cx="57" cy="73" rx="19" ry="13"/><ellipse cx="130" cy="64" rx="20" ry="13"/></g>',
  ),
  "buildings/barn/barn": svg(
    '<ellipse cx="100" cy="170" rx="82" ry="22" fill="#244d38" opacity=".16"/><path d="M25 88l77-36 72 38v70l-74 36-75-39z" fill="#c66147"/><path d="M100 124l74-34v70l-74 36z" fill="#a64739"/><path d="M15 86l45-59 58 2 66 58-84 39z" fill="#415d65"/><path d="M60 27l40 53v46L15 86z" fill="#587b7c"/><path d="M112 137l41-20v48l-41 20z" fill="#713f32" stroke="#f4d7a2" stroke-width="5"/><path d="M112 137l41 28m0-48-41 68" stroke="#f4d7a2" stroke-width="3"/><path d="M40 112l35 16v27l-35-17z" fill="#f4d7a2"/><path d="M48 116l18 8v19l-18-8z" fill="#668785"/>',
  ),
  "buildings/silo/silo": svg(
    '<ellipse cx="100" cy="174" rx="57" ry="17" fill="#244d38" opacity=".16"/><path d="M58 63h84v99c0 29-84 29-84 0z" fill="#e6d4a4"/><ellipse cx="100" cy="63" rx="42" ry="20" fill="#f7e8c3"/><path d="M52 62l48-48 48 48q-48 35-96 0" fill="#577b80"/><path d="M117 81v86" stroke="#b7a476" stroke-width="6"/><path d="M62 106q38 17 76 0M62 140q38 17 76 0" fill="none" stroke="#b5a57f" stroke-width="4"/><path d="M78 143h26v37H78z" fill="#887751"/>',
  ),
};
for (const [name, content] of Object.entries(assets)) {
  const path = "public/assets/" + name + ".svg";
  mkdirSync(path.substring(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, content);
}
console.log("3 assets vetoriais originais gerados.");
