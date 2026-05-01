export type Rarity = 'common' | 'rare' | 'ultra-rare' | 'legendary';

export interface ItemDef {
  id: string;
  name: string;
  rarity: Rarity;
  emoji: string;
  description: string;
}

export type ObjectType =
  | 'desk' | 'cabinet' | 'box' | 'rack' | 'pedestal'
  | 'monitor-stack' | 'almirah' | 'safe';
export type Facing = 'left' | 'right' | 'up' | 'down';

export interface SearchableObject {
  id: string;
  roomId: number;
  tx: number;
  ty: number;
  tw: number;
  th: number;
  type: ObjectType;
  searched: boolean;
  item: ItemDef | null; // null = decoy trap
}

export interface Gate {
  toRoom: number;
  px: number;
  py: number;
  pw: number;
  ph: number;
  tx: number;
  ty: number;
  tw: number;
  th: number;
}

export interface Player {
  x: number;
  y: number;
  speed: number;
  facing: Facing;
}

export interface Room {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  itemCount: number;
  stickyNote?: string;
}

export type GameScreen = 'title' | 'playing' | 'card' | 'roast' | 'inventory' | 'win' | 'room-clear';

export interface GameState {
  screen: GameScreen;
  player: Player;
  collected: ItemDef[];
  activeCard: ItemDef | null;
  cardRevealTime: number;
  torchRadius: number;
  time: number;
  explorerNumber: number;
  cameraX: number;
  cameraY: number;
  unlockedRooms: Set<number>;
  currentRoomId: number;
  // Trap
  roastMessage: { gotcha: string; roast: string } | null;
  // Horror timing
  jumpScarePlayed: boolean;
  jumpScareTime: number;
  // The Watcher
  watcherX: number;
  watcherY: number;
  watcherActive: boolean;
  watcherPunishUntil: number;
  // Room-clear interstitial
  roomClearIndex: number;
  roomClearStart: number;
  roomClearTextVisible: boolean;
  roomClearTextTime: number;
  pendingUnlockRoom: number | null;
  pendingRoomClear: boolean;
  // Per-room torch decay
  roomEnterTime: number;
  torchDecaying: boolean;
  torchFlickerEnd: number;
  torchFlickerNext: number;
}
