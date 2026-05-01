import type { Room, Gate, SearchableObject } from './types';

export const TILE_SIZE = 32;
export const MAP_W = 34;
export const MAP_H = 90;

export const TILE = { WALL: 1, FLOOR: 0 } as const;

// ── Rooms ────────────────────────────────────────────────────────────────────
export const ROOMS: Room[] = [
  { id: 0, x: 4,  y: 2,  w: 20, h: 12, label: 'The Lobby',       itemCount: 2, stickyNote: 'WELCOME.\nEverything is fine.' },
  { id: 1, x: 3,  y: 20, w: 22, h: 12, label: 'The Office Wing',  itemCount: 2, stickyNote: "Password: password1\n(changed to Password2)" },
  { id: 2, x: 4,  y: 38, w: 18, h: 12, label: 'The Server Room',  itemCount: 2, stickyNote: 'Still faster than\nyour CI/CD' },
  { id: 3, x: 2,  y: 56, w: 26, h: 14, label: 'The Data Center',  itemCount: 2, stickyNote: 'HERE BE DRAGONS' },
  { id: 4, x: 10, y: 76, w: 12, h: 10, label: 'The Vault',        itemCount: 1 },
];

// ── Corridors ────────────────────────────────────────────────────────────────
const CORRIDORS = [
  { x: 12, y: 14, w: 4, h: 6 },
  { x: 12, y: 32, w: 4, h: 6 },
  { x: 12, y: 50, w: 4, h: 6 },
  { x: 14, y: 70, w: 4, h: 6 },
];

// ── Gates ────────────────────────────────────────────────────────────────────
export const GATES: Gate[] = [
  { toRoom: 1, tx: 12, ty: 16, tw: 4, th: 2, px: 12*TILE_SIZE, py: 16*TILE_SIZE, pw: 4*TILE_SIZE, ph: 2*TILE_SIZE },
  { toRoom: 2, tx: 12, ty: 34, tw: 4, th: 2, px: 12*TILE_SIZE, py: 34*TILE_SIZE, pw: 4*TILE_SIZE, ph: 2*TILE_SIZE },
  { toRoom: 3, tx: 12, ty: 52, tw: 4, th: 2, px: 12*TILE_SIZE, py: 52*TILE_SIZE, pw: 4*TILE_SIZE, ph: 2*TILE_SIZE },
  { toRoom: 4, tx: 14, ty: 72, tw: 4, th: 2, px: 14*TILE_SIZE, py: 72*TILE_SIZE, pw: 4*TILE_SIZE, ph: 2*TILE_SIZE },
];

// ── Base searchable object templates (16 non-vault + 1 vault pedestal) ───────
export const OBJECT_TEMPLATES: Omit<SearchableObject, 'item' | 'searched'>[] = [
  // Room 0 – Lobby
  { id: 'r0-a', roomId: 0, tx: 5,  ty: 4,  tw: 5, th: 2, type: 'desk' },
  { id: 'r0-b', roomId: 0, tx: 19, ty: 4,  tw: 2, th: 4, type: 'cabinet' },
  { id: 'r0-c', roomId: 0, tx: 6,  ty: 11, tw: 2, th: 2, type: 'box' },
  { id: 'r0-d', roomId: 0, tx: 16, ty: 11, tw: 5, th: 2, type: 'desk' },
  // Room 1 – Office Wing
  { id: 'r1-a', roomId: 1, tx: 4,  ty: 22, tw: 5, th: 2, type: 'desk' },
  { id: 'r1-b', roomId: 1, tx: 17, ty: 22, tw: 5, th: 2, type: 'desk' },
  { id: 'r1-c', roomId: 1, tx: 22, ty: 25, tw: 2, th: 4, type: 'cabinet' },
  { id: 'r1-d', roomId: 1, tx: 7,  ty: 29, tw: 2, th: 2, type: 'box' },
  // Room 2 – Server Room
  { id: 'r2-a', roomId: 2, tx: 5,  ty: 39, tw: 2, th: 9, type: 'rack' },
  { id: 'r2-b', roomId: 2, tx: 9,  ty: 39, tw: 2, th: 9, type: 'rack' },
  { id: 'r2-c', roomId: 2, tx: 13, ty: 39, tw: 2, th: 9, type: 'rack' },
  { id: 'r2-d', roomId: 2, tx: 18, ty: 46, tw: 2, th: 2, type: 'box' },
  // Room 3 – Data Center
  { id: 'r3-a', roomId: 3, tx: 3,  ty: 57, tw: 2, th: 11, type: 'rack' },
  { id: 'r3-b', roomId: 3, tx: 8,  ty: 57, tw: 2, th: 11, type: 'rack' },
  { id: 'r3-c', roomId: 3, tx: 17, ty: 57, tw: 2, th: 11, type: 'rack' },
  { id: 'r3-d', roomId: 3, tx: 24, ty: 57, tw: 2, th: 11, type: 'rack' },
  // Room 4 – Vault pedestal (always legendary)
  { id: 'r4-a', roomId: 4, tx: 15, ty: 80, tw: 2, th: 2, type: 'pedestal' },
];

// ── Extra decoy objects (always traps, add visual variety) ───────────────────
export const EXTRA_TRAP_TEMPLATES: Omit<SearchableObject, 'item' | 'searched'>[] = [
  // Lobby – PC workstation between the two desks
  { id: 'x0-a', roomId: 0, tx: 11, ty: 4,  tw: 3, th: 2, type: 'monitor-stack' },
  // Office Wing – tall wardrobe
  { id: 'x1-a', roomId: 1, tx: 11, ty: 23, tw: 2, th: 3, type: 'almirah' },
  // Vault – heavy safe that isn't the real prize
  { id: 'x4-a', roomId: 4, tx: 12, ty: 80, tw: 1, th: 1, type: 'safe' },
];

// ── Tile map ────────────────────────────────────────────────────────────────
export function buildTileMap(): Uint8Array {
  const tiles = new Uint8Array(MAP_W * MAP_H).fill(TILE.WALL);

  function carve(x: number, y: number, w: number, h: number) {
    for (let ty = y; ty < y + h; ty++) {
      for (let tx = x; tx < x + w; tx++) {
        if (tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H) {
          tiles[ty * MAP_W + tx] = TILE.FLOOR;
        }
      }
    }
  }

  ROOMS.forEach(r => carve(r.x, r.y, r.w, r.h));
  CORRIDORS.forEach(c => carve(c.x, c.y, c.w, c.h));

  return tiles;
}

export function isWall(tiles: Uint8Array, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  return tiles[ty * MAP_W + tx] === TILE.WALL;
}

export function getRoomAt(px: number, py: number): Room | null {
  const tx = Math.floor(px / TILE_SIZE);
  const ty = Math.floor(py / TILE_SIZE);
  return ROOMS.find(r =>
    tx >= r.x && tx < r.x + r.w &&
    ty >= r.y && ty < r.y + r.h
  ) ?? null;
}

export function getObjectsInRoom(objects: SearchableObject[], roomId: number): SearchableObject[] {
  return objects.filter(o => o.roomId === roomId);
}

export function countRealRemaining(objects: SearchableObject[], roomId: number): number {
  return objects.filter(o => o.roomId === roomId && !o.searched && o.item !== null).length;
}
