import fs from 'fs';
const l=JSON.parse(fs.readFileSync('tools/figma-kit/contracts.lock.json','utf8'));const S=l.sets||l;
let ok=0;const bad=[];
for(const f of process.argv.slice(2)){const j=JSON.parse(fs.readFileSync(f,'utf8'));for(const [id,h] of Object.entries(j)){const s=S[id];if(s&&s.h===h)ok++;else bad.push(id+' '+(s&&s.n||'?')+(s?'':' (not in lock)'));}}
console.log('match',ok,'differ',bad.length);console.log(bad.join('\n'));
