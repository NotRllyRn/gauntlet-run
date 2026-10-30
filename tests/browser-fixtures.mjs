export const wordle = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#eee}#wordle-app-game{margin:20px auto;width:300px}.Board-module_board__test{width:300px;height:360px;display:grid;grid-template-rows:repeat(6,1fr)}[role=group]{display:grid;grid-template-columns:repeat(5,1fr)}[data-state]{background:#ddd;border:3px solid white}[data-state=correct]{background:#00aa00}[data-state=absent]{background:#888}dialog{position:fixed;inset:0;width:100vw;height:100vh;background:#ff00ff;border:0;margin:0;z-index:999}</style><main id="wordle-app-game"><div class="Board-module_board__test">${Array.from({ length: 6 }, (_, i) => `<div role="group">${Array.from({ length: 5 }, () => `<div data-state="${i < 3 ? "absent" : "empty"}">${i < 3 ? "A" : ""}</div>`).join("")}</div>`).join("")}</div></main><script>if(location.search.includes('finish'))setTimeout(()=>{document.querySelectorAll('[role=group]')[3].querySelectorAll('[data-state]').forEach(e=>{e.dataset.state='correct';e.textContent='A'});const d=document.createElement('dialog');d.textContent='RESULT POPUP';document.body.append(d);d.showModal()},1700)</script>`;
export const globle = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#eee}.scene-container{margin:30px auto;width:400px;height:400px}.m{position:fixed;inset:0;background:#ff00ff;z-index:999}input{display:block}</style><input data-cy="guesser"><div class="scene-container"><canvas width="400" height="400"></canvas></div><script>const d=new Date(),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');localStorage.setItem('guesses',JSON.stringify({day,countries:[]}));const ctx=document.querySelector('canvas').getContext('2d');ctx.fillStyle='#0044cc';ctx.fillRect(0,0,400,400);if(location.search.includes('finish'))setTimeout(()=>{localStorage.setItem('guesses',JSON.stringify({day,countries:['France']}));localStorage.setItem('statistics',JSON.stringify({lastWin:new Date().toUTCString(),currentStreak:1,usedGuesses:[1],emojiGuesses:'🟩'}));document.querySelector('input').disabled=true;const overlay=document.createElement('div');overlay.className='m absolute z-40';overlay.textContent='RESULT POPUP';document.body.append(overlay)},1700)</script>`;
export const krillion = `<!doctype html><style>body{margin:0;background:#ff00ff}.result-panel{margin:30px auto;width:400px;height:180px;background:#103040;color:white}.font-display{font-size:40px}</style><div class="ds-root"></div><script>
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const results=Array.from({length:7},(_,i)=>({promptId:'p'+i,promptText:'Secret prompt',rawAnswer:'Secret answer',answer:null,tier:null,score:0}));
localStorage.setItem('krillion:game:v1',JSON.stringify({date:day,dayNumber:107,phase:'feedback',results:results.slice(0,3)}));
if(location.search.includes('finish'))setTimeout(()=>{
localStorage.removeItem('krillion:game:v1');
localStorage.setItem('krillion:stats:v1',JSON.stringify({history:{[day]:{dayNumber:107,score:0,tiers:Array(7).fill('miss'),results}}}));
document.querySelector('.ds-root').innerHTML='<div class="result-panel"><div><span class="ds-done-krill">KRILLION</span><span>Dive #107 complete</span></div><div><span class="font-display">0</span><span>0m</span></div></div>';
},1700);
</script>`;
export const minecraftle = `<!doctype html><style>body{margin:0;background:#ff00ff}#headlessui-dialog-panel-test{margin:30px auto;width:400px;height:300px;background:#ccc;color:#111}.slot{width:20px;height:20px}p{white-space:pre}</style><div id="guesses"><div class="box"><div>${'<div class="slot"></div>'.repeat(9)}</div></div></div><script>
const d=new Date(),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
if(location.search.includes('finish'))setTimeout(()=>{
const panel=document.createElement('div');panel.id='headlessui-dialog-panel-test';
const title=document.createElement('h3');title.textContent='You won! Took 1 guesses.';
const solution=document.createElement('p');solution.id='headlessui-description-test';solution.textContent='Solution: Diamond Axe';
const share=document.createElement('p');share.className='whitespace-pre';share.textContent='Minecraftle '+day+' 1/10\\n🟩🟩🟩\\n🟩🟩🟩\\n🟩🟩🟩';
panel.append(solution,title,share);document.body.append(panel);
},1700);
</script>`;
// One fixture entry opts a game into shared browser capture/result assertions.
export const browserFixtures = {
  minecraftle: { html: minecraftle, dimensions: [400, 300] },
  wordle: { html: wordle, dimensions: [300, 360] },
  globle: { html: globle, dimensions: [400, 400] },
  krillion: { html: krillion, dimensions: [400, 180] },
};
