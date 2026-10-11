import { readFile } from "node:fs/promises";
const content=await readFile(new URL("../preview/application-nav-layout-data.ts",import.meta.url),"utf8");
const marker="export const applicationNavLayouts: NavLayoutSource[] = ";
const data=JSON.parse(content.slice(content.indexOf(marker)+marker.length).trim().replace(/;$/, ""));
const target=process.argv[2];
function texts(n){return n.text?[n.text]:(n.children??[]).flatMap(texts);}
function visit(n,path=[]){const p=[...path,n.name??n.tag??"text"];if(n.name&&(/Header|Footer|Navigation|Sub nav|Section|Account|Logo|Nav$|Content/.test(n.name))&&path.length<7)console.log(JSON.stringify({path:p.join("/"),text:texts(n).join(" ").slice(0,180),style:n.style}));for(const c of n.children??[])visit(c,p);}
for(const s of data.filter(s=>!target||s.id===target)){console.log(s.id);s.nodes.forEach(n=>visit(n));}
