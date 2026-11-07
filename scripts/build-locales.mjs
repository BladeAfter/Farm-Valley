import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
const locales=["pt-BR","en","es","ru","tr","fa","ar","fr","de","it","id","hi","zh-CN","ja","ko","pl"];
const packs=Object.fromEntries(locales.map(id=>[id,{}])), seen=new Set();
for(const file of await readdir("src/i18n/catalog")) {
 if(!file.endsWith(".tsv"))continue;
 for(const line of (await readFile("src/i18n/catalog/"+file,"utf8")).split(/\r?\n/).filter(Boolean)) {
  const [key,...values]=line.split("|");
  if(values.length!==locales.length)throw new Error(`${file}: ${key}: expected 16 translations, got ${values.length}`);
  if(seen.has(key))throw new Error("Duplicate key: "+key);seen.add(key);
  const variables=text=>[...text.matchAll(/\{\{(\w+)\}\}/g)].map(m=>m[1]).sort().join(",");
  for(let i=0;i<locales.length;i++) {
   if(!values[i]||variables(values[i])!==variables(values[0]))throw new Error(`Invalid variables/empty value: ${key}/${locales[i]}`);
   const [namespace,...parts]=key.split(".");
   (packs[locales[i]][namespace]??={})[parts.join(".")]=values[i];
  }
 }
}
for(const locale of locales) {
 const directory="src/i18n/locales/"+locale;await mkdir(directory,{recursive:true});
 for(const [namespace,entries]of Object.entries(packs[locale]))await writeFile(`${directory}/${namespace}.json`,JSON.stringify(entries,null,2)+"\n");
 const namespaces=Object.keys(packs[locale]);
 const source=namespaces.map((name,i)=>`import n${i} from "./${name}.json";`).join("\n")+"\nexport default Object.assign({},\n"+namespaces.map((name,i)=>`Object.fromEntries(Object.entries(n${i}).map(([key,value])=>["${name}."+key,value]))`).join(",\n")+");\n";
 await writeFile(directory+"/index.ts",source);
}
await writeFile("docs/locale-coverage.json",JSON.stringify({catalogKeys:seen.size,languages:locales.map(locale=>({locale,keys:Object.values(packs[locale]).reduce((n,p)=>n+Object.keys(p).length,0),nativeReview:false}))},null,2)+"\n");
console.log(`Built ${seen.size} catalog keys for ${locales.length} locales. Native-language review is pending.`);
