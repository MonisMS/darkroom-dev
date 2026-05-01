import type { Player, Facing } from './types';
import { isWall, TILE_SIZE } from './map';

const PLAYER_HALF = 9;
const SPEED = 150;

export function createPlayer(startX: number, startY: number): Player {
  return { x: startX, y: startY, speed: SPEED, facing: 'down' };
}

export function movePlayer(
  player: Player,
  dx: number,
  dy: number,
  dt: number,
  tiles: Uint8Array
): void {
  if (dx === 0 && dy === 0) return;

  // Update facing
  if      (dx >  0) player.facing = 'right';
  else if (dx <  0) player.facing = 'left';
  else if (dy < 0) player.facing = 'up';
  else if (dy > 0) player.facing = 'down';

  // Normalize diagonal
  if (dx !== 0 && dy !== 0) {
    const len = Math.SQRT2;
    dx /= len; dy /= len;
  }

  const vx = dx * player.speed * dt;
  const vy = dy * player.speed * dt;

  // X axis
  player.x += vx;
  const lx  = Math.floor((player.x - PLAYER_HALF) / TILE_SIZE);
  const rx  = Math.floor((player.x + PLAYER_HALF - 1) / TILE_SIZE);
  const ty0 = Math.floor((player.y - PLAYER_HALF) / TILE_SIZE);
  const by0 = Math.floor((player.y + PLAYER_HALF - 1) / TILE_SIZE);

  if (vx < 0 && (isWall(tiles, lx, ty0) || isWall(tiles, lx, by0))) {
    player.x = (lx + 1) * TILE_SIZE + PLAYER_HALF;
  } else if (vx > 0 && (isWall(tiles, rx, ty0) || isWall(tiles, rx, by0))) {
    player.x = rx * TILE_SIZE - PLAYER_HALF;
  }

  // Y axis
  player.y += vy;
  const lx2 = Math.floor((player.x - PLAYER_HALF) / TILE_SIZE);
  const rx2 = Math.floor((player.x + PLAYER_HALF - 1) / TILE_SIZE);
  const ty2 = Math.floor((player.y - PLAYER_HALF) / TILE_SIZE);
  const by2 = Math.floor((player.y + PLAYER_HALF - 1) / TILE_SIZE);

  if (vy < 0 && (isWall(tiles, lx2, ty2) || isWall(tiles, rx2, ty2))) {
    player.y = (ty2 + 1) * TILE_SIZE + PLAYER_HALF;
  } else if (vy > 0 && (isWall(tiles, lx2, by2) || isWall(tiles, rx2, by2))) {
    player.y = by2 * TILE_SIZE - PLAYER_HALF;
  }
}

export function checkGates(
  player: Player,
  gates: Array<{ toRoom: number; px: number; py: number; pw: number; ph: number }>,
  unlockedRooms: Set<number>
): void {
  const ph = PLAYER_HALF;
  for (const gate of gates) {
    if (unlockedRooms.has(gate.toRoom)) continue;

    const p1x = player.x - ph, p2x = player.x + ph;
    const p1y = player.y - ph, p2y = player.y + ph;

    if (p2x > gate.px && p1x < gate.px + gate.pw &&
        p2y > gate.py && p1y < gate.py + gate.ph) {
      // Push out: find minimum penetration axis
      const ovX = Math.min(p2x - gate.px, gate.px + gate.pw - p1x);
      const ovY = Math.min(p2y - gate.py, gate.py + gate.ph - p1y);

      if (ovX < ovY) {
        player.x += player.x < gate.px + gate.pw / 2 ? -ovX : ovX;
      } else {
        player.y += player.y < gate.py + gate.ph / 2 ? -ovY : ovY;
      }
    }
  }
}

export function getTorchOffset(facing: Facing): { ox: number; oy: number } {
  const D = 13;
  switch (facing) {
    case 'right': return { ox:  D, oy:  2 };
    case 'left':  return { ox: -D, oy:  2 };
    case 'up':    return { ox:  3, oy: -D };
    case 'down':  return { ox:  3, oy:  D };
  }
}

export { PLAYER_HALF };
