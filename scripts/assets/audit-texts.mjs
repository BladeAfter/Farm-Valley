import ts from "typescript";
import { readdir, readFile, writeFile } from "node:fs/promises";
const paths = [];
async function walk(path) { for (const entry of await readdir(path,{withFileTypes:true})) { const p=path+"/"+entry.name; if(entry.isDirectory())await walk(p);else if(/\.tsx$/.test(p))paths.push(p); } }
await walk("src");
const strings = new Map();
for(const path of paths) {
 const source = await readFile(path,"utf8"), file = ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function inspect(node) {
  let text;
  if(ts.isJsxText(node)) text=node.text.replace(/\s+/g," ").trim();
  else if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)) {
   let parent=node.parent, jsx=false, excluded=false;
   while(parent&&!ts.isStatement(parent)) {
    if(ts.isJsxAttribute(parent)) { if(!["aria-label","title","placeholder","alt"].includes(parent.name.getText(file)))excluded=true;break; }
    if(ts.isJsxExpression(parent))jsx=true;
    if(ts.isBinaryExpression(parent)&&[ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(parent.operatorToken.kind))excluded=true;
    if(ts.isCallExpression(parent)&&["t","number","formatNumber","duration","open","act","select","includes","endsWith","startsWith","dispatchEvent","getData","setData"].some(id=>parent.expression.getText(file)===id||parent.expression.getText(file).endsWith("."+id)))excluded=true;
    if(ts.isPropertyAssignment(parent)&&["type","kind","className","id"].includes(parent.name.getText(file)))excluded=true;
    parent=parent.parent;
   }
   if(jsx&&!excluded)text=node.text.trim();
  }
  if(text&&/[\p{L}]/u.test(text)&&!text.includes("/assets/")&&!/^https?:/.test(text)&&!["FARM","VALLEY","silo","barn"].includes(text))strings.set(text,[...(strings.get(text)??[]),path]);
  ts.forEachChild(node,inspect);
 }
 inspect(file);
}
await writeFile("docs/text-audit.json",JSON.stringify(Object.fromEntries([...strings].sort()),null,2));
console.log(JSON.stringify({count:strings.size,texts:[...strings.keys()].sort()},null,2));
