export const dimensions = [400, 300];
export const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#ff00ff}.py-4{margin:30px auto;width:400px;height:300px;background:#fff;color:#342010}.poople-card{position:fixed;inset:0;background:#ff00ff}.h-12{display:inline-block}header.fixed{position:fixed;top:0;left:0;width:100%;height:60px;background:#ff00ff;z-index:100}</style><header class="fixed">STICKY HEADER</header><div class="flex w-full flex-col items-center gap-5 py-4"></div><script>
const number=Math.floor((Date.now()-Date.UTC(2025,7,14,8))/86400000),words=['fuss','cuss','cubs','cobs','coos','coop','poop'];
const board=document.querySelector('.py-4');
function render(path){board.innerHTML='<p>#'+number+': FUSS</p>'+path.map(w=>'<div>'+[...w.toUpperCase()].map(c=>'<div class="h-12 w-12 bg-muted">'+c+'</div>').join('')+'</div>').join('');localStorage.setItem('guesses',JSON.stringify(path));localStorage.setItem('dateLastPlayed',JSON.stringify(Date.now()));}
render(words.slice(0,2));if(location.search.includes('finish'))setTimeout(()=>{render(words);document.body.insertAdjacentHTML('beforeend','<div class="poople-card"><h2>FUSS → POOP</h2><p>You used 6 guesses. The best solution was 6 guesses.</p><p>⬜⬜⬜⬜<br>⬜🟫🟫🟫<br>🟫🟫🟫🟫</p></div>')},1700);
</script>`;
