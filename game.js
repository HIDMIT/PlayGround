(() => {
  'use strict';
  const brawlers = [
    {id:'penny',name:'Penny',rarity:'Rare',icon:'🏴‍☠️',color:'#5db9db',glow:'#3c9dc8'},
    {id:'nita',name:'Nita',rarity:'Rare',icon:'🐻',color:'#ed795f',glow:'#e86854'},
    {id:'rico',name:'Rico',rarity:'Super Rare',icon:'🤖',color:'#8a8cf3',glow:'#7274e2'},
    {id:'bea',name:'Bea',rarity:'Super Rare',icon:'🐝',color:'#f0bd4b',glow:'#dfaa37'},
    {id:'rosa',name:'Rosa',rarity:'Epic',icon:'🌿',color:'#78d487',glow:'#5dbd77'},
    {id:'gene',name:'Gene',rarity:'Mythic',icon:'🧞',color:'#c17ce0',glow:'#ac60d0'},
    {id:'crow',name:'Crow',rarity:'Mythic',icon:'🐦‍⬛',color:'#68cfbe',glow:'#4bb7aa'},
    {id:'spike',name:'Spike',rarity:'Legendary',icon:'🌵',color:'#82cf72',glow:'#64b95c'}
  ];
  const rarities = {
    'Rare':{color:'#70d49c',bg:'#28513f',weight:52},
    'Super Rare':{color:'#55c8e8',bg:'#244a60',weight:27},
    'Epic':{color:'#b77dff',bg:'#493468',weight:13},
    'Mythic':{color:'#ff6d9d',bg:'#603148',weight:7},
    'Legendary':{color:'#ffbc4c',bg:'#61452c',weight:1}
  };
  const boxes = [
    {id:'brawl',name:'BRAWL BOX',short:'Brawl Box',desc:'A little box with big surprises',icon:'▣',iconClass:'',art:'brawl',rewards:2,brawlerChance:.12,coins:[18,34],points:[10,20]},
    {id:'mega',name:'MEGA BOX',short:'Mega Box',desc:'A huge haul of surprises',icon:'✦',iconClass:'big',art:'mega',rewards:3,brawlerChance:.17,coins:[30,55],points:[18,32]},
    {id:'starr',name:'STARR DROP',short:'Starr Drop',desc:'A starry drop packed with magic',icon:'✧',iconClass:'star',art:'starr',rewards:4,brawlerChance:.22,coins:[45,75],points:[25,45]}
  ];
  const questDefs = [
    {id:'open3',title:'Box popper',description:'Open 3 boxes',goal:3,reward:40,icon:'▣',type:'opened'},
    {id:'collect2',title:'Growing roster',description:'Unlock 2 brawlers',goal:2,reward:65,icon:'♟',type:'unlocks'},
    {id:'starr1',title:'Reach for the stars',description:'Open 1 Starr Drop',goal:1,reward:55,icon:'✧',type:'starr'}
  ];
  const dayKey = (date=new Date()) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const freshState = () => ({coins:120,gems:20,opened:0,luck:0,best:'',owned:{},power:{},quests:{open3:0,collect2:0,starr1:0},claimed:{},recent:[],box:'mega',questDay:dayKey()});
  let state;
  try { state = {...freshState(),...JSON.parse(localStorage.getItem('box-brawl-save')||'{}')}; }
  catch { state = freshState(); }
  state.owned = state.owned || {}; state.power = state.power || {}; state.quests = {...freshState().quests,...(state.quests||{})}; state.claimed = state.claimed || {}; state.recent = state.recent || [];
  if (!boxes.some(box=>box.id===state.box)) state.box='mega';
  if (!state.questDay) state.questDay=dayKey();
  const resetDailyQuests = () => {
    state.quests={open3:0,collect2:0,starr1:0}; state.claimed={}; state.questDay=dayKey(); save();
  };
  let isOpening = false;
  let toastTimer;
  const $ = id => document.getElementById(id);
  const save = () => { try { localStorage.setItem('box-brawl-save',JSON.stringify(state)); } catch {} };
  if (state.questDay!==dayKey()) resetDailyQuests();
  const chosenBox = () => boxes.find(box=>box.id===state.box) || boxes[1];
  const rarityInfo = rarity => rarities[rarity] || {color:'#c5cbe0',bg:'#353d58'};
  const weightedPick = list => {
    const total = list.reduce((sum,item)=>sum+item.weight,0);
    let roll = Math.random()*total;
    for (const item of list) { roll -= item.weight; if (roll <= 0) return item; }
    return list[list.length-1];
  };
  const randomInt = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
  const ownedCount = () => brawlers.filter(b=>state.owned[b.id]).length;
  const levelOf = id => 1 + Math.floor((state.power[id]||0)/100);

  function updateQuestClock() {
    const nextReset=new Date(); nextReset.setHours(24,0,0,0);
    const minutes=Math.max(0,Math.floor((nextReset-Date.now())/60000));
    const hours=Math.floor(minutes/60),remaining=minutes%60;
    $('quest-reset').textContent=`RESETS IN ${String(hours).padStart(2,'0')}H ${String(remaining).padStart(2,'0')}M`;
  }
  function render() {
    updateQuestClock();
    $('coin-count').textContent = state.coins.toLocaleString();
    $('gem-count').textContent = state.gems.toLocaleString();
    $('boxes-opened').textContent = state.opened;
    $('header-open-count').textContent = state.opened;
    $('luck-stat').textContent = `${Math.min(state.luck,30)} / 30`;
    $('luck-fill').style.width = `${Math.min(state.luck/30*100,100)}%`;
    $('brawler-nav-count').textContent = ownedCount();
    $('collection-count').textContent = ownedCount();
    $('roster-count').textContent = ownedCount();
    $('road-progress-label').textContent = `${ownedCount()} / ${brawlers.length}`;
    $('road-progress').style.width = `${ownedCount()/brawlers.length*100}%`;
    $('best-pull').textContent = state.best || '—';
    $('quest-reward').textContent = questDefs[0].reward;
    renderBoxes(); renderCollectionPeek(); renderRecent(); renderQuests(); renderRoster();
  }
  function renderBoxes() {
    const box=chosenBox();
    $('stage-box-name').textContent=box.name;
    $('stage-box-desc').textContent=box.desc;
    $('box-info-text').textContent=`${box.rewards} drops · coins, power points, and brawler unlocks`;
    $('box-art').className=`box-art ${box.art}-art`;
    document.querySelectorAll('.box-tab').forEach(tab=>tab.classList.toggle('selected',tab.dataset.box===box.id));
    if (!$('box-tabs').children.length) $('box-tabs').innerHTML=boxes.map(item=>`<button class="box-tab ${item.id===state.box?'selected':''}" role="tab" aria-selected="${item.id===state.box}" data-box="${item.id}"><span class="tab-box-icon ${item.iconClass}">${item.icon}</span><span class="tab-copy"><b>${item.name}</b><small>${item.rewards} drops · FREE</small></span></button>`).join('');
    document.querySelectorAll('.box-tab').forEach(tab=>tab.setAttribute('aria-selected',tab.classList.contains('selected')));
  }
  function renderCollectionPeek() {
    $('mini-portraits').innerHTML=brawlers.slice(0,5).map(b=>`<span class="mini-portrait ${state.owned[b.id]?'unlocked':'locked'}" style="--portrait:${b.color}" title="${state.owned[b.id]?b.name:'Locked'}">${state.owned[b.id]?b.icon:'?'}</span>`).join('');
  }
  function renderRecent() {
    const recent=state.recent.slice(0,4);
    $('recent-note').textContent=recent.length?`${state.opened} total box${state.opened===1?'':'es'} opened`:'Your latest box drops appear here';
    $('recent-pulls').innerHTML=recent.length?recent.map(item=>`<div class="pull-card" style="--rarity:${item.color};--rarity-bg:${item.bg}"><span class="pull-icon">${item.icon}</span><div><b>${item.label}</b><small>${item.note}</small></div></div>`).join(''):'<div class="empty-pull"><span>✧</span> Open a box to reveal your first drop!</div>';
  }
  function renderRoster() {
    $('roster-grid').innerHTML=brawlers.map(b=>{
      const unlocked=!!state.owned[b.id],r=rarityInfo(b.rarity);
      return `<article class="brawler-card ${unlocked?'':'locked'}" style="--portrait:${b.color};--glow:${b.glow};--rarity:${r.color}"><div class="brawler-portrait">${unlocked?b.icon:'?'}</div><div class="brawler-name">${unlocked?b.name:'???'}</div><div class="brawler-rarity">${b.rarity}</div>${unlocked?`<div class="power-level">POWER ${levelOf(b.id)} · ${state.power[b.id]||0} PTS</div>`:''}</article>`;
    }).join('');
  }
  function renderQuests() {
    const first=questDefs[0],value=state.quests[first.id]||0,done=value>=first.goal;
    $('quest-text').textContent=first.title==='Box popper'?first.description:first.title;
    $('quest-progress').style.width=`${Math.min(value/first.goal*100,100)}%`;
    $('quest-progress-label').textContent=`${Math.min(value,first.goal)} / ${first.goal}`;
    $('quest-action').innerHTML=state.claimed[first.id]?'REWARD CLAIMED <span>✓</span>':done?'CLAIM REWARD <span>◆</span>':'KEEP OPENING <span>→</span>';
    $('quest-action').disabled=!!state.claimed[first.id];
    $('quest-list').innerHTML=questDefs.map(q=>{
      const progress=Math.min(state.quests[q.id]||0,q.goal),complete=progress>=q.goal,claimed=!!state.claimed[q.id];
      return `<div class="quest-list-card"><div class="quest-list-icon">${q.icon}</div><div class="quest-list-copy"><b>${q.title}</b><p>${q.description} · ${progress}/${q.goal}</p><div class="progress-bar"><i style="width:${progress/q.goal*100}%"></i></div></div><div class="quest-list-reward">${claimed?'✓ CLAIMED':complete?`<button data-claim="${q.id}">CLAIM ${q.reward} ◆</button>`:`+${q.reward} ◆`}</div></div>`;
    }).join('');
  }
  function showToast(message) {
    const toast=$('toast'); toast.textContent=message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2300);
  }
  function rollReward(box,forceLegendary) {
    const brawlerChance=box.brawlerChance;
    const r=Math.random();
    if (forceLegendary || r < brawlerChance) {
      let pool=brawlers.filter(b=>!state.owned[b.id]);
      if (forceLegendary) {
        const legendary=pool.filter(b=>b.rarity==='Legendary');
        if (legendary.length) return makeBrawlerReward(legendary[0]);
      }
      if (pool.length) {
        const weighted=pool.map(b=>({b,weight:rarityInfo(b.rarity).weight}));
        return makeBrawlerReward(weightedPick(weighted).b);
      }
      return {type:'coins',amount:randomInt(35,65),label:'Coin bonus',icon:'◆',note:'MAXED OUT',rarity:'Bonus'};
    }
    if (r < brawlerChance + .28) return {type:'power',amount:randomInt(...box.points),label:'Power points',icon:'⚡',note:'POWER UP',rarity:'Power'};
    return {type:'coins',amount:randomInt(...box.coins),label:'Coins',icon:'◆',note:'CURRENCY',rarity:'Coins'};
  }
  function makeBrawlerReward(brawler) {
    const info=rarityInfo(brawler.rarity);
    return {type:'brawler',id:brawler.id,brawler,amount:1,label:brawler.name,icon:brawler.icon,note:brawler.rarity.toUpperCase(),rarity:brawler.rarity,color:info.color,bg:info.bg};
  }
  function openBox() {
    if (isOpening || !$('reveal-overlay').classList.contains('hidden')) return;
    isOpening=true;
    const box=chosenBox();
    $('open-button').disabled=true;
    $('crate-stage').classList.add('opening');
    window.setTimeout(()=>{
      $('crate-stage').classList.remove('opening');
      const forceLegendary=state.luck>=29 && brawlers.some(b=>b.rarity==='Legendary'&&!state.owned[b.id]);
      let rewards=[];
      for(let i=0;i<box.rewards;i++) rewards.push(rollReward(box,forceLegendary&&i===0));
      applyRewards(rewards,box,forceLegendary);
      state.opened++;
      state.quests.open3=(state.quests.open3||0)+1;
      if(box.id==='starr') state.quests.starr1=(state.quests.starr1||0)+1;
      state.luck=forceLegendary?0:Math.min(30,state.luck+1);
      if(rewards.some(item=>item.rarity==='Legendary')) state.luck=0;
      const highest=rewards.find(item=>item.type==='brawler' && item.rarity==='Legendary')||rewards.find(item=>item.type==='brawler');
      if(highest) state.best=highest.label;
      state.recent=rewards.slice().reverse().map(item=>({label:item.label,note:item.note,icon:item.icon,color:item.color||rarityInfo(item.rarity).color,bg:item.bg||rarityInfo(item.rarity).bg})).concat(state.recent).slice(0,4);
      save();render();showReveal(rewards,box);
      $('open-button').disabled=false;isOpening=false;
    },750);
  }
  function applyRewards(rewards,box,forceLegendary) {
    rewards.forEach(item=>{
      if(item.type==='coins'){state.coins+=item.amount;return;}
      if(item.type==='power'){
        const unlocked=brawlers.filter(b=>state.owned[b.id]);
        if(unlocked.length){const target=unlocked[Math.floor(Math.random()*unlocked.length)];state.power[target.id]=(state.power[target.id]||0)+item.amount;item.label=`${target.name} +${item.amount}`;item.note=`POWER POINTS · LV ${levelOf(target.id)}`;item.icon='⚡';item.color='#b893ff';item.bg='#453766';}
        else {state.coins+=item.amount;item.type='coins';item.label='Coins';item.note='CURRENCY';item.icon='◆';item.color='#ffd15a';item.bg='#51452d';}
        return;
      }
      const b=item.brawler;
      if(!state.owned[b.id]){state.owned[b.id]=true;state.power[b.id]=0;state.quests.collect2=(state.quests.collect2||0)+1;item.isNew=true;}
      else {state.coins+=45;item.type='duplicate';item.label=`${b.name} duplicate`;item.note='+45 COINS';item.icon='◆';item.amount=45;item.color='#ffd15a';item.bg='#51452d';}
    });
    if(forceLegendary) showToast('LEGENDARY PITY! Guaranteed drop unlocked.');
  }
  function showReveal(rewards,box) {
    $('reveal-kicker').textContent=`${box.name} OPENED!`;
    $('reveal-title').textContent=rewards.some(r=>r.isNew)?'NEW BRAWLER!':'NICE HAUL!';
    $('reveal-items').innerHTML=rewards.map(item=>{
      const info=item.color?{color:item.color,bg:item.bg}:rarityInfo(item.rarity);
      const label=item.label;
      return `<div class="reveal-item ${item.isNew?'new':''}" style="--rarity:${info.color};--rarity-bg:${info.bg}"><div class="reward-icon">${item.icon}</div><b>${label}</b><small>${item.isNew?'NEW BRAWLER':item.note}</small></div>`;
    }).join('');
    $('reveal-overlay').classList.remove('hidden');
  }
  function closeReveal(){ $('reveal-overlay').classList.add('hidden'); }
  function claimQuest(id) {
    const quest=questDefs.find(q=>q.id===id);
    if(!quest || state.claimed[id] || (state.quests[id]||0)<quest.goal) return;
    state.claimed[id]=true;state.coins+=quest.reward;save();render();showToast(`Quest complete! +${quest.reward} coins`);
  }
  function setView(view) {
    document.querySelectorAll('.view').forEach(el=>el.classList.add('hidden'));
    const target=$(`${view}-view`);if(target)target.classList.remove('hidden');
    document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function showOdds(){
    const box=chosenBox(), b=box.brawlerChance*100, power=28, coins=100-b-power;
    const rows=[['Coins',coins,'#ffd15a'],['Power points',power,'#b893ff'],['Brawler unlock',b,'#72d49b']];
    $('odds-list').innerHTML=rows.map(([name,pct,color])=>`<div class="odds-row" style="--rarity:${color}"><span>${name}</span><div class="odds-track"><i style="width:${pct}%"></i></div><small>${pct.toFixed(0)}%</small></div>`).join('');
    $('modal-title').textContent=`${box.short} drop rates`;
    $('modal-backdrop').classList.remove('hidden');
  }

  $('open-button').addEventListener('click',openBox);
  $('open-again').addEventListener('click',openBox);
  $('box-tabs').addEventListener('click',e=>{const tab=e.target.closest('[data-box]');if(!tab)return;state.box=tab.dataset.box;save();renderBoxes();});
  $('odds-button').addEventListener('click',showOdds);
  $('modal-close').addEventListener('click',()=>$('modal-backdrop').classList.add('hidden'));
  $('modal-done').addEventListener('click',()=>$('modal-backdrop').classList.add('hidden'));
  $('modal-backdrop').addEventListener('click',e=>{if(e.target===$('modal-backdrop'))$('modal-backdrop').classList.add('hidden');});
  $('reveal-close').addEventListener('click',closeReveal);
  $('reveal-overlay').addEventListener('click',closeReveal);
  document.addEventListener('click',e=>{
    const nav=e.target.closest('[data-view]');if(nav){e.preventDefault();setView(nav.dataset.view);}
    const claim=e.target.closest('[data-claim]');if(claim)claimQuest(claim.dataset.claim);
    const toast=e.target.closest('[data-toast]');if(toast)showToast(toast.dataset.toast);
  });
  document.querySelector('.avatar').addEventListener('click',()=>showToast(`Brawler profile · ${ownedCount()} of ${brawlers.length} collected`));
  $('quest-action').addEventListener('click',()=>{
    const q=questDefs[0];if(state.claimed[q.id])return;
    if((state.quests[q.id]||0)>=q.goal)claimQuest(q.id);else openBox();
  });
  document.addEventListener('keydown',e=>{
    if(e.code==='Escape'){$('modal-backdrop').classList.add('hidden');closeReveal();}
    if(e.code==='Space' && !e.repeat && $('modal-backdrop').classList.contains('hidden') && $('reveal-overlay').classList.contains('hidden') && !e.target.matches('button,a,input')){e.preventDefault();openBox();}
    if(e.code==='Enter' && !$('reveal-overlay').classList.contains('hidden'))closeReveal();
  });
  window.setInterval(()=>{
    if(state.questDay!==dayKey()){resetDailyQuests();render();showToast('Daily quests have reset!');}
    else updateQuestClock();
  },60000);
  render();
})();
