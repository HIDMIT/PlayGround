(() => {
  const SAVE_KEY = 'starfall-save-v1';
  const defaults = { energy: 0, crystals: 8, totalEnergy: 0, clicks: 0, passXp: 0, shards: 0, upgrades: { reactor: 0, drone: 0, core: 0 }, claimedMissions: [], claimedRewards: [], eventClaimed: false, sound: true };
  let state;
  try { state = { ...defaults, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; }
  catch { state = { ...defaults }; }
  state.upgrades = { ...defaults.upgrades, ...(state.upgrades || {}) };
  state.claimedMissions = state.claimedMissions || [];
  state.claimedRewards = state.claimedRewards || [];
  let toastTimer;
  let lastSave = 0;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.floor(n).toLocaleString('ru-RU');
  const configs = {
    reactor: { title: 'Плазменный реактор', desc: 'Усиливает каждый импульс добычи. Больше энергии за каждый клик.', icon: 'ϟ', effect: '+1 / клик', base: 30, grow: 1.55, kind: 'click', color: '' },
    drone: { title: 'Дрон-добытчик', desc: 'Автономный помощник добывает энергию, пока ты исследуешь.', icon: '⌁', effect: '+1 / сек', base: 65, grow: 1.62, kind: 'passive', color: 'violet' },
    core: { title: 'Квантовое ядро', desc: 'Ускоряет все системы корабля и повышает пассивный доход.', icon: '◉', effect: '+2 / сек', base: 160, grow: 1.8, kind: 'passive', color: 'blue' }
  };
  const upgrades = Object.keys(configs);
  const passiveRate = () => state.upgrades.drone + state.upgrades.core * 2;
  const clickPower = () => 1 + state.upgrades.reactor;
  const costOf = (key) => Math.floor(configs[key].base * Math.pow(configs[key].grow, state.upgrades[key]));
  const passLevel = () => Math.floor(state.passXp / 100) + 1;
  const passProgress = () => state.passXp % 100;
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
  }
  function showToast(message) {
    const el = $('toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function gainEnergy(amount) {
    state.energy += amount; state.totalEnergy += amount;
  }
  function addXp(amount) { state.passXp += amount; }
  function clickShip(e) {
    const amount = clickPower();
    gainEnergy(amount); state.clicks += 1; addXp(2);
    if (state.clicks % 3 === 0 && state.shards < 30) state.shards += 1;
    if (state.clicks === 25) showToast('Задание выполнено — забери награду!');
    if (state.totalEnergy >= 500 && !state.claimedMissions.includes('energy')) showToast('Цель достигнута — награда ждёт!');
    const ship = $('ship-button'); ship.classList.add('pressed'); setTimeout(() => ship.classList.remove('pressed'), 110);
    const scene = $('ship-scene');
    const rect = scene.getBoundingClientRect();
    const x = e && e.clientX ? e.clientX - rect.left : rect.width / 2;
    const y = e && e.clientY ? e.clientY - rect.top : rect.height / 2;
    const float = document.createElement('span'); float.className = 'float-number'; float.textContent = `+${amount} ϟ`;
    float.style.left = `${Math.max(15, Math.min(rect.width - 70, x))}px`; float.style.top = `${Math.max(15, y - 10)}px`;
    scene.appendChild(float); setTimeout(() => float.remove(), 850);
    render();
  }
  $('ship-button').addEventListener('click', clickShip);
  $('ship-button').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickShip(); } });
  $('ship-scene').addEventListener('click', (e) => { if (!e.target.closest('#ship-button')) clickShip(e); });

  function renderMissions() {
    const missions = [
      { id: 'clicks', icon: '✦', title: 'Пилот-новичок', description: `${Math.min(state.clicks, 25)} / 25 кликов`, progress: Math.min(100, state.clicks / 25 * 100), reward: '+50 ϟ · +15 XP', ready: state.clicks >= 25, pay: () => { gainEnergy(50); addXp(15); } },
      { id: 'energy', icon: '◈', title: 'Первый рубеж', description: `${fmt(Math.min(state.totalEnergy, 500))} / 500 энергии`, progress: Math.min(100, state.totalEnergy / 500 * 100), reward: '+3 ◆ · +20 XP', ready: state.totalEnergy >= 500, pay: () => { state.crystals += 3; addXp(20); } }
    ];
    $('missions-list').innerHTML = missions.map((m, i) => {
      const claimed = state.claimedMissions.includes(m.id);
      return `<div class="mission"><span class="mission-icon ${i ? 'violet' : ''}">${m.icon}</span><div class="mission-copy"><strong>${m.title}</strong><small>${m.description}</small><div class="mini-progress"><i style="width:${m.progress}%"></i></div></div><div class="mission-reward">${claimed ? 'ВЫПОЛНЕНО' : m.ready ? `<button data-mission="${m.id}">ЗАБРАТЬ</button>` : m.reward}</div></div>`;
    }).join('');
    $('missions-list').querySelectorAll('[data-mission]').forEach((button) => button.addEventListener('click', () => {
      const mission = missions.find((m) => m.id === button.dataset.mission);
      if (!mission || !mission.ready || state.claimedMissions.includes(mission.id)) return;
      mission.pay(); state.claimedMissions.push(mission.id); showToast('Награда за задание получена!'); render();
    }));
  }

  function renderUpgrades() {
    $('upgrade-grid').innerHTML = upgrades.map((key) => {
      const c = configs[key], level = state.upgrades[key], cost = costOf(key), canBuy = state.energy >= cost;
      return `<article class="upgrade-card"><span class="upgrade-level">УР. <b>${level}</b></span><div class="upgrade-icon ${c.color}">${c.icon}</div><h3>${c.title}</h3><p>${c.desc}</p><div class="upgrade-bottom"><span class="upgrade-effect">${c.effect}</span><button class="buy-button" data-upgrade="${key}" ${canBuy ? '' : 'disabled'}>ϟ ${fmt(cost)}</button></div></article>`;
    }).join('');
    $('upgrade-grid').querySelectorAll('[data-upgrade]').forEach((button) => button.addEventListener('click', () => buyUpgrade(button.dataset.upgrade)));
  }
  function buyUpgrade(key) {
    const cost = costOf(key);
    if (state.energy < cost) return showToast('Недостаточно энергии для улучшения.');
    state.energy -= cost; state.upgrades[key] += 1;
    showToast(`${configs[key].title} улучшен!`); render();
  }

  const shopItems = [
    { id: 'energy-small', icon: 'ϟ', title: 'Энергетический импульс', desc: 'Мгновенный запас энергии для модернизации.', price: 2, reward: '250 ϟ', action: () => gainEnergy(250) },
    { id: 'energy-large', icon: '✧', title: 'Звёздный контейнер', desc: 'Большая партия чистой энергии.', price: 5, reward: '800 ϟ', action: () => gainEnergy(800) },
    { id: 'xp', icon: '▤', title: 'Пакет данных', desc: 'Исследовательские данные для боевого пропуска.', price: 3, reward: '50 XP', action: () => addXp(50) }
  ];
  function renderShop() {
    $('shop-grid').innerHTML = shopItems.map((item) => `<article class="shop-item"><div class="shop-item-icon">${item.icon}</div><h3>${item.title}</h3><p>${item.desc} <span style="color:#9eabc0">${item.reward}</span></p><div class="shop-item-bottom"><span class="shop-price">◆ ${item.price}</span><button class="buy-button" data-item="${item.id}" ${state.crystals < item.price ? 'disabled' : ''}>ОБМЕНЯТЬ</button></div></article>`).join('');
    $('shop-grid').querySelectorAll('[data-item]').forEach((button) => button.addEventListener('click', () => {
      const item = shopItems.find((i) => i.id === button.dataset.item);
      if (!item || state.crystals < item.price) return showToast('Недостаточно кристаллов.');
      state.crystals -= item.price; item.action(); showToast(`${item.title}: получено ${item.reward}`); render();
    }));
  }
  function buyStarter() {
    if (state.crystals < 5) return showToast('Нужно 5 кристаллов для этого набора.');
    state.crystals -= 5; gainEnergy(1000); addXp(25); showToast('Набор первооткрывателя получен!'); render();
  }
  document.querySelectorAll('[data-buy="starter"]').forEach((button) => button.addEventListener('click', buyStarter));

  const rewards = [
    { level: 1, icon: 'ϟ', name: 'Энергия ×100', type: 'energy', amount: 100 },
    { level: 2, icon: '◆', name: 'Кристаллы ×2', type: 'crystals', amount: 2 },
    { level: 3, icon: '✧', name: 'Энергия ×250', type: 'energy', amount: 250 },
    { level: 4, icon: '✦', name: 'Кристаллы ×4', type: 'crystals', amount: 4 },
    { level: 5, icon: '☄', name: 'Энергия ×500', type: 'energy', amount: 500 }
  ];
  function renderPass() {
    $('rewards-track').innerHTML = rewards.map((r) => {
      const claimed = state.claimedRewards.includes(r.level), unlocked = passLevel() >= r.level;
      return `<article class="reward-card ${claimed ? 'claimed' : ''} ${unlocked && !claimed ? 'current' : ''}"><div class="reward-num">СТУПЕНЬ ${String(r.level).padStart(2, '0')}</div><div class="reward-visual">${r.icon}</div><div class="reward-name">${r.name}</div><button class="reward-action ${unlocked && !claimed ? 'claim' : ''}" data-reward="${r.level}" ${!unlocked || claimed ? 'disabled' : ''}>${claimed ? 'ПОЛУЧЕНО' : unlocked ? 'ЗАБРАТЬ' : `НУЖЕН УР. ${r.level}`}</button></article>`;
    }).join('');
    $('rewards-track').querySelectorAll('[data-reward]').forEach((button) => button.addEventListener('click', () => {
      const reward = rewards.find((r) => r.level === Number(button.dataset.reward));
      if (!reward || passLevel() < reward.level || state.claimedRewards.includes(reward.level)) return;
      if (reward.type === 'energy') gainEnergy(reward.amount); else state.crystals += reward.amount;
      state.claimedRewards.push(reward.level); showToast(`Награда пропуска: ${reward.name}`); render();
    }));
  }

  function renderEvent() {
    ['event-shards', 'event-shards-large'].forEach((id) => setText(id, Math.min(30, state.shards)));
    const percent = Math.min(100, state.shards / 30 * 100);
    ['event-progress', 'event-progress-large'].forEach((id) => { if ($(id)) $(id).style.width = `${percent}%`; });
    const button = $('claim-event');
    if (state.eventClaimed) { button.disabled = true; button.innerHTML = 'НАГРАДА ПОЛУЧЕНА <span>✓</span>'; $('event-reward-status').textContent = 'ПОЛУЧЕНО'; }
    else if (state.shards >= 30) { button.disabled = false; button.innerHTML = 'ЗАБРАТЬ НАГРАДУ <span>◆ 30</span>'; $('event-reward-status').textContent = 'ГОТОВО'; }
    else { button.disabled = true; button.innerHTML = `СОБЕРИ ОСКОЛКИ <span>${state.shards} / 30</span>`; $('event-reward-status').textContent = '30 ◆'; }
  }
  $('claim-event').addEventListener('click', () => {
    if (state.eventClaimed || state.shards < 30) return;
    state.eventClaimed = true; state.shards -= 30; state.crystals += 25; addXp(50); showToast('Сингулярность собрана: +25 кристаллов и 50 XP!'); render();
  });

  function render() {
    setText('top-energy', fmt(state.energy)); setText('top-crystals', fmt(state.crystals));
    setText('upgrade-energy', fmt(state.energy)); setText('upgrade-crystals', fmt(state.crystals));
    setText('shop-energy', fmt(state.energy)); setText('shop-crystals', fmt(state.crystals));
    setText('click-power', fmt(clickPower())); setText('passive-rate', fmt(passiveRate()));
    setText('ship-level', ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][Math.min(6, state.upgrades.reactor)]);
    setText('pilot-level', Math.max(1, Math.floor(state.totalEnergy / 1000) + 1));
    setText('pass-level-small', passLevel()); setText('pass-total-level', String(passLevel()).padStart(2, '0'));
    setText('pass-xp-small', fmt(passProgress())); setText('pass-xp-main', fmt(100 - passProgress()));
    if ($('pass-progress-small')) $('pass-progress-small').style.width = `${passProgress()}%`;
    setText('upgrade-nav-count', upgrades.filter((key) => state.energy >= costOf(key)).length);
    renderMissions(); renderUpgrades(); renderShop(); renderPass(); renderEvent(); save();
  }

  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    const view = button.dataset.view;
    document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.id === `view-${view}`));
    document.querySelectorAll('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.view === view));
    const names = { home: 'ГЛАВНАЯ', upgrades: 'ПРОКАЧКА', pass: 'БОЕВОЙ ПРОПУСК', events: 'СОБЫТИЯ', shop: 'МАГАЗИН' };
    setText('page-title', names[view] || 'ГЛАВНАЯ');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
  $('sound-toggle').addEventListener('click', (e) => { state.sound = !state.sound; e.currentTarget.textContent = state.sound ? '♫' : '♩'; showToast(state.sound ? 'Звук интерфейса включён' : 'Звук интерфейса выключен'); save(); });
  setInterval(() => { const rate = passiveRate(); if (rate > 0) { gainEnergy(rate); render(); } }, 1000);
  window.addEventListener('beforeunload', save);
  render();
})();
