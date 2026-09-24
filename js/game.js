/* ===== 游戏核心逻辑（多敌人战斗 + 群体技能 + 事件 + 遗物 + 意图 + 存档） ===== */

const Game = {
  player: null,
  enemies: [],
  floor: 1,
  map: [],
  wins: 0,
  over: false,
  rewards: [],
  offers: [],
  waves: [],
  waveIndex: 0,
  currentEvent: null,
  eventAmbush: false,
  firstStrikeUsed: false,

  startRun(heroId, name) {
    const hero = HEROES.find(h => h.id === heroId) || HEROES[0];
    this.player = {
      name, heroId, emoji: hero.emoji, color: hero.color,
      hp: hero.hp, maxHp: hero.hp, atk: hero.atk, def: hero.def,
      mp: hero.mp, maxMp: hero.mp,
      skills: hero.skills.slice(), bag: [], relics: [], gold: 0, shield: 0, pet: null, battleBuff: 0,
      burn: 0, defend: false
    };
    this.wins = 0;
    this.floor = 1;
    this.over = false;
    this.enemies = [];
    this.waves = [];
    this.waveIndex = 0;
    this.currentEvent = null;
    this.eventAmbush = false;
    this.firstStrikeUsed = false;
    this.itemUsed = false;
    this.buildMap();
    this.save();
  },

  buildMap() {
    this.map = [];
    this.map.push({ nodes: [{ type: 'battle' }], chosen: null });
    for (let f = 2; f <= 7; f++) {
      this.map.push({ nodes: shuffle(NODE_POOL).slice(0, 3).map(t => ({ type: t })), chosen: null });
    }
    this.map.push({ nodes: [{ type: 'boss' }], chosen: null });
  },

  /* 战斗组合：wave = 一组同时出现的敌人，waves = 波次 */
  buildWaves(type) {
    if (type === 'elite') return [[{ kind: 'elite' }]];
    if (type === 'boss') return [[{ kind: 'boss' }, { kind: 'minion' }]];
    if (type === 'battle') {
      if (this.floor === 1) return [[{ kind: 'normal' }]];                             // 首战固定单敌人
      const r = Math.random();
      if (r < 0.12) return [[{ kind: 'weak' }, { kind: 'weak' }, { kind: 'weak' }]];   // 一群小怪
      if (r < 0.26) return [[{ kind: 'duo' }, { kind: 'duo' }]];                       // 敌人2人组
      if (r < 0.38) return [[{ kind: 'summoner' }]];                                    // 召唤师
      if (r < 0.48) return [[{ kind: 'clone' }]];                                       // 分身魔
      if (r < 0.62) return [[{ kind: 'normal' }, { kind: 'normal' }]];                  // 两波
      return [[{ kind: 'normal' }]];
    }
    return [[{ kind: 'normal' }]];
  },

  startNode(nodeIndex) {
    const entry = this.map[this.floor - 1];
    const node = entry.nodes[nodeIndex];
    entry.chosen = nodeIndex;
    this.player.battleBuff = 0;
    switch (node.type) {
      case 'battle': this.waves = this.buildWaves('battle'); this.waveIndex = 0; this.spawnWave(); UI.startBattle(); break;
      case 'elite':  this.waves = this.buildWaves('elite');  this.waveIndex = 0; this.spawnWave(); UI.startBattle(); break;
      case 'rest':   UI.showRest(); break;
      case 'shop':   this.offers = genShopOffers(); UI.showShop(this.offers); break;
      case 'event':  this.enterEvent(); break;
      case 'boss':   UI.dialogue(BOSS_INTRO, () => { this.waves = this.buildWaves('boss'); this.waveIndex = 0; this.spawnWave(); UI.startBattle(); }); break;
    }
  },

  spawnWave() {
    this.enemies = (this.waves[this.waveIndex] || [{ kind: 'normal' }]).map(spec => this.makeEnemy(spec));
    this.firstStrikeUsed = false;
    this.itemUsed = false;
    this.player.shield = this.hasRelic('holysigil') ? 10 : 0;
    for (const e of this.enemies) this.pickIntent(e);
  },

  makeEnemy(spec) {
    const boss = this.floor === MAP_TOTAL;
    const hpScale = boss ? 1 : 1 + (this.floor - 1) * 0.10;
    const atkScale = boss ? 1 : 1 + (this.floor - 1) * 0.08;
    const defScale = boss ? 1 : 1 + (this.floor - 1) * 0.05;
    let tpl, mul = 1, isBoss = false, elite = false;
    switch (spec.kind) {
      case 'boss':     tpl = BOSSES[Math.floor(Math.random() * BOSSES.length)]; isBoss = true; break;
      case 'elite':    tpl = ENEMIES[Math.floor(Math.random() * ENEMIES.length)]; elite = true; mul = 1.2; break;
      case 'weak':     tpl = ENEMIES[Math.floor(Math.random() * ENEMIES.length)]; mul = 0.33; break;
      case 'duo':      tpl = ENEMIES[Math.floor(Math.random() * ENEMIES.length)]; mul = 0.55; break;
      case 'minion':   tpl = MINIONS[Math.floor(Math.random() * MINIONS.length)]; mul = 0.4; break;
      case 'summoner': tpl = ENEMIES.find(x => x.id === 'summoner'); mul = 0.8; break;
      case 'clone':    tpl = ENEMIES.find(x => x.id === 'clone'); mul = 0.8; break;
      default:         tpl = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
    }
    const hp = Math.round(tpl.hp * hpScale * mul);
    return {
      name: tpl.name, emoji: tpl.emoji, isBoss, elite, kind: spec.kind,
      hp, maxHp: hp,
      atk: Math.round(tpl.atk * atkScale * mul), def: Math.round(tpl.def * defScale * mul),
      skills: tpl.skills || [{ name: '普通攻击', mult: 1.0, w: 100 }], taunts: tpl.taunts || TAUNTS, ai: tpl.ai, deathrattle: tpl.deathrattle || 0,
      elements: tpl.elements || (tpl.element ? [tpl.element] : []),
      burn: 0, defend: false, intent: null, cloneUsed: false
    };
  },

  /* ==== 遗物 ==== */
  hasRelic(id) { return this.player && this.player.relics.includes(id); },

  applyRelic(id) {
    const p = this.player;
    if (p.relics.includes(id)) return;
    p.relics.push(id);
    switch (id) {
      case 'whetstone': p.atk += 3; break;
      case 'ironplate': p.def += 3; break;
      case 'lifegem': p.maxHp += 25; p.hp += 25; break;
      case 'mpgem': p.maxMp += 15; p.mp += 15; break;
      case 'glasscannon': p.atk += 12; p.maxHp = Math.max(1, p.maxHp - 30); p.hp = Math.min(p.hp, p.maxHp); break;
    }
  },

  grantRareRelic() {
    const avail = RELICS.filter(r => r.rarity === 'rare' && !this.player.relics.includes(r.id));
    if (!avail.length) return null;
    const r = avail[Math.floor(Math.random() * avail.length)];
    this.applyRelic(r.id);
    return r;
  },

  burnDmg() { return BURN_DMG * (this.hasRelic('embertalisman') ? 2 : 1); },

  /* ==== 敌人意图 ==== */
  pickIntent(e) {
    if (!e) return;
    let act = null;
    if (e.ai === 'healer' && e.hp < e.maxHp * 0.5) act = e.skills.find(s => s.heal);
    if (!act) act = weightedPick(e.skills);
    e.intent = { name: act.name, icon: this.intentIcon(act), act };
  },
  intentIcon(act) {
    if (act.summon) return '🌀';
    if (act.heal) return '💚';
    if (act.defend) return '🛡️';
    if (act.charge) return '⚡';
    if ((act.mult || 1) >= 1.8) return '💥';
    return '⚔️';
  },

  calcDmg(atk, mult, def) {
    const raw = atk * (mult || 1);
    return Math.max(1, Math.round(raw * 100 / (100 + Math.max(0, def))));
  },

  typeMult(atkEl, defEls) {
    if (!atkEl) return 1;
    const list = Array.isArray(defEls) ? defEls : (defEls ? [defEls] : []);
    let m = 1;
    for (const d of list) {
      if (!d) continue;
      const t = TYPE_CHART[atkEl] && TYPE_CHART[atkEl][d];
      if (t) m *= t;
    }
    return m;
  },

  startPlayerTurn() {
    const p = this.player;
    if (!p || p.hp <= 0) return;
    this.itemUsed = false;
    if (this.hasRelic('regenheart') && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + 3);
      UI.animHeal('player', 3);
    }
  },

  /* 随从每回合自动攻击一个存活敌人 */
  petAct() {
    const p = this.player;
    if (!p.pet) return;
    const target = this.enemies.find(e => e.hp > 0);
    if (!target) return;
    const dmg = Math.max(1, Math.round(p.atk * p.pet.mult * 100 / (100 + Math.max(0, target.def))));
    target.hp = Math.max(0, target.hp - dmg);
    UI.animHitEnemy(target, dmg);
    UI.animPet();
    UI.sfx('hit');
    UI.log(p.pet.emoji + ' ' + p.pet.name + ' 攻击了 ' + target.name + '，造成 ' + dmg + ' 点伤害');
  },

  playerAct(skillId, targetIdx) {
    if (this.over || !this.player || !this.enemies.length) return false;
    const p = this.player;
    const s = SKILLS[skillId];
    if (!s) return false;

    if (s.mp > 0 && p.mp < s.mp) {
      UI.log('法力不足！');
      UI.sfx('click');
      UI.setBusy(false);
      return false;
    }
    if (s.mp > 0) p.mp -= s.mp;

    if (s.type === 'attack') {
      if (s.aoe) {
        for (const e of this.enemies) if (e.hp > 0) this.hitEnemy(e, s);
      } else {
        let t = this.enemies[targetIdx];
        if (!t || t.hp <= 0) t = this.enemies.find(e => e.hp > 0);
        if (t) this.hitEnemy(t, s);
      }
    } else if (s.type === 'heal') {
      const amt = randInt(s.heal[0], s.heal[1]);
      p.hp = Math.min(p.maxHp, p.hp + amt);
      UI.animHeal('player', amt);
      UI.sfx('heal');
      UI.log('你使用「' + s.name + '」，恢复了 ' + amt + ' 点生命');
    } else if (s.type === 'buff') {
      if (s.buff === 'defend') p.defend = true;
      UI.sfx('skill');
      UI.log('你摆出了防御姿态，本回合受到伤害减半！');
    } else if (s.type === 'mpheal') {
      const amt = Math.round(p.maxMp * (s.pct || 0.3));
      p.mp = Math.min(p.maxMp, p.mp + amt);
      UI.animMp(amt);
      UI.sfx('heal');
      UI.log('你使用「' + s.name + '」，恢复了 ' + amt + ' 点法力');
    } else if (s.type === 'hpheal') {
      const amt = Math.round(p.maxHp * (s.pct || 0.25));
      p.hp = Math.min(p.maxHp, p.hp + amt);
      if (s.shield) p.shield += s.shield;
      UI.animHeal('player', amt);
      UI.sfx('heal');
      UI.log('你使用「' + s.name + '」，恢复了 ' + amt + ' 点生命' + (s.shield ? '，并获得 ' + s.shield + ' 点护盾' : ''));
    } else if (s.type === 'summon') {
      if (!p.pet) {
        const pet = PETS[s.pet];
        p.pet = { name: pet.name, emoji: pet.emoji, mult: pet.mult, hp: Math.round(p.maxHp * pet.hpMult), maxHp: Math.round(p.maxHp * pet.hpMult), def: pet.def };
        UI.sfx('select');
        UI.log('你召唤了 ' + pet.emoji + ' ' + pet.name + ' 并肩作战！');
      } else {
        UI.log('你的随从还在战斗中！');
      }
    }

    /* 敌人灼烧结算 */
    const bd = this.burnDmg();
    for (const e of this.enemies) {
      if (e.burn > 0) {
        e.hp = Math.max(0, e.hp - bd);
        e.burn--;
        UI.animHitEnemy(e, bd);
        UI.log(e.name + ' 被灼烧，损失 ' + bd + ' 点生命');
      }
    }

    /* 随从自动攻击 */
    this.petAct();

    UI.updateBars();
    if (this.enemies.every(e => e.hp <= 0)) { this.victory(); return true; }
    if (p.hp <= 0) { this.defeat(); return true; }

    setTimeout(() => this.enemyAct(), 520);
    return true;
  },

  hitEnemy(e, s) {
    const p = this.player;
    let dmg = this.calcDmg(p.atk + (p.battleBuff || 0), s.mult, e.def);
    const eff = this.typeMult(s.element, e.elements);
    const effMsg = eff > 1 ? '效果拔群！' : (eff < 1 ? '效果不佳……' : '');
    if (eff !== 1) dmg = Math.round(dmg * eff);
    if (this.hasRelic('firemark') && s.element === 'fire') dmg = Math.round(dmg * 1.4);
    if (this.hasRelic('skill_amp') && s.mp > 0) dmg = Math.round(dmg * 1.25);
    if (this.hasRelic('wardrum') && p.hp < p.maxHp * 0.3) dmg = Math.round(dmg * 1.5);
    if (this.hasRelic('execute') && e.hp > 0 && e.hp < e.maxHp * 0.3) dmg = Math.round(dmg * 1.3);
    if (this.hasRelic('first_strike') && !this.firstStrikeUsed) { dmg = Math.round(dmg * 1.5); this.firstStrikeUsed = true; }
    let crit = false;
    if (this.hasRelic('critblade') && Math.random() < 0.2) { dmg = Math.round(dmg * 1.6); crit = true; }
    if (e.defend) { dmg = Math.max(1, Math.floor(dmg / 2)); e.defend = false; UI.log(e.name + ' 的防御姿态抵消了一半伤害！'); }
    e.hp = Math.max(0, e.hp - dmg);
    UI.animHitEnemy(e, dmg);
    if (crit || eff > 1) UI.shake();
    UI.sfx(eff > 1 ? 'super' : (s.mp > 0 ? 'skill' : 'hit'));
    UI.log('你使用「' + s.name + '」' + (s.aoe ? '(全体)' : '') + (effMsg ? ' ' + effMsg : '') + (crit ? '（暴击！）' : '') + '，对 ' + e.name + ' 造成 ' + dmg + ' 点伤害');
    if (this.hasRelic('chainlightning')) {
      e.hp = Math.max(0, e.hp - 5);
      UI.animHitEnemy(e, 5);
      UI.log('连锁闪电追加 5 点真实伤害');
    }
    if (s.burn) { e.burn = BURN_TURNS; UI.log(e.name + ' 被点燃了！'); }
    const lifesteal = (s.lifesteal || 0) + (this.hasRelic('vampfang') ? 0.2 : 0);
    if (lifesteal > 0) {
      const heal = Math.round(dmg * lifesteal);
      if (heal > 0) { p.hp = Math.min(p.maxHp, p.hp + heal); UI.animHeal('player', heal); UI.log('吸取了 ' + heal + ' 点生命'); }
    }
    /* 分身术 */
    if (e.ai === 'clone' && !e.cloneUsed && e.hp > 0 && e.hp < e.maxHp * 0.5) {
      e.cloneUsed = true;
      const clone = {
        name: e.name + '（分身）', emoji: e.emoji,
        hp: Math.round(e.maxHp * 0.4), maxHp: Math.round(e.maxHp * 0.4),
        atk: e.atk, def: e.def, skills: e.skills, taunts: e.taunts, ai: 'none',
        elements: e.elements, isBoss: false, elite: false,
        burn: 0, defend: false, intent: null, cloneUsed: true
      };
      this.enemies.push(clone);
      this.pickIntent(clone);
      UI.log('👥 ' + e.name + ' 使用了分身术，出现了分身！');
    }
    /* 自爆 */
    if (e.hp <= 0 && e.deathrattle && !e._deathrattled) {
      e._deathrattled = true;
      p.hp = Math.max(0, p.hp - e.deathrattle);
      UI.animHit('player', e.deathrattle); UI.shake(); UI.sfx('boom');
      UI.log('💥 ' + e.name + ' 爆炸了，你受到 ' + e.deathrattle + ' 点伤害！');
    }
  },

  enemyAct() {
    if (this.over || !this.player) { UI.setBusy(false); return; }
    const p = this.player;
    if (p.burn > 0) {
      p.hp = Math.max(0, p.hp - BURN_DMG);
      p.burn--;
      UI.animHit('player', BURN_DMG);
      UI.log('你被灼烧，损失 ' + BURN_DMG + ' 点生命');
    }
    if (p.hp <= 0) { UI.updateBars(); this.defeat(); return; }

    for (const e of this.enemies) {
      if (e.hp <= 0 || p.hp <= 0 || this.over) continue;
      this.enemyActOne(e);
    }

    UI.updateBars();
    if (p.hp <= 0) { this.defeat(); return; }
    if (this.enemies.every(e => e.hp <= 0)) { this.victory(); return; }
    for (const e of this.enemies) if (e.hp > 0) this.pickIntent(e);
    this.startPlayerTurn();
    UI.setBusy(false);
  },

  enemyActOne(e) {
    const p = this.player;
    const act = (e.intent && e.intent.act) || weightedPick(e.skills);
    if (act.summon) {
      if ((e.summonCount || 0) < 2) {
        e.summonCount = (e.summonCount || 0) + 1;
        const m = this.makeEnemy({ kind: 'minion' });
        this.enemies.push(m);
        this.pickIntent(m);
        UI.sfx('click');
        UI.log(e.name + ' 使用「' + act.name + '」，召唤了 ' + m.name + '！');
      } else {
        UI.sfx('click');
        UI.log(e.name + ' 试图召唤，但已无余力！');
      }
    } else if (act.heal) {
      e.hp = Math.min(e.maxHp, e.hp + act.heal);
      UI.animHealEnemy(e, act.heal);
      UI.sfx('heal');
      UI.log(e.name + ' 使用「' + act.name + '」，恢复了 ' + act.heal + ' 点生命');
    } else if (act.defend) {
      e.defend = true;
      UI.sfx('click');
      UI.log(e.name + ' 摆出了防御姿态！');
    } else {
      const effMult = (act.mult || 1) * (act.charge ? 1.2 : 1);
      const hits = act.hits || 1;
      const hasPet = p.pet && p.pet.hp > 0;
      const targetPet = !!act.aoe || (hasPet && Math.random() < 0.3);
      const targetPlayer = !!act.aoe || !targetPet;
      for (let i = 0; i < hits; i++) {
        if (targetPlayer && p.hp > 0) {
          let dmg = this.calcDmg(e.atk, effMult, p.def);
          if (p.defend) { dmg = Math.max(1, Math.floor(dmg / 2)); p.defend = false; UI.log('你的防御减半了这次伤害！'); }
          if (p.shield > 0 && dmg > 0) {
            const ab = Math.min(p.shield, dmg);
            p.shield -= ab; dmg -= ab;
            UI.log('护盾吸收了 ' + ab + ' 点伤害');
          }
          p.hp = Math.max(0, p.hp - dmg);
          UI.animHit('player', dmg);
          if (act.charge) UI.shake();
          UI.log(e.name + ' 使用「' + act.name + '」，对你造成 ' + dmg + ' 点伤害');
          if (this.hasRelic('thorns') && dmg > 0) {
            e.hp = Math.max(0, e.hp - 5);
            UI.animHitEnemy(e, 5);
            UI.log('荆棘护甲反弹 5 点伤害');
            if (e.hp <= 0 && e.deathrattle && !e._deathrattled) {
              e._deathrattled = true;
              p.hp = Math.max(0, p.hp - e.deathrattle);
              UI.animHit('player', e.deathrattle); UI.shake(); UI.sfx('boom');
              UI.log('💥 ' + e.name + ' 爆炸了！');
            }
          }
        }
        if (targetPet && p.pet && p.pet.hp > 0) {
          const pdmg = this.calcDmg(e.atk, effMult, p.pet.def);
          p.pet.hp = Math.max(0, p.pet.hp - pdmg);
          UI.log(e.name + ' 使用「' + act.name + '」，对 ' + p.pet.name + ' 造成 ' + pdmg + ' 点伤害');
          if (p.pet.hp <= 0) {
            UI.log('💔 你的 ' + p.pet.name + ' 阵亡了！');
            p.pet = null;
            UI.shake();
            UI.sfx('defeat');
          }
        }
        if (p.hp <= 0 || e.hp <= 0) break;
      }
      if (act.burn) { p.burn = BURN_TURNS; UI.log('你被点燃了，将持续灼烧！'); }
      UI.sfx(act.charge ? 'big' : 'hit');
    }
  },

  useItem(index) {
    if (this.over || !this.player || this.itemUsed) return;
    const p = this.player;
    const item = p.bag[index];
    if (!item) return;
    p.bag.splice(index, 1);
    switch (item.effect) {
      case 'mp':
        p.mp = Math.min(p.maxMp, p.mp + item.amount);
        UI.animMp(item.amount);
        UI.log('你使用了「' + item.name + '」，恢复了 ' + item.amount + ' 点法力');
        break;
      case 'shield':
        p.shield += item.amount;
        UI.log('你使用了「' + item.name + '」，获得 ' + item.amount + ' 点护盾');
        break;
      case 'buff':
        p.battleBuff = (p.battleBuff || 0) + item.amount;
        UI.log('你使用了「' + item.name + '」，本场战斗攻击 +' + item.amount);
        break;
      default:
        p.hp = Math.min(p.maxHp, p.hp + item.amount);
        UI.animHeal('player', item.amount);
        UI.log('你食用了「' + item.name + '」，恢复了 ' + item.amount + ' 点生命');
    }
    UI.sfx('heal');
    this.itemUsed = true;
    UI.updateBars();
    UI.closeBag();
    UI.setBusy(false);
  },

  victory() {
    if (this.over) return;
    const p = this.player;
    UI.sfx('victory');
    UI.log('✨ 你击败了 ' + this.enemies.map(e => e.name).join('、') + '！');

    /* 下一波？ */
    if (this.waves && this.waveIndex < this.waves.length - 1) {
      this.waveIndex++;
      const heal = randInt(15, 25);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      UI.log('💚 恢复 ' + heal + ' 点生命，第 ' + (this.waveIndex + 1) + ' 波敌人来袭！');
      this.spawnWave();
      UI.updateBars();
      UI.updateHud();
      this.startPlayerTurn();
      UI.setBusy(false);
      return;
    }

    /* 整场胜利结算 */
    this.wins++;
    this.addTotalWin();
    const heal = randInt(15, 30) + (this.enemies.length > 1 ? (this.enemies.length - 1) * 8 : 0);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    const mp = Math.round(p.maxMp * 0.35);
    p.mp = Math.min(p.maxMp, p.mp + mp);
    UI.log('💚 恢复了 ' + heal + ' 点生命和 ' + mp + ' 点法力');

    if (this.wins % 3 === 0) {
      p.maxHp += 30; p.atk += 5; p.def += 4;
      UI.log('🏆 每 3 胜成长：生命上限 +30、攻击 +5、防御 +4');
    }

    const curWave = this.waves[this.waveIndex] || [];
    let gold = curWave.some(s => s.kind === 'elite') ? randInt(40, 60) : randInt(20, 30);
    if (this.hasRelic('lucky_coin')) gold = Math.round(gold * 1.5);
    if (this.waves && this.waves.length > 1) { gold += 15; UI.log('⚔️ 多波战斗额外奖励 +15 金币'); }
    if (curWave.length > 1) { gold += 10; UI.log('👥 多敌人战斗额外奖励 +10 金币'); }
    p.gold += gold;
    UI.log('💰 获得 ' + gold + ' 金币');

    if (curWave.some(s => s.kind === 'elite')) {
      const avail = RELICS.filter(r => !p.relics.includes(r.id));
      if (avail.length) {
        const r = avail[Math.floor(Math.random() * avail.length)];
        this.applyRelic(r.id);
        UI.log('💎 精英掉落遗物「' + r.name + '」');
      }
    }
    if (Math.random() < 0.3) {
      const it = ITEMS[Math.floor(Math.random() * ITEMS.length)];
      p.bag.push({ id: it.id, name: it.name, emoji: it.emoji, effect: it.effect, amount: it.amount });
      UI.log('🎁 恭喜，获得道具：「' + it.name + '」');
    }

    UI.updateBars();

    if (this.floor === MAP_TOTAL) {
      this.record();
      this.addClear();
      this.grantUnlock();
      this.clearSave();
      setTimeout(() => this.ending(true), 1000);
      return;
    }

    this.rewards = genRewards(p);
    setTimeout(() => UI.showRewards(this.rewards), 1000);
  },

  defeat() {
    if (this.over) return;
    /* 复活遗物：一次性自动触发 */
    if (this.player.relics.includes('phoenix')) {
      const p = this.player;
      p.relics = p.relics.filter(id => id !== 'phoenix');
      p.hp = Math.round(p.maxHp * 0.5);
      p.burn = 0;
      p.defend = false;
      UI.shake();
      UI.sfx('heal');
      UI.log('🪶 不死鸟之羽发动！你以 50% 生命复活了！');
      UI.updateBars();
      for (const e of this.enemies) if (e.hp > 0) this.pickIntent(e);
      this.startPlayerTurn();
      UI.setBusy(false);
      return;
    }
    this.over = true;
    this.clearSave();
    UI.sfx('defeat');
    const e = this.enemies.find(x => x.hp > 0) || this.enemies[0];
    const name = e ? e.name : '敌人';
    const taunts = (e && e.taunts && e.taunts.length) ? e.taunts : TAUNTS;
    const taunt = taunts[Math.floor(Math.random() * taunts.length)];
    UI.log('💀 你被 ' + name + ' 击败了');
    UI.log(name + ' 嘲讽道："' + taunt + '"');
    this.record();
    setTimeout(() => this.ending(false), 1300);
  },

  record() {
    let best = 0;
    try { best = parseInt(localStorage.getItem('tfg_best') || '0', 10); } catch (err) {}
    if (this.floor > best) { best = this.floor; try { localStorage.setItem('tfg_best', String(best)); } catch (err) {} }
    return best;
  },

  addTotalWin() {
    let t = 0;
    try { t = parseInt(localStorage.getItem('tfg_total') || '0', 10); } catch (err) {}
    t++;
    try { localStorage.setItem('tfg_total', String(t)); } catch (err) {}
  },

  /* ==== 存档 / 读档 ==== */
  save() {
    try {
      localStorage.setItem('tfg_save', JSON.stringify({ v: 1, player: this.player, floor: this.floor, map: this.map, wins: this.wins }));
    } catch (err) {}
  },

  hasSave() {
    try { return !!localStorage.getItem('tfg_save'); } catch (err) { return false; }
  },

  load() {
    try {
      const raw = localStorage.getItem('tfg_save');
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || !d.player || !d.player.skills || !d.map) return false;
      this.player = d.player;
      this.floor = d.floor;
      this.map = d.map;
      this.wins = d.wins;
      this.over = false;
      this.enemies = [];
      this.waves = [];
      this.waveIndex = 0;
      return true;
    } catch (err) { return false; }
  },

  clearSave() {
    try { localStorage.removeItem('tfg_save'); } catch (err) {}
  },

  /* ==== 职业解锁 ==== */
  getUnlocked() {
    try { return JSON.parse(localStorage.getItem('tfg_unlocked') || '[]'); } catch (err) { return []; }
  },
  setUnlocked(list) {
    try { localStorage.setItem('tfg_unlocked', JSON.stringify(list)); } catch (err) {}
  },
  getClears() {
    try { return parseInt(localStorage.getItem('tfg_clears') || '0', 10); } catch (err) { return 0; }
  },
  addClear() {
    const c = this.getClears() + 1;
    try { localStorage.setItem('tfg_clears', String(c)); } catch (err) {}
  },
  hasUnlock() {
    try {
      if (this.getClears() === 0) return true;  // 首次通关前：可自由更换解锁职业
      return localStorage.getItem('tfg_unlock') !== '0';
    } catch (err) { return true; }
  },
  grantUnlock() {
    try { localStorage.setItem('tfg_unlock', '1'); } catch (err) {}
  },
  consumeUnlock() {
    try { localStorage.setItem('tfg_unlock', '0'); } catch (err) {}
  },
  unlockHero(heroId) {
    if (this.getClears() === 0) {
      this.setUnlocked([heroId]);  // 首次通关前：可自由更换
    } else {
      const list = this.getUnlocked();
      if (!list.includes(heroId)) list.push(heroId);
      this.setUnlocked(list);
      this.consumeUnlock();
    }
  },

  ending(win) {
    UI.dialogue(win ? VICTORY_LINES : DEFEAT_LINES, () => UI.showResult(win));
  },

  /* ==== 事件 ==== */
  enterEvent() {
    this.currentEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    this.eventAmbush = false;
    UI.showEvent(this.currentEvent);
  },

  resolveEvent(choiceIdx) {
    const ev = this.currentEvent;
    const ch = ev.choices[choiceIdx];
    if (!ch || !ch.do) { this.eventAmbush = false; UI.showEventResult('你选择离开。'); return; }
    const msg = ch.do(this);
    UI.showEventResult(msg || '……');
  },

  eventAdvance() {
    if (this.eventAmbush) {
      this.eventAmbush = false;
      this.waves = this.buildWaves('battle'); this.waveIndex = 0;
      this.spawnWave();
      UI.startBattle();
    } else {
      this.nextFloor();
    }
  },

  applyReward(r) {
    const p = this.player;
    switch (r.type) {
      case 'skill': p.skills.push(r.skillId); UI.log('🎓 习得新技能「' + r.name + '」'); break;
      case 'relic': { const rr = RELICS.find(x => x.id === r.relicId); this.applyRelic(r.relicId); UI.log('💎 获得遗物「' + rr.name + '」'); break; }
      case 'maxhp': p.maxHp += r.amount; p.hp += r.amount; UI.log('❤️ 生命上限 +' + r.amount); break;
      case 'atk': p.atk += r.amount; UI.log('⚔️ 攻击力 +' + r.amount); break;
      case 'def': p.def += r.amount; UI.log('🛡️ 防御力 +' + r.amount); break;
      case 'maxmp': p.maxMp += r.amount; p.mp += r.amount; UI.log('💧 法力上限 +' + r.amount); break;
      case 'item': {
        const it = ITEMS.find(i => i.id === r.itemId);
        p.bag.push({ id: it.id, name: it.name, emoji: it.emoji, effect: it.effect, amount: it.amount });
        UI.log('🎁 获得道具「' + it.name + '」');
        break;
      }
      case 'fullheal': p.hp = p.maxHp; UI.log('💖 生命完全恢复'); break;
    }
    this.nextFloor();
  },

  doRest(choiceId) {
    const c = REST_CHOICES.find(x => x.id === choiceId);
    if (c) { c.apply(this.player); UI.sfx('heal'); }
    this.nextFloor();
  },

  buyOffer(index) {
    const p = this.player;
    const o = this.offers[index];
    if (!o) return;
    if (p.gold < o.cost) { UI.shopToast('金币不足！'); UI.sfx('click'); return; }
    p.gold -= o.cost;
    if (o.type === 'item') {
      const it = ITEMS.find(i => i.id === o.itemId);
      p.bag.push({ id: it.id, name: it.name, emoji: it.emoji, effect: it.effect, amount: it.amount });
    } else if (o.type === 'relic') {
      this.applyRelic(o.relicId);
    } else if (o.type === 'atk') p.atk += o.amount;
    else if (o.type === 'def') p.def += o.amount;
    else if (o.type === 'maxhp') { p.maxHp += o.amount; p.hp += o.amount; }
    else if (o.type === 'maxmp') { p.maxMp += o.amount; p.mp += o.amount; }
    this.offers[index] = null;
    UI.sfx('select');
    UI.refreshShop(this.offers);
  },

  nextFloor() {
    this.floor++;
    this.save();
    UI.showMap();
  },

  pickBoons() {
    return shuffle(BOONS).slice(0, 3);
  },

  applyBoon(boon) {
    if (boon && boon.apply) boon.apply(this.player);
    this.save();
  }
};
