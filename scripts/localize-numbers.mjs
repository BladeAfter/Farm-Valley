import ts from "typescript";
import { writeFile } from "node:fs/promises";
import { relative,dirname } from "node:path";
const config=ts.readConfigFile("tsconfig.json",ts.sys.readFile),parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,".");
const program=ts.createProgram(parsed.fileNames,parsed.options),checker=program.getTypeChecker();
for(const file of program.getSourceFiles()){
 if(!file.fileName.includes("src/")||!file.fileName.endsWith(".tsx"))continue;
 const edits=[];
 function visit(node){
  if(ts.isJsxExpression(node)&&node.expression&&!ts.isJsxAttribute(node.parent)){
   const type=checker.getTypeAtLocation(node.expression);
   if(type.flags&ts.TypeFlags.NumberLike)edits.push({start:node.expression.getStart(file),end:node.expression.end,text:"formatNumber("+node.expression.getText(file)+")"});
  }
  ts.forEachChild(node,visit);
 }visit(file);
 if(!edits.length)continue;
 let text=file.text;for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);
 if(!/import\s*\{[^}]*\bformatNumber\b/.test(text)){const target=relative(dirname(file.fileName),"src/i18n/core").replaceAll("\\","/");text=`import { number as formatNumber } from "${target}";\n`+text;}
 await writeFile(file.fileName,text);
}
console.log("Localized numeric display expressions; input values and game calculations were not changed.");
