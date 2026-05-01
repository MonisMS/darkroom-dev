import type { GameState, SearchableObject } from './types';
import {
  buildTileMap, ROOMS, GATES, OBJECT_TEMPLATES, EXTRA_TRAP_TEMPLATES,
  countRealRemaining, getRoomAt, TILE_SIZE,
} from './map';
import { ITEMS, getRandomItems } from './items';
import { createPlayer, movePlayer, checkGates } from './player';
import {
  initAudio, startAmbient, playPickup, playFootstep,
  playUnlock, playBuzzer, playScream, playHeartbeat,
  setWatcherAudio, resumeAudio,
  playRoomClearMusic, stopRoomClearMusic, playWinMusic,
  startAmbientSounds, stopAmbientSounds,
} from './audio';
import { getRandomRoast } from './roasts';
import {
  rebuildMapCache, render,
  renderTitleScreen, renderItemCard, renderRoastCard,
  renderInventory, renderWinScreen, renderRoomClearScreen,
  drawSearchProgress, winButtonBounds,
} from './renderer';

// ── Canvas ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx    = canvas.getContext('2d')!;

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  rebuildMapCache();
}
resize();
window.addEventListener('resize', resize);

const tiles      = buildTileMap();
const TOTAL_ITEMS = 9;

// ── Jump scare video + thank you screen ───────────────────────────────────────
const scareVideo   = document.getElementById('scare-video')    as HTMLVideoElement | null;
const thankYouEl   = document.getElementById('thankyou-screen') as HTMLDivElement  | null;
let thankYouVisible = false;

function showThankYou() {
  thankYouVisible = true;
  if (thankYouEl) thankYouEl.style.display = 'flex';
}

function hideThankYou() {
  thankYouVisible = false;
  if (thankYouEl) thankYouEl.style.display = 'none';
}

document.getElementById('btn-replay')?.addEventListener('click', () => {
  hideThankYou();
  resetGame();
});

document.getElementById('btn-share')?.addEventListener('click', () => {
  shareOnX();
});

function triggerFinalJumpscare() {
  if (!scareVideo) return;
  scareVideo.style.display = 'block';
  scareVideo.currentTime = 0;
  scareVideo.play().catch(() => {
    scareVideo.style.display = 'none';
    showThankYou();
  });
  scareVideo.onended = () => {
    scareVideo.style.display = 'none';
    showThankYou();
  };
}

// ── Build objects ─────────────────────────────────────────────────────────────
function buildSearchableObjects(): SearchableObject[] {
  const legendary = ITEMS.find(i => i.id === 'agi')!;
  const objects: SearchableObject[] = [];

  for (let roomId = 0; roomId < 4; roomId++) {
    const templates = OBJECT_TEMPLATES.filter(t => t.roomId === roomId);
    const realItems = getRandomItems(2);
    const shuffled  = [...templates].sort(() => Math.random() - 0.5);
    shuffled.forEach((tmpl, i) => {
      objects.push({ ...tmpl, searched: false, item: i < 2 ? realItems[i] : null });
    });
  }

  const vault = OBJECT_TEMPLATES.find(t => t.roomId === 4)!;
  objects.push({ ...vault, searched: false, item: legendary });

  EXTRA_TRAP_TEMPLATES.forEach(tmpl => objects.push({ ...tmpl, searched: false, item: null }));

  return objects;
}

// ── Input ─────────────────────────────────────────────────────────────────────
const keys: Record<string, boolean> = {};
let holdE      = false;
let holdEStart = 0;
let holdEObjId: string | null = null;
const HOLD_DURATION = 1400;

window.addEventListener('keydown', e => {
  if (e.repeat) return;
  keys[e.key] = true;
  handleKeyDown(e.key);
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Tab'].includes(e.key)) e.preventDefault();
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
  if (e.key === 'e' || e.key === 'E') {
    holdE      = false;
    holdEObjId = null;
  }
});

// ── Canvas click (win screen button) ─────────────────────────────────────────
canvas.addEventListener('click', e => {
  if (state.screen !== 'win') return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const b  = winButtonBounds;
  if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
    triggerFinalJumpscare();
  }
});

// ── State ─────────────────────────────────────────────────────────────────────
const startRoom = ROOMS[0];
const startX = (startRoom.x + startRoom.w / 2) * TILE_SIZE;
const startY = (startRoom.y + startRoom.h / 2) * TILE_SIZE;

function makeState(): GameState {
  return {
    screen: 'title',
    player: createPlayer(startX, startY),
    collected: [],
    activeCard: null,
    cardRevealTime: 0,
    torchRadius: 130,
    time: 0,
    explorerNumber: Math.floor(Math.random() * 400) + 20,
    cameraX: startX - window.innerWidth  / 2,
    cameraY: startY - window.innerHeight / 2,
    unlockedRooms: new Set([0]),
    currentRoomId: 0,
    roastMessage: null,
    jumpScarePlayed: false,
    jumpScareTime: 0,
    watcherX: -9999,
    watcherY: -9999,
    watcherActive: false,
    watcherPunishUntil: 0,
    // Room-clear interstitial
    roomClearIndex: 0,
    roomClearStart: 0,
    roomClearTextVisible: false,
    roomClearTextTime: 0,
    pendingUnlockRoom: null,
    pendingRoomClear: false,
    // Per-room torch decay
    roomEnterTime: 0,
    torchDecaying: false,
    torchFlickerEnd: 0,
    torchFlickerNext: 0,
  };
}

let state         = makeState();
let searchObjects = buildSearchableObjects();
let lastTime      = 0;
let footstepTimer = 0;
const FOOTSTEP_INTERVAL = 320;
const SEARCH_RADIUS     = 48;
const WATCHER_SPEED     = 80;
const WATCHER_TOUCH     = 40;
let audioInited          = false;
let nextHeartbeat        = 0;
let ambientHeartbeatNext = 0;

// ── Key handler ───────────────────────────────────────────────────────────────
function handleKeyDown(key: string) {
  if (thankYouVisible) return;
  resumeAudio();

  if (state.screen === 'title') {
    if (!audioInited) { initAudio(); startAmbient(); startAmbientSounds(); audioInited = true; }
    state.screen = 'playing';
    state.roomEnterTime = performance.now();
    return;
  }

  if (state.screen === 'card') {
    if (key === 'e' || key === 'E' || key === ' ') {
      state.activeCard = null;
      if (state.pendingRoomClear) {
        state.pendingRoomClear = false;
        state.roomClearStart = performance.now();
        state.roomClearTextVisible = false;
        state.roomClearTextTime = 0;
        state.screen = 'room-clear';
        playRoomClearMusic(state.roomClearIndex, () => {
          state.roomClearTextVisible = true;
          state.roomClearTextTime = performance.now();
        });
      } else {
        state.screen = 'playing';
      }
    }
    return;
  }

  if (state.screen === 'roast') {
    if (key === 'e' || key === 'E' || key === ' ') { state.screen = 'playing'; state.roastMessage = null; }
    return;
  }

  if (state.screen === 'room-clear') {
    if (state.roomClearTextVisible) {
      if (state.pendingUnlockRoom !== null) {
        state.unlockedRooms.add(state.pendingUnlockRoom);
        state.pendingUnlockRoom = null;
        playUnlock();
      }
      stopRoomClearMusic();
      state.screen = 'playing';
    }
    return;
  }

  if (state.screen === 'inventory') {
    if (key === 'Tab') state.screen = 'playing';
    return;
  }

  if (state.screen === 'win') {
    if (key === 'r' || key === 'R') resetGame();
    if (key === 's' || key === 'S') shareOnX();
    return;
  }

  if (state.screen === 'playing') {
    if (key === 'Tab') { state.screen = 'inventory'; return; }
    if (key === 'e' || key === 'E') {
      const obj = getNearestObject();
      if (obj) {
        holdE      = true;
        holdEStart = performance.now();
        holdEObjId = obj.id;
      }
    }
  }
}

// ── Object lookup ─────────────────────────────────────────────────────────────
function getNearestObject(): SearchableObject | null {
  let best: SearchableObject | null = null;
  let bestDist = SEARCH_RADIUS;
  for (const obj of searchObjects) {
    if (obj.searched || !state.unlockedRooms.has(obj.roomId)) continue;
    const cx = (obj.tx + obj.tw / 2) * TILE_SIZE;
    const cy = (obj.ty + obj.th / 2) * TILE_SIZE;
    const d  = Math.hypot(state.player.x - cx, state.player.y - cy);
    if (d < bestDist) { bestDist = d; best = obj; }
  }
  return best;
}

function trySearch(obj: SearchableObject) {
  obj.searched = true;

  if (!obj.item) {
    state.roastMessage   = getRandomRoast();
    state.cardRevealTime = performance.now();
    state.screen         = 'roast';
    playBuzzer();
    return;
  }

  state.collected.push(obj.item);
  playPickup(obj.item.rarity);

  if (obj.item.rarity === 'legendary') {
    state.activeCard     = obj.item;
    state.cardRevealTime = performance.now();
    state.torchRadius    = 500;
    state.screen         = 'card';
    setTimeout(() => {
      state.screen     = 'win';
      state.activeCard = null;
      playWinMusic();
    }, 2200);
    return;
  }

  state.activeCard     = obj.item;
  state.cardRevealTime = performance.now();
  state.screen         = 'card';

  const remaining = countRealRemaining(searchObjects, state.currentRoomId);
  if (remaining === 0) {
    const next = state.currentRoomId + 1;
    if (next < ROOMS.length) {
      if (state.currentRoomId < 2) {
        // Rooms 0–1 (Lobby, Office Wing): show fake-out interstitial
        state.pendingUnlockRoom = next;
        state.roomClearIndex    = state.currentRoomId;
        state.pendingRoomClear  = true;
      } else {
        // Rooms 2–3: directly unlock next area, no interstitial
        state.unlockedRooms.add(next);
        playUnlock();
      }
    }
    // Reset torch for next room exploration
    state.torchRadius    = 130;
    state.torchDecaying  = false;
    state.torchFlickerEnd  = 0;
    state.torchFlickerNext = 0;
  }
}

// ── Watcher spawn ─────────────────────────────────────────────────────────────
function spawnWatcher() {
  const spawnId = state.currentRoomId === 0 ? 1 : 0;
  if (!state.unlockedRooms.has(spawnId)) return;
  const r = ROOMS[spawnId];
  state.watcherX      = (r.x + r.w * 0.85) * TILE_SIZE;
  state.watcherY      = (r.y + r.h * 0.85) * TILE_SIZE;
  state.watcherActive = true;
}

function resetGame() {
  stopRoomClearMusic();
  stopAmbientSounds();
  hideThankYou();
  searchObjects = buildSearchableObjects();
  state         = makeState();
  state.screen  = 'playing';
  state.roomEnterTime = performance.now();
  holdE = false; holdEObjId = null; nextHeartbeat = 0; ambientHeartbeatNext = 0;
  startAmbientSounds();
}

function shareOnX() {
  const elapsed = Math.floor(state.time / 1000);
  const mins = Math.floor(elapsed/60).toString().padStart(2,'0');
  const secs  = (elapsed%60).toString().padStart(2,'0');
  const text  = `🤖 DARKROOM.DEV\nExplorer #${state.explorerNumber} discovered the AGI\n${state.collected.length} items | ${mins}:${secs}\n"It asked me to keep this between us."\ndarkroom.dev`;
  window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function loop(ts: number) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  const W = canvas.width, H = canvas.height;

  if (state.screen === 'playing') {
    // Movement
    let dx = 0, dy = 0;
    if (keys['ArrowLeft']  || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
    if (keys['ArrowUp']    || keys['w'] || keys['W']) dy -= 1;
    if (keys['ArrowDown']  || keys['s'] || keys['S']) dy += 1;
    if (dx !== 0 || dy !== 0) {
      movePlayer(state.player, dx, dy, dt, tiles);
      checkGates(state.player, GATES, state.unlockedRooms);
      footstepTimer += dt * 1000;
      if (footstepTimer >= FOOTSTEP_INTERVAL) { playFootstep(); footstepTimer = 0; }
    }

    // Room tracking — reset torch when entering a new room
    const room = getRoomAt(state.player.x, state.player.y);
    if (room) {
      if (room.id !== state.currentRoomId) {
        state.currentRoomId    = room.id;
        state.roomEnterTime    = ts;
        state.torchRadius      = 130;
        state.torchDecaying    = false;
        state.torchFlickerEnd  = 0;
        state.torchFlickerNext = 0;
      }
    }

    state.cameraX += ((state.player.x - W/2) - state.cameraX) * 0.1;
    state.cameraY += ((state.player.y - H/2) - state.cameraY) * 0.1;
    state.time += dt * 1000;

    // ── Hold-to-search ────────────────────────────────────────────────────
    if (holdE && holdEObjId) {
      const target = searchObjects.find(o => o.id === holdEObjId);
      if (target && !target.searched) {
        const cx = (target.tx + target.tw/2) * TILE_SIZE;
        const cy = (target.ty + target.th/2) * TILE_SIZE;
        const dist = Math.hypot(state.player.x - cx, state.player.y - cy);
        const held = ts - holdEStart;

        if (dist > SEARCH_RADIUS) {
          holdE = false; holdEObjId = null;
        } else if (held >= HOLD_DURATION) {
          holdE = false; holdEObjId = null;
          trySearch(target);
        }
      } else {
        holdE = false; holdEObjId = null;
      }
    }

    // ── Per-room torch decay (10s grace, then decay to 60px) ─────────────
    if (state.roomEnterTime > 0) {
      const timeInRoom = ts - state.roomEnterTime;
      if (!state.torchDecaying && timeInRoom > 10000) {
        state.torchDecaying = true;
        state.torchFlickerNext = ts + 800 + Math.random() * 1200;
      }
      if (state.torchDecaying && state.torchRadius > 60) {
        state.torchRadius = Math.max(60, state.torchRadius - 0.9 * dt);
      }
      if (state.torchDecaying && ts >= state.torchFlickerNext) {
        state.torchFlickerEnd  = ts + 80 + Math.random() * 100;
        state.torchFlickerNext = ts + 8000 + Math.random() * 10000; // flicker every 8–18s
      }
    }

    // ── Jump scare at 30s, watcher spawns immediately ────────────────────
    if (!state.jumpScarePlayed && state.time > 30000) {
      state.jumpScarePlayed = true;
      state.jumpScareTime   = ts;
      playScream();
      setTimeout(spawnWatcher, 800);
    }

    // ── Ambient heartbeat (builds dread even before watcher) ─────────────
    if (!state.watcherActive && ts > ambientHeartbeatNext && state.time > 8000) {
      ambientHeartbeatNext = ts + 18000 + Math.random() * 22000; // every 18–40s
      playHeartbeat(0.08);
    }

    // ── The Watcher ───────────────────────────────────────────────────────
    if (state.watcherActive) {
      const wdx   = state.player.x - state.watcherX;
      const wdy   = state.player.y - state.watcherY;
      const wdist = Math.hypot(wdx, wdy);
      const proximity = Math.max(0, 1 - wdist / 300);

      if (wdist > 1 && state.watcherPunishUntil <= ts) {
        state.watcherX += (wdx / wdist) * WATCHER_SPEED * dt;
        state.watcherY += (wdy / wdist) * WATCHER_SPEED * dt;
      }

      setWatcherAudio(proximity);

      if (ts > nextHeartbeat) {
        const interval = Math.max(280, 1100 - proximity * 820);
        nextHeartbeat = ts + interval;
        playHeartbeat(proximity);
      }

      if (wdist < WATCHER_TOUCH && state.watcherPunishUntil <= ts) {
        state.watcherPunishUntil = ts + 3000;
        playScream();
        // Send watcher to far corner of a room the player isn't in
        const spawnRoom = state.currentRoomId <= 2 ? ROOMS[3] : ROOMS[0];
        state.watcherX = (spawnRoom.x + spawnRoom.w * 0.2) * TILE_SIZE;
        state.watcherY = (spawnRoom.y + spawnRoom.h * 0.2) * TILE_SIZE;
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (state.screen === 'title') {
    renderTitleScreen(ctx, W, H, ts);
  } else if (state.screen === 'room-clear') {
    renderRoomClearScreen(ctx, W, H, state, ts);
  } else {
    render(canvas, ctx, state, searchObjects, ts);

    if (state.screen === 'card') {
      renderItemCard(ctx, W, H, state);
    } else if (state.screen === 'roast') {
      renderRoastCard(ctx, W, H, state);
    } else if (state.screen === 'inventory') {
      renderInventory(ctx, W, H, state, TOTAL_ITEMS);
    } else if (state.screen === 'win') {
      renderWinScreen(ctx, W, H, state, TOTAL_ITEMS, ts);
    } else {
      // Search hint
      const nearest = getNearestObject();
      if (nearest) {
        const objCx = (nearest.tx + nearest.tw/2) * TILE_SIZE;
        const objCy = (nearest.ty + nearest.th/2) * TILE_SIZE;
        const dist  = Math.hypot(state.player.x - objCx, state.player.y - objCy);
        if (dist < SEARCH_RADIUS) {
          const sx = objCx - state.cameraX;
          const sy = objCy - state.cameraY - nearest.th * TILE_SIZE * 0.5 - 22;
          ctx.fillStyle = 'rgba(240,235,248,0.6)';
          ctx.font = '9px Courier New';
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText('HOLD E', sx, sy);
        }
      }

      // Hold-to-search progress arc
      if (holdE && holdEObjId) {
        const target = searchObjects.find(o => o.id === holdEObjId);
        if (target) {
          const objCx = (target.tx + target.tw/2) * TILE_SIZE;
          const objCy = (target.ty + target.th/2) * TILE_SIZE;
          const sx = objCx - state.cameraX;
          const sy = objCy - state.cameraY - target.th * TILE_SIZE * 0.5 - 22;
          const progress = Math.min(1, (ts - holdEStart) / HOLD_DURATION);
          drawSearchProgress(ctx, sx, sy - 14, progress);
        }
      }
    }
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
