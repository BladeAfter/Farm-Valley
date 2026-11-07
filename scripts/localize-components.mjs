// One-time, syntax-aware migration. Only exact catalogued UI strings are replaced.
import ts from "typescript";
import { readFile,writeFile,readdir } from "node:fs/promises";
import { relative,dirname } from "node:path";
const mapping=new Map();
for (const [text,key] of Object.entries({"Modo plantar":"farm.plant","Colher com foice":"farm.harvest","Fechar canteiro":"common.close","Fechar sementes":"common.close","Fechar origem do produto":"common.close","Sementes deste canteiro":"farm.seeds","Canteiro selecionado":"farm.field","Receitas":"production.choose","Fila de produção":"production.queue","Filtrar receitas":"production.choose","Filtrar encomendas":"orders.title","Mural de encomendas":"orders.title","Cercados":"animals.title","Armazenamento":"farm.storage","Produtos armazenados":"common.inventory","Seu cantinho":"common.settings","Limpar terreno":"common.remove","Categorias da loja":"common.shop","Detalhes da construção":"farm.buildings","Todos os espaços disponíveis":"production.maxSlots","Os novos moradores aparecerão aqui.":"animals.title","Online · progresso salvo":"common.synced","Salvo neste servidor":"common.synced","Alpha · progresso temporário":"common.temporary","Conectando ao vale…":"notifications.loading","Abrindo as encomendas…":"common.loading","Voltar aos produtos":"inventory.back","Você precisa de mais ferramentas.":"errors.stock","Esta área ainda está bloqueada.":"errors.locked","Seu celeiro está cheio.":"errors.barn","Terra pronta para plantar":"farm.readySoil","Tocar para plantar":"farm.plant","Toque nos objetos para cuidar da fazenda. Segure uma construção por 1,2 s para mover. Arraste o chão para explorar.":"tutorial.help","Ainda não há produtos aqui. Suas próximas colheitas e coletas aparecerão neste espaço.":"inventory.empty","Toque em um produto para consultar ou vender. Guarde sementes para replantar.":"inventory.hint"})) mapping.set(text,key);
for(const file of await readdir("src/i18n/catalog"))if(file.endsWith(".tsv"))for(const line of (await readFile("src/i18n/catalog/"+file,"utf8")).split(/\r?\n/).filter(Boolean)){const [key,text]=line.split("|");if(!text.includes("{{")&&!mapping.has(text))mapping.set(text,key);}
const paths=[];async function walk(path){for(const e of await readdir(path,{withFileTypes:true})){const p=path+"/"+e.name;if(e.isDirectory())await walk(p);else if(p.endsWith(".tsx"))paths.push(p);}}await walk("src/components");paths.push("src/App.tsx");
for(const path of paths){
 let source=await readFile(path,"utf8"),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),changed=false;
 const convert=context=>root=>ts.visitNode(root,function visit(node){
  if(ts.isJsxText(node)){const key=mapping.get(node.text.replace(/\s+/g," ").trim());if(key){changed=true;return ts.factory.createJsxExpression(undefined,ts.factory.createCallExpression(ts.factory.createIdentifier("t"),undefined,[ts.factory.createStringLiteral(key)]));}}
  if(ts.isStringLiteral(node)&&!ts.isImportDeclaration(node.parent)&&!ts.isImportSpecifier(node.parent)){
   const key=mapping.get(node.text);if(key){changed=true;const call=ts.factory.createCallExpression(ts.factory.createIdentifier("t"),undefined,[ts.factory.createStringLiteral(key)]);return ts.isJsxAttribute(node.parent)?ts.factory.createJsxExpression(undefined,call):call;}
  }
  return ts.visitEachChild(node,visit,context);
 });
 const result=ts.transform(file,[convert]);
 if(changed){source=ts.createPrinter({newLine:ts.NewLineKind.LineFeed}).printFile(result.transformed[0]);const target=relative(dirname(path),"src/i18n/core").replaceAll("\\","/");if(!/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*["'][^"']*i18n\/core/.test(source))source=`import { t } from "${target.startsWith(".")?target:"./"+target}";\n`+source;await writeFile(path,source);}
 result.dispose();
}
console.log("Localized exact catalogue UI strings. Review remaining dynamic phrases separately.");
