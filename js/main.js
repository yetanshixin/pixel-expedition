/* ===== UI 渲染与事件绑定 ===== */

const UI = {
  busy: false,
  targeting: null,
  lastHeroId: null,
  _pendingHero: null,
  _pendingUnlock: false,
  enemyCards: new Map(),
  _dialogLines: null,
  _dialogIdx: 0,
  _dialogDone: null,

  $(id) { return document.getElementById(id); },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    this.$(id).classList.add('active');
  },

  setBusy(b) {
    this.busy = b;
    document.querySelectorAll('#actions .skill-btn, #btn-item, #btn-signature').forEach(el => { el.disabled = b; });
  },

  sfx(name) { Audio.sfx(name); },

  log(text) {
    const log = this.$('log');
    const d = document.createElement('div');
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    while (log.children.length > 60) log.removeChild(log.firstChild);
  },
  clearLog() { this.$('log').innerHTML = ''; },

  shake() {
    const stage = this.$('battle-stage');
    stage.classList.remove('shaking');
    void stage.offsetWidth;
    stage.classList.add('shaking');
  },

  /* 玩家受击/治疗飘字 */
  animHit(target, amount) {
    const zone = this.$(target + '-zone');
    const sprite = this.$(target + '-sprite');
    const el = document.createElement('span');
    el.className = 'float-dmg';
    el.textContent = '-' + amount;
    el.style.left = '50%'; el.style.top = '0px';
    zone.appendChild(el);
    setTimeout(() => el.remove(), 950);
    sprite.classList.remove('shake'); void sprite.offsetWidth; sprite.classList.add('shake');
  },
  animHeal(target, amount) {
    const zone = this.$(target + '-zone');
    const sprite = this.$(target + '-sprite');
    const el = document.createElement('span');
    el.className = 'float-dmg heal';
    el.textContent = '+' + amount;
    el.style.left = '50%'; el.style.top = '0px';
    zone.appendChild(el);
    setTimeout(() => el.remove(), 950);
    sprite.classList.remove('flash'); void sprite.offsetWidth; sprite.classList.add('flash');
  },

  /* 敌人受击/治疗飘字 */
  animHitEnemy(e, amount) {
    const card = this.enemyCards.get(e);
    if (!card) return;
    const el = document.createElement('span');
    el.className = 'float-dmg';
    el.textContent = '-' + amount;
    el.style.left = '50%'; el.style.top = '0px';
    card.el.appendChild(el);
    setTimeout(() => el.remove(), 950);
    card.sprite.classList.remove('shake'); void card.sprite.offsetWidth; card.sprite.classList.add('shake');
  },
  animHealEnemy(e, amount) {
    const card = this.enemyCards.get(e);
    if (!card) return;
    const el = document.createElement('span');
    el.className = 'float-dmg heal';
    el.textContent = '+' + amount;
    el.style.left = '50%'; el.style.top = '0px';
    card.el.appendChild(el);
    setTimeout(() => el.remove(), 950);
    card.sprite.classList.remove('flash'); void card.sprite.offsetWidth; card.sprite.classList.add('flash');
  },

  animMp(amount) {
    const zone = this.$('player-zone');
    const el = document.createElement('span');
    el.className = 'float-dmg mp';
    el.textContent = '+' + amount + ' MP';
    el.style.left = '50%'; el.style.top = '0px';
    zone.appendChild(el);
    setTimeout(() => el.remove(), 950);
  },

  animPet() {
    const el = this.$('pet-display');
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  },

  /* ==== 多敌人渲染 ==== */
  clearEnemyCards() {
    this.$('enemy-zone').innerHTML = '';
    this.enemyCards.clear();
  },

  renderEnemies() {
    const zone = this.$('enemy-zone');
    const list = Game.enemies || [];
    const current = new Set(list);
    for (const [e, card] of this.enemyCards) {
      if (!current.has(e)) { card.el.remove(); this.enemyCards.delete(e); }
    }
    list.forEach((e, idx) => {
      let card = this.enemyCards.get(e);
      if (!card) {
        card = this.createEnemyCard(e);
        this.enemyCards.set(e, card);
        zone.appendChild(card.el);
      }
      this.updateEnemyCard(e, card, idx);
    });
  },

  createEnemyCard(e) {
    const el = document.createElement('div');
    el.className = 'enemy-card';
    el.innerHTML =
      '<div class="enemy-sprite">👹</div>' +
      '<div class="nameplate">' +
        '<div class="char-name">敌人</div>' +
        '<div class="intent"></div>' +
        '<div class="bar hpbar"><div class="fill"></div></div>' +
        '<div class="bar-text">0/0</div>' +
      '</div>';
    el.addEventListener('click', () => {
      if (!UI.targeting || e.hp <= 0) return;
      const sid = UI.targeting;
      UI.targeting = null;
      UI.busy = true; UI.setBusy(true);
      Game.playerAct(sid, parseInt(el.dataset.idx, 10));
    });
    return {
      el,
      sprite: el.querySelector('.enemy-sprite'),
      name: el.querySelector('.char-name'),
      intent: el.querySelector('.intent'),
      fill: el.querySelector('.fill'),
      text: el.querySelector('.bar-text'),
      bar: el.querySelector('.hpbar')
    };
  },

  updateEnemyCard(e, card, idx) {
    card.sprite.textContent = e.emoji;
    const tag = e.isBoss ? '👑 ' : (e.elite ? '💀 ' : '');
    const els = e.elements || [];
    const elTxt = els.length ? ' ' + els.map(x => ELEMENT_META[x] ? ELEMENT_META[x].emoji : '').join('') : '';
    card.name.textContent = tag + e.name + elTxt;
    card.intent.textContent = e.intent ? e.intent.icon + ' ' + e.intent.name : '';
    const eh = e.hp / e.maxHp;
    card.fill.style.width = (eh * 100) + '%';
    card.fill.classList.toggle('low', eh <= 0.3);
    card.text.textContent = e.hp + '/' + e.maxHp;
    card.bar.classList.toggle('boss', !!e.isBoss);
    card.bar.classList.toggle('elite', !e.isBoss && !!e.elite);
    card.el.classList.toggle('dead', e.hp <= 0);
    card.el.classList.toggle('targetable', !!this.targeting && e.hp > 0);
    card.el.dataset.idx = idx;
  },

  updateBars() {
    const p = Game.player;
    if (!p) return;
    const ph = p.hp / p.maxHp;
    const pFill = this.$('player-hp-fill');
    pFill.style.width = (ph * 100) + '%';
    pFill.classList.toggle('low', ph <= 0.3);
    this.$('player-hp-text').textContent = p.hp + '/' + p.maxHp;
    this.$('player-mp-fill').style.width = (p.mp / p.maxMp * 100) + '%';
    this.$('player-mp-text').textContent = p.mp + '/' + p.maxMp;
    this.$('player-name').textContent = p.name;
    this.$('player-shield').textContent = p.shield > 0 ? '🛡️ ' + p.shield : '';
    this.$('player-relics').innerHTML = p.relics.map(id => {
      const r = RELICS.find(x => x.id === id);
      return r ? '<span class="relic" title="' + r.name + '：' + r.desc + '">' + r.emoji + '</span>' : '';
    }).join('');
    this.$('pet-display').innerHTML = p.pet ? '<span class="pet-emoji">' + p.pet.emoji + '</span><span class="pet-name">' + p.pet.name + '</span>' : '';

    this.renderEnemies();
    this.updateSkillButtons();
    this.updateItemButton();
  },

  updateSkillButtons() {
    const p = Game.player;
    if (!p) return;
    const target = Game.enemies.find(e => e.hp > 0);
    document.querySelectorAll('#actions .skill-btn').forEach(btn => {
      const s = SKILLS[btn.dataset.skill];
      btn.disabled = this.busy || (s.mp > 0 && p.mp < s.mp);
      const dmgEl = btn.querySelector('.s-dmg');
      const typeEl = btn.querySelector('.s-type');
      if (s.type === 'attack' && dmgEl && target) {
        const base = Game.calcDmg(p.atk, s.mult, target.def);
        const eff = Game.typeMult(s.element, target.elements);
        const dmg = Math.round(base * eff);
        dmgEl.textContent = dmg;
        if (eff > 1) { dmgEl.className = 's-dmg up'; typeEl.textContent = '▲'; typeEl.className = 's-type up'; }
        else if (eff < 1) { dmgEl.className = 's-dmg down'; typeEl.textContent = '▼'; typeEl.className = 's-type down'; }
        else { dmgEl.className = 's-dmg'; typeEl.textContent = ''; typeEl.className = 's-type'; }
      } else if (typeEl) {
        typeEl.textContent = '';
      }
    });
  },

  updateItemButton() {
    const p = Game.player;
    const btn = this.$('btn-item');
    const n = p ? p.bag.length : 0;
    btn.textContent = Game.itemUsed ? '🎒 道具（已用）' : '🎒 道具 (' + n + ')';
    btn.disabled = this.busy || !p || n === 0 || Game.itemUsed;
  },

  renderSkills() {
    const p = Game.player;
    const wrap = this.$('actions');
    wrap.innerHTML = '';
    const addBtn = (id) => {
      const s = SKILLS[id];
      const btn = document.createElement('button');
      btn.className = 'skill-btn';
      btn.dataset.skill = id;
      btn.innerHTML =
        '<span class="s-emoji">' + s.emoji + '</span>' +
        '<span class="s-name">' + s.name + (s.type === 'attack' && s.element && ELEMENT_META[s.element] ? ' ' + ELEMENT_META[s.element].emoji : '') + '</span>' +
        (s.aoe ? '<span class="s-aoe">全体</span>' : '') +
        (s.type === 'attack' ? '<span class="s-dmg"></span><span class="s-type"></span>' : '') +
        '<span class="s-cost">' + (s.mp > 0 ? s.mp + ' MP' : '免费') + '</span>';
      btn.addEventListener('click', () => {
        if (UI.busy) return;
        if (s.type === 'attack' && !s.aoe) {
          const alive = Game.enemies.filter(e => e.hp > 0);
          if (alive.length > 1) {
            UI.targeting = (UI.targeting === id) ? null : id;
            UI.renderEnemies();
            if (UI.targeting) UI.log('选择攻击目标（点击敌人）');
            return;
          }
        }
        UI.targeting = null;
        UI.busy = true; UI.setBusy(true);
        Game.playerAct(id, 0);
      });
      wrap.appendChild(btn);
    };
    addBtn('defend');
    p.skills.forEach(id => { if (!SKILLS[id].signature) addBtn(id); });
    /* 专属技能渲染到道具按钮上方的独立按钮 */
    this.renderSignature(p.skills.find(id => SKILLS[id].signature));
  },

  renderSignature(sigId) {
    const btn = this.$('btn-signature');
    if (!sigId) { btn.style.display = 'none'; return; }
    const s = SKILLS[sigId];
    btn.style.display = '';
    btn.innerHTML =
      '<span class="sig-emoji">' + s.emoji + '</span>' +
      '<span class="sig-name">' + s.name + '</span>' +
      '<span class="sig-desc">' + s.desc + '</span>';
    btn.onclick = () => {
      if (UI.busy) return;
      UI.targeting = null;
      UI.busy = true; UI.setBusy(true);
      Game.playerAct(sigId, 0);
    };
  },

  renderBag() {
    const list = this.$('bag-list');
    list.innerHTML = '';
    const p = Game.player;
    if (!p || p.bag.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'go-line'; empty.textContent = '背包为空';
      list.appendChild(empty);
      return;
    }
    p.bag.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'bag-item';
      const units = { heal: '', mp: ' MP', shield: ' 盾', buff: ' 攻' };
      const label = '+' + item.amount + (units[item.effect] || '');
      div.innerHTML = '<span class="bi-name">' + item.emoji + ' ' + item.name + '</span><span class="bi-heal">' + label + '</span>';
      div.addEventListener('click', () => {
        if (UI.busy || Game.itemUsed) return;
        Game.useItem(i);
      });
      list.appendChild(div);
    });
  },

  openBag() { this.renderBag(); this.$('bag-panel').classList.remove('hidden'); },
  closeBag() { this.$('bag-panel').classList.add('hidden'); },

  /* ==== 地图 ==== */
  showMap() { this.showScreen('screen-map'); this.renderMap(); },

  renderMap() {
    const wrap = this.$('map-floors');
    wrap.innerHTML = '';
    this.$('map-progress').textContent = '第 ' + Game.floor + ' / ' + MAP_TOTAL + ' 层';
    /* 只显示当前层和已走过的层（倒序，像爬塔一样高层在上） */
    for (let f = Game.floor; f >= 1; f--) {
      const entry = Game.map[f - 1];
      const row = document.createElement('div');
      row.className = 'floor-row' + (f === Game.floor ? ' current' : ' done');
      const label = document.createElement('div');
      label.className = 'floor-label';
      label.textContent = f + ' 层';
      row.appendChild(label);
      const nodes = document.createElement('div');
      nodes.className = 'floor-nodes';
      entry.nodes.forEach((node, i) => {
        const meta = NODE_META[node.type];
        const btn = document.createElement('button');
        btn.className = 'node-btn ' + node.type;
        btn.innerHTML = '<span class="n-emoji">' + meta.emoji + '</span><span class="n-name">' + meta.name + '</span>';
        if (f === Game.floor) {
          btn.addEventListener('click', () => { Audio.sfx('select'); Game.startNode(i); });
        } else {
          btn.disabled = true;
          if (entry.chosen === i) btn.classList.add('chosen');
        }
        nodes.appendChild(btn);
      });
      row.appendChild(nodes);
      wrap.appendChild(row);
    }
  },

  /* ==== 休息 ==== */
  showRest() {
    const wrap = this.$('rest-list');
    wrap.innerHTML = '';
    REST_CHOICES.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'rest-card';
      btn.innerHTML = '<span class="r-emoji">' + c.emoji + '</span><div class="r-name">' + c.name + '</div><div class="r-desc">' + c.desc + '</div>';
      btn.addEventListener('click', () => { Audio.sfx('select'); Game.doRest(c.id); });
      wrap.appendChild(btn);
    });
    this.showScreen('screen-rest');
  },

  /* ==== 商店 ==== */
  showShop(offers) {
    this.$('shop-toast').textContent = '';
    this.refreshShop(offers);
    this.showScreen('screen-shop');
  },

  refreshShop(offers) {
    this.$('shop-gold').textContent = Game.player.gold;
    const wrap = this.$('shop-list');
    wrap.innerHTML = '';
    offers.forEach((o, i) => {
      const card = document.createElement('div');
      card.className = 'shop-card' + (o ? '' : ' sold');
      if (o) {
        card.innerHTML =
          '<span class="r-emoji">' + o.emoji + '</span>' +
          '<div class="sc-main"><span class="loot-tag">' + this.lootLabel(o.type) + '</span><div class="r-name">' + o.name + '</div><div class="r-desc">' + o.desc + '</div></div>' +
          '<div class="sc-cost">💰' + o.cost + '</div>';
        card.addEventListener('click', () => Game.buyOffer(i));
      } else {
        card.innerHTML = '<div class="sc-sold">已售罄</div>';
      }
      wrap.appendChild(card);
    });
  },

  shopToast(msg) {
    const t = this.$('shop-toast');
    t.textContent = msg;
    setTimeout(() => { if (t.textContent === msg) t.textContent = ''; }, 1200);
  },

  /* ==== 对白 ==== */
  dialogue(lines, onDone) {
    this._dialogLines = lines;
    this._dialogIdx = 0;
    this._dialogDone = onDone;
    this.showScreen('screen-dialogue');
    this._renderDialogue();
  },
  _renderDialogue() {
    this.$('dialogue-text').textContent = this._dialogLines[this._dialogIdx];
  },
  _dialogNext() {
    this._dialogIdx++;
    if (this._dialogIdx >= this._dialogLines.length) {
      const done = this._dialogDone;
      this._dialogLines = null; this._dialogDone = null;
      if (done) done();
    } else {
      this._renderDialogue();
    }
  },

  /* ==== 事件 ==== */
  showEvent(ev) {
    this.$('event-emoji').textContent = ev.emoji;
    this.$('event-name').textContent = ev.name;
    this.$('event-text').textContent = ev.text;
    this.$('event-result').classList.add('hidden');
    this.$('btn-event-continue').classList.add('hidden');
    const wrap = this.$('event-choices');
    wrap.innerHTML = '';
    ev.choices.forEach((ch, i) => {
      const btn = document.createElement('button');
      btn.className = 'btn event-choice';
      btn.textContent = ch.text;
      btn.addEventListener('click', () => { Audio.sfx('select'); Game.resolveEvent(i); });
      wrap.appendChild(btn);
    });
    this.showScreen('screen-event');
  },

  showEventResult(msg) {
    this.$('event-choices').innerHTML = '';
    this.$('event-result').textContent = msg;
    this.$('event-result').classList.remove('hidden');
    this.$('btn-event-continue').classList.remove('hidden');
  },

  /* ==== 战斗 / 奖励 / 结算 ==== */
  startBattle() {
    this.clearLog();
    this.setBusy(false);
    this.targeting = null;
    this.clearEnemyCards();
    this.renderSkills();
    this.updateBars();
    this.updateHud();
    this.$('player-sprite').textContent = Game.player.emoji;
    this.showScreen('screen-battle');
    const n = Game.enemies.length;
    const names = Game.enemies.map(e => (e.isBoss ? '👑' : '') + e.name).join('、');
    this.log('⚔️ 第 ' + Game.floor + ' 层 · 遭遇' + (n > 1 ? ' ' + n + ' 个敌人：' : '敌人：') + names);
    if (Game.enemies.some(e => e.isBoss)) this.log('👑 强大的 Boss 带着喽啰出现了！');
  },

  updateHud() {
    this.$('battle-floor').textContent = Game.floor;
    this.$('battle-gold').textContent = Game.player.gold;
    this.$('battle-wins').textContent = Game.wins;
    const w = (Game.waves && Game.waves.length > 1) ? '第 ' + (Game.waveIndex + 1) + '/' + Game.waves.length + ' 波' : '';
    this.$('battle-wave').textContent = w;
  },

  lootLabel(type) {
    return { skill: '技能', relic: '遗物', item: '道具', atk: '强化', def: '强化', maxhp: '强化', maxmp: '强化', fullheal: '回复' }[type] || '';
  },

  showRewards(list) {
    this.$('reward-title').textContent = '第 ' + Game.wins + ' 胜 · 选择一项奖励';
    const wrap = this.$('reward-list');
    wrap.innerHTML = '';
    Audio.sfx('reward');
    list.forEach(r => {
      const card = document.createElement('div');
      card.className = 'reward-card';
      card.innerHTML =
        '<span class="loot-tag">' + this.lootLabel(r.type) + '</span>' +
        '<span class="r-emoji">' + r.emoji + '</span>' +
        '<div class="r-name">' + r.name + '</div>' +
        '<div class="r-desc">' + r.desc + '</div>';
      card.addEventListener('click', () => { Audio.sfx('select'); Game.applyReward(r); });
      wrap.appendChild(card);
    });
    this.showScreen('screen-reward');
  },

  showResult(win) {
    const title = this.$('result-title');
    title.textContent = win ? '🏆 远征胜利！' : '💀 远征失败';
    title.style.color = win ? 'var(--gold)' : 'var(--red)';
    this.$('gameover-floor').textContent = Game.floor;
    this.$('gameover-wins').textContent = Game.wins;
    let best = 0;
    try { best = parseInt(localStorage.getItem('tfg_best') || '0', 10); } catch (e) {}
    this.$('gameover-best').textContent = best;
    this.$('best-score').textContent = '🏆 最佳进度：第 ' + best + ' 层';
    this.$('total-wins').textContent = '累计胜场：' + this.getTotalWins();
    this.showScreen('screen-gameover');
  },

  updateMuteLabel() {
    const m = Audio.isMuted();
    this.$('btn-mute').textContent = m ? '🔇 音乐：关' : '🔊 音乐：开';
    this.$('btn-mute2').textContent = m ? '🔇' : '🔊';
  },

  getTotalWins() {
    let t = 0;
    try { t = parseInt(localStorage.getItem('tfg_total') || '0', 10); } catch (e) {}
    return t;
  },

  showHeroDetail(heroId, needUnlock) {
    const h = HEROES.find(x => x.id === heroId);
    if (!h) return;
    this._pendingHero = h;
    this._pendingUnlock = needUnlock;
    this.$('detail-emoji').textContent = h.emoji;
    this.$('detail-name').textContent = h.name;
    this.$('detail-title').textContent = h.title;
    this.$('detail-stats').textContent = 'HP ' + h.hp + ' · 攻击 ' + h.atk + ' · 防御 ' + h.def + ' · MP ' + h.mp;
    this.$('detail-desc').textContent = h.desc;
    const sigWrap = this.$('detail-signature');
    sigWrap.innerHTML = '';
    const skillWrap = this.$('detail-skills');
    skillWrap.innerHTML = '';
    h.skills.forEach(id => {
      const s = SKILLS[id];
      if (!s) return;
      const row = document.createElement('div');
      row.className = 'detail-skill' + (s.signature ? ' signature' : '');
      row.innerHTML =
        '<span class="ds-emoji">' + s.emoji + '</span>' +
        '<span class="ds-name">' + s.name + '</span>' +
        '<span class="ds-desc">' + s.desc + '</span>';
      (s.signature ? sigWrap : skillWrap).appendChild(row);
    });
    this.$('btn-detail-confirm').textContent = needUnlock ? '解锁并开始' : '确认选择';
    this.showScreen('screen-hero-detail');
  },

  showBoons() {
    const boons = Game.pickBoons();
    const wrap = this.$('boon-list');
    wrap.innerHTML = '';
    boons.forEach(b => {
      const card = document.createElement('div');
      card.className = 'reward-card';
      card.innerHTML =
        '<span class="loot-tag">祝福</span>' +
        '<span class="r-emoji">' + b.emoji + '</span>' +
        '<div class="r-name">' + b.name + '</div>' +
        '<div class="r-desc">' + b.desc + '</div>';
      card.addEventListener('click', () => {
        Audio.sfx('select');
        Game.applyBoon(b);
        const hero = HEROES.find(h => h.id === UI.lastHeroId);
        UI.dialogue(hero ? hero.storyLines : [], () => UI.showMap());
      });
      wrap.appendChild(card);
    });
    this.showScreen('screen-boon');
  },

  updateContinueBtn() {
    this.$('btn-continue').style.display = Game.hasSave() ? '' : 'none';
  },

  renderHeroList() {
    const wrap = this.$('hero-list');
    wrap.innerHTML = '';
    const unlocked = Game.getUnlocked();
    const canUnlock = Game.hasUnlock();
    const hint = this.$('hero-hint');
    if (hint) {
      if (canUnlock) {
        if (!unlocked.length) hint.textContent = '选择一个职业解锁（可自由选择）';
        else if (Game.getClears() === 0) hint.textContent = '已解锁「' + (HEROES.find(x => x.id === unlocked[0]) || {}).name + '」，可点击其他 🔓 卡片更换';
        else hint.textContent = '🎉 通关奖励：可解锁一个新职业（点击 🔓 卡片）';
      } else {
        hint.textContent = '选择一个已解锁的职业开始冒险（通关后可解锁更多）';
      }
    }
    HEROES.forEach(h => {
      const isUnlocked = unlocked.includes(h.id);
      const canUnlockThis = canUnlock && !isUnlocked;
      const card = document.createElement('div');
      card.className = 'hero-card' + (isUnlocked ? '' : canUnlockThis ? ' unlockable' : ' locked');
      card.style.borderColor = h.color;
      card.innerHTML =
        '<span class="hero-emoji">' + (isUnlocked ? h.emoji : canUnlockThis ? '🔓' : '🔒') + '</span>' +
        '<div class="hero-name">' + h.name + '</div>' +
        '<div class="hero-title">' + h.title + '</div>' +
        '<div class="hero-stats">HP ' + h.hp + ' · 攻 ' + h.atk + ' · 防 ' + h.def + '<br>MP ' + h.mp + '</div>' +
        (isUnlocked ? '<div class="hero-desc">' + h.desc + '</div>'
          : canUnlockThis ? '<div class="hero-lock unlock">🔓 点击解锁此职业</div>'
          : '<div class="hero-lock">🔒 通关后可解锁</div>');
      if (isUnlocked) {
        card.addEventListener('click', () => { Audio.sfx('select'); UI.showHeroDetail(h.id, false); });
      } else if (canUnlockThis) {
        card.addEventListener('click', () => { Audio.sfx('select'); UI.showHeroDetail(h.id, true); });
      }
      wrap.appendChild(card);
    });
  },

  init() {
    let best = 0;
    try { best = parseInt(localStorage.getItem('tfg_best') || '0', 10); } catch (e) {}
    this.$('best-score').textContent = '🏆 最佳进度：第 ' + best + ' 层';
    this.$('total-wins').textContent = '累计胜场：' + this.getTotalWins();
    this.updateMuteLabel();
    this.renderHeroList();
    this.updateContinueBtn();

    const on = (id, ev, fn) => this.$(id).addEventListener(ev, fn);

    on('btn-start', 'click', () => { Audio.unlock(); Audio.sfx('select'); Audio.startBgm(); this.renderHeroList(); this.showScreen('screen-hero'); });
    on('btn-detail-confirm', 'click', () => {
      if (!this._pendingHero) return;
      Audio.sfx('select');
      const h = this._pendingHero;
      if (this._pendingUnlock) Game.unlockHero(h.id);
      this.lastHeroId = h.id;
      Game.startRun(h.id, h.name);
      this._pendingHero = null;
      this._pendingUnlock = false;
      this.showBoons();
    });
    on('btn-detail-back', 'click', () => { Audio.sfx('click'); this._pendingHero = null; this.showScreen('screen-hero'); });

    on('btn-item', 'click', () => { if (this.busy) return; Audio.sfx('click'); this.openBag(); });
    on('btn-bag-close', 'click', () => { Audio.sfx('click'); this.closeBag(); });
    on('btn-shop-leave', 'click', () => { Audio.sfx('click'); Game.nextFloor(); });
    on('btn-event-continue', 'click', () => { Audio.sfx('click'); Game.eventAdvance(); });

    on('screen-dialogue', 'click', () => { if (this._dialogLines) this._dialogNext(); });

    on('btn-mute', 'click', () => { Audio.unlock(); Audio.toggleMute(); this.updateMuteLabel(); });
    on('btn-mute2', 'click', () => { Audio.toggleMute(); this.updateMuteLabel(); });

    on('btn-restart', 'click', () => { Audio.sfx('select'); const hero = HEROES.find(h => h.id === this.lastHeroId); Game.startRun(this.lastHeroId, hero ? hero.name : '冒险者'); this.showMap(); });
    on('btn-continue', 'click', () => { if (Game.load()) { Audio.sfx('select'); this.showMap(); } });
    on('btn-menu', 'click', () => {
      Audio.sfx('click');
      let best = 0;
      try { best = parseInt(localStorage.getItem('tfg_best') || '0', 10); } catch (e) {}
      this.$('best-score').textContent = '🏆 最佳进度：第 ' + best + ' 层';
      this.$('total-wins').textContent = '累计胜场：' + this.getTotalWins();
      this.updateContinueBtn();
      this.showScreen('screen-title');
    });
  }
};

document.addEventListener('DOMContentLoaded', () => UI.init());
