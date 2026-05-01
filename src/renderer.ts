import type { GameState, SearchableObject, Facing } from './types';
import { TILE_SIZE, MAP_W, MAP_H, ROOMS, GATES } from './map';
import { RARITY_COLORS, RARITY_LABELS } from './items';
import { getTorchOffset } from './player';

const VOID    = '#08060C';
const FLOOR_C = '#1A1525';
const WALL_C  = '#2D2438';

export const winButtonBounds = { x: 0, y: 0, w: 0, h: 0 };

let mapCache: HTMLCanvasElement | null = null;

export function rebuildMapCache() {
  mapCache = document.createElement('canvas');
  mapCache.width  = MAP_W * TILE_SIZE;
  mapCache.height = MAP_H * TILE_SIZE;
  const mc = mapCache.getContext('2d')!;

  mc.fillStyle = WALL_C;
  mc.fillRect(0, 0, mapCache.width, mapCache.height);

  ROOMS.forEach(r => {
    mc.fillStyle = FLOOR_C;
    mc.fillRect(r.x * TILE_SIZE, r.y * TILE_SIZE, r.w * TILE_SIZE, r.h * TILE_SIZE);

    mc.strokeStyle = 'rgba(255,255,255,0.018)';
    mc.lineWidth = 0.5;
    for (let ty = r.y; ty < r.y + r.h; ty++) {
      for (let tx = r.x; tx < r.x + r.w; tx++) {
        mc.strokeRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    if (r.stickyNote) {
      const nx = (r.x + 1) * TILE_SIZE + 6;
      const ny = (r.y + 1) * TILE_SIZE + 6;
      mc.fillStyle = 'rgba(255,220,80,0.11)';
      mc.fillRect(nx, ny, 68, 34);
      mc.fillStyle = 'rgba(255,220,80,0.45)';
      mc.font = '5.5px Courier New';
      mc.textAlign = 'left';
      r.stickyNote.split('\n').forEach((line, i) => mc.fillText(line, nx + 4, ny + 9 + i * 9));
    }
  });

  [{ x:12,y:14,w:4,h:6 },{ x:12,y:32,w:4,h:6 },
   { x:12,y:50,w:4,h:6 },{ x:14,y:70,w:4,h:6 }].forEach(c => {
    mc.fillStyle = FLOOR_C;
    mc.fillRect(c.x * TILE_SIZE, c.y * TILE_SIZE, c.w * TILE_SIZE, c.h * TILE_SIZE);
  });
}

// ── Main render ──────────────────────────────────────────────────────────────
export function render(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  state: GameState,
  objects: SearchableObject[],
  t: number
) {
  const W = canvas.width, H = canvas.height;

  // Jump scare — total takeover for 500ms
  if (state.jumpScareTime > 0 && (t - state.jumpScareTime) < 500) {
    renderJumpScare(ctx, W, H);
    return;
  }

  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, W, H);
  if (!mapCache) return;

  const cx = Math.round(state.cameraX);
  const cy = Math.round(state.cameraY);

  ctx.drawImage(mapCache, -cx, -cy);
  drawObjects(ctx, objects, cx, cy, t);
  drawGates(ctx, state, cx, cy, t, objects);
  drawCharacter(ctx, state.player, cx, cy, t);

  // Compute effective radius
  let radius = state.torchRadius;
  if (state.torchFlickerEnd > 0 && t < state.torchFlickerEnd) {
    radius = 12; // momentary blackout on creak
  }
  if (state.watcherPunishUntil > 0 && t < state.watcherPunishUntil) {
    radius = Math.min(radius, 16);
  }

  const { ox, oy } = getTorchOffset(state.player.facing);
  drawTorch(ctx, state.player.x + ox - cx, state.player.y + oy - cy, radius, W, H, t);

  // Next-room arrow — drawn after torch so it always shows through darkness
  drawNextRoomArrow(ctx, state, cx, cy, W, H, t);

  // Watcher eyes pierce the dark
  if (state.watcherActive) {
    drawWatcher(ctx, state.watcherX - cx, state.watcherY - cy, t);
  }

  drawHUD(ctx, state, W, H, t);
}

// ── Objects ──────────────────────────────────────────────────────────────────
function drawObjects(
  ctx: CanvasRenderingContext2D,
  objects: SearchableObject[],
  cx: number, cy: number, _t: number
) {
  objects.forEach(obj => {
    const sx = obj.tx * TILE_SIZE - cx;
    const sy = obj.ty * TILE_SIZE - cy;
    const sw = obj.tw * TILE_SIZE;
    const sh = obj.th * TILE_SIZE;
    const done = obj.searched;

    switch (obj.type) {
      case 'desk':
        ctx.fillStyle = done ? '#1C1528' : '#251A36';
        ctx.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);
        ctx.strokeStyle = done ? '#312540' : '#42305A';
        ctx.lineWidth = 1.5; ctx.strokeRect(sx + 2, sy + 2, sw - 4, sh - 4);
        if (!done) { ctx.fillStyle = '#31204A'; ctx.fillRect(sx + 4, sy + 4, sw - 8, 4); }
        break;

      case 'cabinet':
        ctx.fillStyle = done ? '#181628' : '#221E36';
        ctx.fillRect(sx + 3, sy + 2, sw - 6, sh - 4);
        ctx.strokeStyle = done ? '#2E2840' : '#3E3460';
        ctx.lineWidth = 1.5; ctx.strokeRect(sx + 3, sy + 2, sw - 6, sh - 4);
        if (!done) {
          [0, 1].forEach(d => {
            ctx.fillStyle = '#4A3A68';
            ctx.fillRect(sx + sw / 2 - 7, sy + 9 + d * (sh / 2 - 5), 14, 3);
          });
        }
        break;

      case 'box':
        ctx.fillStyle = done ? '#18181E' : '#221E2C';
        ctx.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);
        ctx.strokeStyle = done ? '#28243A' : '#382E50';
        ctx.lineWidth = 1.5; ctx.strokeRect(sx + 2, sy + 2, sw - 4, sh - 4);
        if (!done) {
          ctx.strokeStyle = '#40365A'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx + 5, sy + 5); ctx.lineTo(sx + sw - 5, sy + sh - 5);
          ctx.moveTo(sx + sw - 5, sy + 5); ctx.lineTo(sx + 5, sy + sh - 5);
          ctx.stroke();
        }
        break;

      case 'rack':
        ctx.fillStyle = done ? '#0E0E14' : '#131018';
        ctx.fillRect(sx + 1, sy + 1, sw - 2, sh - 2);
        ctx.strokeStyle = done ? '#1E1C28' : '#282440';
        ctx.lineWidth = 1.5; ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);
        if (!done) {
          const n = Math.floor(sh / 10);
          for (let i = 0; i < n; i++) {
            const on = Math.sin(Date.now() * 0.003 + i * 1.3) > 0.5;
            ctx.fillStyle = on ? '#FF3030' : '#200000';
            ctx.fillRect(sx + sw - 7, sy + 5 + i * 10, 4, 3);
          }
        }
        break;

      case 'pedestal':
        ctx.fillStyle = '#160C28';
        ctx.beginPath();
        ctx.arc(sx + sw / 2, sy + sh / 2, Math.min(sw, sh) / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2; ctx.stroke();
        if (!done) {
          const pg = ctx.createRadialGradient(sx+sw/2, sy+sh/2, 0, sx+sw/2, sy+sh/2, 42);
          pg.addColorStop(0, 'rgba(245,158,11,0.3)');
          pg.addColorStop(1, 'rgba(245,158,11,0)');
          ctx.fillStyle = pg;
          ctx.beginPath(); ctx.arc(sx + sw / 2, sy + sh / 2, 42, 0, Math.PI * 2); ctx.fill();
        }
        break;

      case 'monitor-stack': {
        ctx.fillStyle = done ? '#151220' : '#1C1630';
        ctx.fillRect(sx + 2, sy + sh / 2, sw - 4, sh / 2 - 2);
        ctx.strokeStyle = done ? '#281E3A' : '#342850'; ctx.lineWidth = 1;
        ctx.strokeRect(sx + 2, sy + sh / 2, sw - 4, sh / 2 - 2);
        if (!done) {
          const mw = (sw - 12) / 2;
          [sx + 3, sx + 5 + mw].forEach(mx => {
            ctx.fillStyle = '#080610';
            ctx.fillRect(mx, sy + 2, mw, sh / 2 - 5);
            ctx.strokeStyle = '#1E1830'; ctx.lineWidth = 1;
            ctx.strokeRect(mx, sy + 2, mw, sh / 2 - 5);
            ctx.fillStyle = 'rgba(0,210,190,0.06)';
            ctx.fillRect(mx + 2, sy + 4, mw - 4, sh / 2 - 9);
          });
        }
        break;
      }

      case 'almirah': {
        ctx.fillStyle = done ? '#14121A' : '#1E1C28';
        ctx.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);
        ctx.strokeStyle = done ? '#28233A' : '#3C3452'; ctx.lineWidth = 1.5;
        ctx.strokeRect(sx + 2, sy + 2, sw - 4, sh - 4);
        if (!done) {
          ctx.strokeStyle = '#2E2840'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx + sw/2, sy + 2); ctx.lineTo(sx + sw/2, sy + sh - 4); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(sx + 2, sy + sh * 0.26); ctx.lineTo(sx + sw - 4, sy + sh * 0.26); ctx.stroke();
          [-1, 1].forEach(s => {
            ctx.fillStyle = '#4A3E62';
            ctx.fillRect(sx + sw/2 + s*(sw/4) - 4, sy + sh * 0.6, 8, 3);
          });
        }
        break;
      }

      case 'safe': {
        ctx.fillStyle = done ? '#0E1210' : '#141C14';
        ctx.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);
        ctx.strokeStyle = done ? '#1E2A1E' : '#2A3C2A'; ctx.lineWidth = 2;
        ctx.strokeRect(sx + 2, sy + 2, sw - 4, sh - 4);
        if (!done) {
          const dcx = sx + sw * 0.62, dcy = sy + sh * 0.5;
          const dr  = Math.min(sw, sh) * 0.34;
          ctx.strokeStyle = '#4A6040'; ctx.lineWidth = 1;
          [dr, dr * 0.55].forEach(r => {
            ctx.beginPath(); ctx.arc(dcx, dcy, r, 0, Math.PI*2); ctx.stroke();
          });
          ctx.strokeStyle = '#2A3C2A'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx + sw*0.26, sy + 4); ctx.lineTo(sx + sw*0.26, sy + sh - 4); ctx.stroke();
          ctx.fillStyle = '#AA1818';
          ctx.beginPath(); ctx.arc(sx + 7, sy + 7, 3, 0, Math.PI*2); ctx.fill();
        }
        break;
      }
    }

    if (done) {
      ctx.fillStyle = obj.item ? 'rgba(100,80,140,0.4)' : 'rgba(160,30,30,0.35)';
      ctx.font = '9px Courier New';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(obj.item ? '✓' : '✗', sx + sw/2, sy + sh/2);
    }
  });
}

// ── Gates ────────────────────────────────────────────────────────────────────
function drawGates(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cx: number, cy: number,
  t: number,
  objects: SearchableObject[]
) {
  GATES.forEach(gate => {
    const unlocked = state.unlockedRooms.has(gate.toRoom);
    const sx = gate.tx * TILE_SIZE - cx;
    const sy = gate.ty * TILE_SIZE - cy;
    const sw = gate.tw * TILE_SIZE;
    const sh = gate.th * TILE_SIZE;

    if (unlocked) {
      ctx.fillStyle = `rgba(255,155,50,${0.12 + Math.sin(t * 0.003) * 0.07})`;
      ctx.fillRect(sx, sy, sw, sh);
      return;
    }

    ctx.fillStyle = '#080610';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = 'rgba(180,30,30,0.65)';
    ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.strokeRect(sx + 2, sy + 2, sw - 4, sh - 4);
    ctx.setLineDash([]);

    const fromRoom = gate.toRoom - 1;
    const remaining = objects.filter(o => o.roomId === fromRoom && !o.searched && o.item !== null).length;
    if (remaining > 0) {
      ctx.fillStyle = 'rgba(180,30,30,0.8)';
      ctx.font = 'bold 9px Courier New';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${remaining} sealed`, sx + sw/2, sy + sh/2);
    }
  });
}

// ── Character ────────────────────────────────────────────────────────────────
function drawCharacter(
  ctx: CanvasRenderingContext2D,
  player: { x: number; y: number; facing: Facing },
  cx: number, cy: number, t: number
) {
  const sx = player.x - cx, sy = player.y - cy;
  const { ox, oy } = getTorchOffset(player.facing);
  const tx = sx + ox, ty = sy + oy;

  ctx.strokeStyle = '#B89060'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();

  const angle = Math.atan2(oy, ox);
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = '#4A2E14'; ctx.fillRect(-2, -6, 4, 10);
  ctx.restore();

  const flicker = Math.sin(t * 0.013) * 1.8;
  const flameG  = ctx.createRadialGradient(tx, ty - 4 + flicker, 0, tx, ty - 4 + flicker, 7);
  flameG.addColorStop(0, 'rgba(255,225,90,0.95)');
  flameG.addColorStop(0.4, 'rgba(255,135,25,0.7)');
  flameG.addColorStop(1, 'rgba(255,70,0,0)');
  ctx.fillStyle = flameG;
  ctx.beginPath(); ctx.arc(tx, ty - 4 + flicker, 7, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(sx + 1, sy + 2, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3E3460';
  ctx.beginPath(); ctx.ellipse(sx, sy, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#CC9A72';
  ctx.beginPath(); ctx.arc(sx, sy - 6, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#AA7A50';
  ctx.beginPath(); ctx.arc(sx, sy - 6, 3, 0, Math.PI * 2); ctx.fill();
}

// ── Torch ────────────────────────────────────────────────────────────────────
function smoothFlicker(t: number) {
  return Math.sin(t*0.0009)*10 + Math.sin(t*0.0022)*7 + Math.sin(t*0.007)*4;
}

export function drawTorch(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  baseRadius: number, W: number, H: number, t: number
) {
  const r = Math.max(8, baseRadius + smoothFlicker(t));
  const g = ctx.createRadialGradient(px, py, 0, px, py, r);
  g.addColorStop(0,    'rgba(8,6,12,0)');
  g.addColorStop(0.4,  'rgba(8,6,12,0)');
  g.addColorStop(0.66, 'rgba(8,6,12,0.48)');
  g.addColorStop(0.85, 'rgba(8,6,12,0.92)');
  g.addColorStop(1,    'rgba(8,6,12,1)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const bloom = ctx.createRadialGradient(px, py, 0, px, py, r * 0.38);
  bloom.addColorStop(0, 'rgba(255,140,35,0.07)');
  bloom.addColorStop(1, 'rgba(255,140,35,0)');
  ctx.fillStyle = bloom; ctx.fillRect(0, 0, W, H);
}

// ── The Watcher eyes ─────────────────────────────────────────────────────────
function drawWatcher(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, t: number
) {
  if (Math.sin(t * 0.0015) > 0.93) return; // rare slow blink
  const pulse = 0.55 + Math.sin(t * 0.005) * 0.45;
  [-9, 9].forEach(ex => {
    const ex2 = sx + ex;
    const glow = ctx.createRadialGradient(ex2, sy, 0, ex2, sy, 24);
    glow.addColorStop(0, `rgba(230,0,0,${0.6 * pulse})`);
    glow.addColorStop(0.5, `rgba(150,0,0,${0.2 * pulse})`);
    glow.addColorStop(1, 'rgba(200,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(ex2, sy, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,20,20,${pulse})`;
    ctx.beginPath(); ctx.arc(ex2, sy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(ex2, sy, 2, 0, Math.PI * 2); ctx.fill();
  });
}

// ── Jump scare face ──────────────────────────────────────────────────────────
function renderJumpScare(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

  // VHS static
  for (let i = 0; i < 3200; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.26})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, Math.random() * 3 + 1, 1);
  }

  const fx = W / 2, fy = H / 2;

  // Face
  ctx.fillStyle = '#B0AAA0';
  ctx.beginPath(); ctx.ellipse(fx, fy, 118, 155, 0, 0, Math.PI * 2); ctx.fill();

  // Dark veins on face
  ctx.strokeStyle = 'rgba(50,0,0,0.4)'; ctx.lineWidth = 1.5;
  [[fx-30,fy-80,fx-60,fy+40],[fx+40,fy-70,fx+55,fy+60],[fx-10,fy-100,fx-5,fy-30]].forEach(pts => {
    ctx.beginPath(); ctx.moveTo(pts[0],pts[1]); ctx.quadraticCurveTo(pts[0]+20,pts[1]+60,pts[2],pts[3]); ctx.stroke();
  });

  // Eye sockets — deep black with red glow
  [-68, 68].forEach(ex => {
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(fx+ex, fy-40, 34, 44, 0, 0, Math.PI*2); ctx.fill();
    const rg = ctx.createRadialGradient(fx+ex, fy-40, 0, fx+ex, fy-40, 18);
    rg.addColorStop(0, 'rgba(255,0,0,1)');
    rg.addColorStop(0.5, 'rgba(180,0,0,0.5)');
    rg.addColorStop(1, 'rgba(150,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(fx+ex, fy-40, 18, 0, Math.PI*2); ctx.fill();
  });

  // Nose cavity
  ctx.strokeStyle = '#70685E'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fx, fy-12); ctx.lineTo(fx-16, fy+22); ctx.lineTo(fx+16, fy+22); ctx.stroke();

  // Mouth — wide jagged maw
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(fx-88, fy+52);
  const pts = 12;
  for (let i = 0; i <= pts; i++) {
    ctx.lineTo(fx - 88 + (i/pts)*176, fy + 52 + (i%2 === 0 ? 0 : 68));
  }
  ctx.lineTo(fx+88, fy+52); ctx.closePath(); ctx.fill();

  // Teeth
  ctx.fillStyle = '#D0C8BC';
  for (let i = 0; i < 6; i++) {
    const tx = fx - 70 + i * 26;
    ctx.beginPath();
    ctx.moveTo(tx, fy+52); ctx.lineTo(tx+10, fy+52); ctx.lineTo(tx+5, fy+72); ctx.closePath(); ctx.fill();
  }

  // Blood drip from mouth corners
  ctx.fillStyle = 'rgba(160,0,0,0.7)';
  [fx-85, fx+85].forEach(bx => {
    ctx.fillRect(bx - 2, fy+52, 4, 18 + Math.random() * 12);
  });

  // Red vignette
  const vign = ctx.createRadialGradient(fx, fy, 90, fx, fy, Math.max(W,H)*0.75);
  vign.addColorStop(0, 'rgba(160,0,0,0)');
  vign.addColorStop(1, 'rgba(160,0,0,0.7)');
  ctx.fillStyle = vign; ctx.fillRect(0, 0, W, H);
}

// ── Search hold progress arc (exported for main.ts to call) ─────────────────
export function drawSearchProgress(
  ctx: CanvasRenderingContext2D,
  screenX: number, screenY: number,
  progress: number
) {
  const r = 16;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(screenX, screenY, r, 0, Math.PI*2); ctx.stroke();

  if (progress > 0) {
    ctx.strokeStyle = progress > 0.8 ? '#FFE050' : 'rgba(255,200,80,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(screenX, screenY, r, -Math.PI/2, -Math.PI/2 + progress * Math.PI*2);
    ctx.stroke();
  }
}

// ── Next-room direction arrow ─────────────────────────────────────────────────
function drawNextRoomArrow(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cx: number, cy: number,
  W: number, H: number,
  t: number
) {
  const nextRoom = state.currentRoomId + 1;
  if (!state.unlockedRooms.has(nextRoom)) return;

  const gate = GATES.find(g => g.toRoom === nextRoom);
  if (!gate) return;

  // Gate centre in screen space
  const gsx = (gate.tx + gate.tw / 2) * TILE_SIZE - cx;
  const gsy = (gate.ty + gate.th / 2) * TILE_SIZE - cy;

  const pulse  = 0.5 + Math.sin(t * 0.004) * 0.35;
  const bounce = Math.sin(t * 0.005) * 5;
  const pad    = 30;
  const onScreen = gsx > -pad && gsx < W + pad && gsy > -pad && gsy < H + pad;

  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  if (onScreen) {
    // Float above the gate entrance
    ctx.fillStyle = `rgba(245,158,11,${pulse * 0.55})`;
    ctx.font = '7px Courier New';
    ctx.fillText('NEXT ROOM', gsx, gsy - 30 + bounce);
    ctx.fillStyle = `rgba(245,158,11,${pulse})`;
    ctx.font = 'bold 15px Courier New';
    ctx.fillText('▼', gsx, gsy - 16 + bounce);
  } else {
    // Edge indicator — point toward the gate from screen edge
    const dx  = gsx - W / 2;
    const dy  = gsy - H / 2;
    const margin = 52;
    let ex: number, ey: number, arrow: string;

    if (Math.abs(dx) * H > Math.abs(dy) * W) {
      // gate left/right
      arrow = dx > 0 ? '▶' : '◀';
      ex = dx > 0 ? W - margin : margin;
      ey = Math.max(margin, Math.min(H - margin, H / 2 + (dy / Math.abs(dx)) * (W / 2)));
    } else {
      // gate above/below (usual for this vertical map)
      arrow = dy > 0 ? '▼' : '▲';
      ey = dy > 0 ? H - margin : margin;
      ex = Math.max(margin, Math.min(W - margin, W / 2 + (dx / Math.abs(dy)) * (H / 2)));
    }

    ctx.fillStyle = `rgba(245,158,11,${pulse})`;
    ctx.font = 'bold 16px Courier New';
    ctx.fillText(arrow, ex, ey);

    ctx.fillStyle = `rgba(245,158,11,${pulse * 0.65})`;
    ctx.font = '7px Courier New';
    ctx.fillText('NEXT', ex, ey + (dy > 0 ? 15 : -15));
  }

  ctx.restore();
}

// ── HUD ──────────────────────────────────────────────────────────────────────
function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number, H: number,
  t: number
) {
  // Room name only — no item count spoiler
  const room = ROOMS[state.currentRoomId];
  if (room) {
    ctx.fillStyle = 'rgba(240,235,248,0.28)';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(room.label.toUpperCase(), W/2, 14);
  }

  // Collected count
  ctx.fillStyle = 'rgba(240,235,248,0.35)';
  ctx.font = '10px Courier New';
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText(`▣ ${state.collected.length}`, 14, H - 14);

  // Watcher warning
  if (state.watcherActive) {
    const wp = 0.35 + Math.abs(Math.sin(t * 0.007)) * 0.65;
    ctx.fillStyle = `rgba(210,20,20,${wp})`;
    ctx.font = '8px Courier New';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('ENTITY DETECTED', W - 14, H - 14);
  }

  // Controls fade
  if (state.time < 10000) {
    const a = Math.min(1, Math.max(0, (10000 - state.time) / 2000)) * 0.22;
    ctx.fillStyle = `rgba(240,235,248,${a})`;
    ctx.font = '9px Courier New';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('WASD · move   HOLD E · search   TAB · inventory', W - 14, H - 28);
  }
}

// ── Title screen ─────────────────────────────────────────────────────────────
export function renderTitleScreen(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, t: number
) {
  ctx.fillStyle = VOID; ctx.fillRect(0, 0, W, H);

  const pulse = 0.72 + Math.sin(t * 0.0018) * 0.28;

  ctx.save();
  ctx.shadowColor = '#FF9040'; ctx.shadowBlur = 40 * pulse;
  ctx.fillStyle = `rgba(255,148,64,${pulse})`;
  ctx.font = 'bold 48px Courier New';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('DARKROOM.DEV', W/2, H/2 - 76);
  ctx.restore();

  ctx.fillStyle = 'rgba(240,235,248,0.32)';
  ctx.font = '12px Courier New';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('You are not supposed to be here.', W/2, H/2 - 28);

  const blink = 0.42 + Math.sin(t * 0.004) * 0.38;
  ctx.fillStyle = `rgba(240,235,248,${blink})`;
  ctx.font = '12px Courier New';
  ctx.fillText('[ PRESS ANY KEY ]', W/2, H/2 + 24);

  ctx.fillStyle = 'rgba(240,235,248,0.15)';
  ctx.font = '9px Courier New';
  ctx.fillText('5 rooms.  Half the objects are lies.  One legendary.', W/2, H/2 + 62);
  ctx.fillText('WASD — move   HOLD E — search   TAB — inventory', W/2, H/2 + 80);
}

// ── Item card (cinematic reveal) ─────────────────────────────────────────────
export function renderItemCard(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  state: GameState
) {
  if (!state.activeCard) return;
  const item  = state.activeCard;
  const color = RARITY_COLORS[item.rarity];
  const label = RARITY_LABELS[item.rarity];

  const elapsed  = performance.now() - state.cardRevealTime;
  const progress = Math.min(1, elapsed / 380);
  const eased    = 1 - Math.pow(1 - progress, 3);

  // Dim
  ctx.fillStyle = `rgba(5,3,10,${0.88 * eased})`;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = eased;

  const cy = H / 2;

  // Top rarity bar
  ctx.fillStyle = color;
  ctx.fillRect(W/2 - 40, cy - 118, 80, 2);
  ctx.fillStyle = color;
  ctx.font = 'bold 9px Courier New';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`◆  ${label}  ◆`, W/2, cy - 104);

  // Big emoji with rarity glow behind it
  const eg = ctx.createRadialGradient(W/2, cy - 48, 0, W/2, cy - 48, 68);
  eg.addColorStop(0, color.replace(')', ',0.22)').replace('rgb(', 'rgba('));
  eg.addColorStop(1, 'rgba(0,0,0,0)');

  // Parse hex color to rgba
  const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
  const ega = ctx.createRadialGradient(W/2, cy - 48, 0, W/2, cy - 48, 68);
  ega.addColorStop(0, `rgba(${r},${g},${b},0.24)`);
  ega.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = ega;
  ctx.beginPath(); ctx.arc(W/2, cy - 48, 68, 0, Math.PI*2); ctx.fill();

  ctx.font = '68px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(item.emoji, W/2, cy - 48);

  // Item name
  ctx.fillStyle = '#F0EBF8';
  ctx.font = 'bold 17px Courier New';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.name, W/2, cy + 28);

  // Divider
  ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W/2 - 100, cy + 52); ctx.lineTo(W/2 + 100, cy + 52); ctx.stroke();

  // Description
  ctx.fillStyle = 'rgba(240,235,248,0.5)';
  ctx.font = '11px Courier New';
  wrapText(ctx, item.description, W/2, cy + 74, 320, 16);

  // Continue
  const blink = 0.35 + Math.sin(performance.now() * 0.005) * 0.3;
  ctx.fillStyle = `rgba(240,235,248,${blink})`;
  ctx.font = '9px Courier New';
  ctx.fillText('[ E  —  continue ]', W/2, cy + 130);

  ctx.restore();
}

// ── Roast card (full-screen brutal) ─────────────────────────────────────────
export function renderRoastCard(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  state: GameState
) {
  if (!state.roastMessage) return;

  const elapsed  = performance.now() - state.cardRevealTime;
  const progress = Math.min(1, elapsed / 220);
  const eased    = 1 - Math.pow(1 - progress, 2.2);

  // Red background dim
  ctx.fillStyle = `rgba(28,2,2,${0.92 * eased})`;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = eased;

  // Red scan line texture
  for (let y = 0; y < H; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, y, W, 2);
  }

  const cy = H / 2;

  // Main GOTCHA text — massive
  ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 30;
  ctx.fillStyle   = '#FF1818';
  ctx.font        = 'bold 58px Courier New';
  ctx.textAlign   = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(state.roastMessage.gotcha, W/2, cy - 52);
  ctx.shadowBlur  = 0;

  // Divider
  ctx.strokeStyle = 'rgba(200,30,30,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W/2 - 130, cy - 2); ctx.lineTo(W/2 + 130, cy - 2); ctx.stroke();

  // Roast text
  ctx.fillStyle = 'rgba(255,190,190,0.88)';
  ctx.font = '13px Courier New';
  ctx.textBaseline = 'top';
  wrapText(ctx, state.roastMessage.roast, W/2, cy + 16, 400, 20);

  // Dismiss
  const blink = 0.3 + Math.sin(performance.now() * 0.006) * 0.25;
  ctx.fillStyle = `rgba(200,80,80,${blink})`;
  ctx.font = '9px Courier New';
  ctx.textBaseline = 'bottom';
  ctx.fillText('[ E — stop crying ]', W/2, cy + 120);

  ctx.restore();
}

// ── Inventory ────────────────────────────────────────────────────────────────
export function renderInventory(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  state: GameState,
  totalItems: number
) {
  ctx.fillStyle = 'rgba(8,6,12,0.94)'; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(240,235,248,0.8)';
  ctx.font = 'bold 15px Courier New';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('COLLECTED', W/2, 24);

  ctx.fillStyle = 'rgba(240,235,248,0.22)';
  ctx.font = '9px Courier New';
  ctx.fillText(`${state.collected.length} of ${totalItems} items found`, W/2, 46);

  const cols = 4, cellSize = 76;
  const startX = W/2 - (cols * cellSize)/2, startY = 68;

  state.collected.forEach((item, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * cellSize, y = startY + row * cellSize;
    const color = RARITY_COLORS[item.rarity];

    ctx.fillStyle = '#09070F';
    roundRect(ctx, x+4, y+4, cellSize-8, cellSize-8, 8); ctx.fill();
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    roundRect(ctx, x+4, y+4, cellSize-8, cellSize-8, 8); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, x + cellSize/2, y + cellSize/2 - 8);
    ctx.fillStyle = color; ctx.font = '7px Courier New';
    ctx.fillText(RARITY_LABELS[item.rarity], x + cellSize/2, y + cellSize - 10);
  });

  ctx.fillStyle = 'rgba(240,235,248,0.2)';
  ctx.font = '9px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('[ TAB — close ]', W/2, H - 18);
}

// ── Win screen ───────────────────────────────────────────────────────────────
export function renderWinScreen(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  state: GameState,
  _totalItems: number,
  t: number
) {
  ctx.fillStyle = 'rgba(8,6,12,0.97)'; ctx.fillRect(0, 0, W, H);
  const pulse = 0.65 + Math.sin(t * 0.003) * 0.35;

  ctx.save();
  ctx.shadowColor = '#F59E0B'; ctx.shadowBlur = 50 * pulse;
  ctx.font = '56px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🤖', W/2, H/2 - 148);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = '#F59E0B'; ctx.shadowBlur = 22 * pulse;
  ctx.fillStyle = `rgba(245,158,11,${pulse})`;
  ctx.font = 'bold 26px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('YOU DISCOVERED AGI.', W/2, H/2 - 88);
  ctx.restore();

  ctx.fillStyle = 'rgba(240,235,248,0.38)';
  ctx.font = '11px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('It asked you to keep this between us.', W/2, H/2 - 60);

  const elapsed = Math.floor(state.time / 1000);
  const mins = Math.floor(elapsed/60).toString().padStart(2,'0');
  const secs  = (elapsed % 60).toString().padStart(2,'0');

  ctx.fillStyle = 'rgba(240,235,248,0.55)';
  ctx.font = '11px Courier New';
  [
    `${state.collected.length} items  ·  ${mins}:${secs}  ·  Explorer #${state.explorerNumber}`,
    ``,
    `"You searched in the dark.`,
    ` You got played. You got back up.`,
    ` You found what was hidden."`,
  ].forEach((line, i) => ctx.fillText(line, W/2, H/2 - 18 + i * 20));

  // Claim button
  const bw = 280, bh = 46;
  const bx = W/2 - bw/2, by = H/2 + 76;
  winButtonBounds.x = bx; winButtonBounds.y = by;
  winButtonBounds.w = bw; winButtonBounds.h = bh;

  const btnPulse = 0.7 + Math.sin(t * 0.006) * 0.3;
  ctx.save();
  ctx.shadowColor = '#F59E0B'; ctx.shadowBlur = 18 * btnPulse;
  ctx.strokeStyle = `rgba(245,158,11,${btnPulse})`;
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, by, bw, bh, 6); ctx.stroke();
  ctx.restore();

  ctx.fillStyle = `rgba(245,158,11,${0.55 + btnPulse * 0.35})`;
  ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('[ CLAIM YOUR AGI CREDITS ]', W/2, by + bh/2);

  const blink = 0.3 + Math.sin(t * 0.004) * 0.22;
  ctx.fillStyle = `rgba(240,235,248,${blink})`;
  ctx.font = '9px Courier New';
  ctx.fillText('[ R — play again ]    [ S — share on X ]', W/2, H - 24);
}

// ── Room-clear interstitial ──────────────────────────────────────────────────
const ROOM_CLEARED_LABELS = ['THE LOBBY', 'THE OFFICE WING', 'THE SERVER ROOM'];
const ROOM_NEXT_LABELS    = ['The Office Wing', 'The Server Room', 'The Data Center'];
const ROOM_CLEAR_MESSAGES = [
  ["Got scared?", "I promise I won't.", "No jump scare in this game."],
  ["Gotcha.", "You felt something coming, didn't you.", "There's nothing here."],
  ["You felt it again.", "I told you. I promise.", "No jump scares.", "Ever."],
];

export function renderRoomClearScreen(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  state: GameState,
  t: number
) {
  ctx.fillStyle = VOID; ctx.fillRect(0, 0, W, H);

  // Subtle scan lines
  for (let y = 0; y < H; y += 5) {
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(0, y, W, 2);
  }

  const idx     = Math.min(state.roomClearIndex, 2);
  const elapsed = t - state.roomClearStart;
  const hdrA    = Math.min(1, elapsed / 700);

  ctx.save();
  ctx.globalAlpha = hdrA;

  // Room cleared badge
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 13px Courier New';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`✓  ${ROOM_CLEARED_LABELS[idx]} — CLEARED`, W/2, H/2 - 88);

  ctx.fillStyle = 'rgba(240,235,248,0.28)';
  ctx.font = '10px Courier New';
  ctx.fillText(`ENTERING: ${ROOM_NEXT_LABELS[idx].toUpperCase()}`, W/2, H/2 - 62);

  ctx.strokeStyle = 'rgba(245,158,11,0.18)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W/2 - 130, H/2 - 40); ctx.lineTo(W/2 + 130, H/2 - 40); ctx.stroke();

  ctx.restore();

  // Gotcha message — fades in after music ends
  if (state.roomClearTextVisible) {
    const msgElapsed = t - state.roomClearTextTime;
    const msgA = Math.min(1, msgElapsed / 900);
    const lines = ROOM_CLEAR_MESSAGES[idx] ?? ROOM_CLEAR_MESSAGES[0];

    ctx.save();
    ctx.globalAlpha = msgA;
    ctx.fillStyle = 'rgba(240,235,248,0.82)';
    ctx.font = 'bold 15px Courier New';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((line, i) => ctx.fillText(line, W/2, H/2 + i * 26));

    const blink = 0.3 + Math.sin(t * 0.005) * 0.25;
    ctx.fillStyle = `rgba(240,235,248,${blink})`;
    ctx.font = '9px Courier New';
    ctx.fillText('[ press any key to continue ]', W/2, H/2 + lines.length * 26 + 28);
    ctx.restore();
  } else {
    // Waiting indicator while music plays
    const dots = '.'.repeat(1 + Math.floor((t / 400) % 3));
    ctx.fillStyle = 'rgba(240,235,248,0.18)';
    ctx.font = '9px Courier New';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(dots, W/2, H/2 + 20);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y); ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '', ly = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), cx, ly);
      line = word + ' '; ly += lh;
    } else line = test;
  }
  ctx.fillText(line.trim(), cx, ly);
}

export { RARITY_COLORS, RARITY_LABELS };
