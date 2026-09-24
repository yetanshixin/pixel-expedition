# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

「像素远征」——纯前端单机肉鸽格斗游戏。零依赖、零构建，原生 HTML + CSS + JS，可直接部署到 GitHub Pages。基于原 Java 文字格斗游戏（`格斗游戏需求文档.md`）重制。

## 运行

- 本地：直接双击打开 `index.html`（无需服务器、无需安装依赖）。
- 或用静态服务器：`python -m http.server` 后访问 `http://localhost:8000`。

## 架构

- `index.html`：页面骨架（各场景屏幕；敌人区、技能区等由 JS 动态渲染）。
- `css/style.css`：像素风样式、动画、移动端响应式。
- `js/data.js`：纯数据（英雄/技能/敌人/遗物/道具/祝福/事件/属性克制表）+ 工具函数（`shuffle`、`weightedPick`、`genRewards`、`genShopOffers` 等）。
- `js/audio.js`：Web Audio 合成 8-bit BGM 与音效（零外部文件）。
- `js/game.js`：游戏核心逻辑（状态机：地图选路、多敌人战斗、事件、遗物、存档、职业解锁）。
- `js/main.js`：UI 渲染与事件绑定（全局 `UI` 对象）。

脚本为普通 `<script>`（**非 ES module**），按 `data → audio → game → main` 顺序加载，共享全局命名空间（`Game`、`UI`、`SKILLS`、`HEROES`、`TYPE_CHART`、`RELICS`、`ITEMS` 等）。直接双击 `file://` 可运行（无 CORS 问题）。

## 关键约定

- **多敌人回合制**：`Game.enemies` 是数组（支持 1vN、召唤、分身）；`playerAct(skillId, targetIdx)` 处理单体/群体（`aoe`）。
- **属性克制**：`TYPE_CHART[攻击元素][防御元素] = 倍率`；敌人可多属性（`elements` 数组，倍率相乘）；`calcDmg` 用百分比减伤公式。
- **UI 与逻辑分离**：`game.js` 通过 `window.UI` 回调（`UI.log`、`UI.updateBars`、`UI.animHitEnemy` 等），不直接操作 DOM。
- **存档**（`localStorage`）：对局 `tfg_save`、最佳进度 `tfg_best`、累计胜场 `tfg_total`、职业解锁 `tfg_unlocked` / `tfg_unlock` / `tfg_clears`。
- **职业解锁**：首次通关前可自由更换已解锁职业（`getClears() === 0` 时 `unlockHero` 替换而非追加）。
