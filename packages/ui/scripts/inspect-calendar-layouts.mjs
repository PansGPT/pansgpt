import {readFile} from 'node:fs/promises';
const text=await readFile(new URL('../preview/calendar-layout-data.ts',import.meta.url),'utf8');
const sources=JSON.parse(text.slice(text.indexOf(' = [')+3).trim().replace(/;$/,''));
function words(nodes){return nodes.flatMap(n=>n.text?[n.text]:words(n.children??[]));}
function visit(nodes,depth=0){return nodes.flatMap(n=>[...(n.tag&&(depth<3||/Event|Calendar cell|Row|Column|Sidebar/.test(n.name??''))?[{depth,name:n.name,id:n.id,style:n.style,text:words([n]).join(' ').slice(0,100)}]:[]),...visit(n.children??[],depth+1)]);}
for(const source of sources){const blocks=visit(source.nodes);console.log(JSON.stringify({id:source.id,structure:blocks.filter(x=>x.depth<3).map(x=>({name:x.name,text:x.text})),cells:blocks.filter(x=>x.name==='_Calendar cell/Month view').length}));}
