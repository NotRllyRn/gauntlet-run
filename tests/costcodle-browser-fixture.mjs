export const browserFixture = {
  dimensions: [400, 500],
  html: `<!doctype html><style>body{margin:0;background:#ff00ff}#game-container{width:400px;height:500px;margin:30px auto;background:#efeeee}.overlay{position:fixed;inset:0;background:#ff00ff}</style><main id="game-container"><div id="product-info">Secret product</div><div id="game-stats"></div><div id="guesses-container"></div></main><script>
const gameNumber=Math.ceil((Date.now()-new Date(2023,8,21).getTime())/86400000)+1;
localStorage.setItem('state',JSON.stringify({gameNumber,guesses:[],hasWon:false}));
if(location.search.includes('finish'))setTimeout(()=>{
localStorage.setItem('state',JSON.stringify({gameNumber,guesses:[{guess:'10.00',closeness:'guess-win',direction:'&check;'}],hasWon:true}));document.querySelector('#guesses-container').innerHTML='<div id="1"><div class="guess-value-container">$10.00</div><div class="guess-direction-container guess-win">✓</div></div>';document.querySelector('#game-stats').textContent='You win! The price was $10';document.querySelector('#game-container').insertAdjacentHTML('beforeend','<button id="share-button">Share</button><div class="overlay">STATS OVERLAY</div>');},1700);
</script>`,
};
