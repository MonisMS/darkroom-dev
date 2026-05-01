import type { ItemDef } from './types';

export const ITEMS: ItemDef[] = [
  // COMMON
  {
    id: 'rubber-duck',
    name: 'Rubber Duck Debugger',
    rarity: 'common',
    emoji: '🦆',
    description: 'You explained the bug to it. It listened. You fixed the bug. It said nothing. Best teammate.',
  },
  {
    id: 'console-log',
    name: "console.log('here')",
    rarity: 'common',
    emoji: '💬',
    description: "The forensic evidence of a debugging session. It's still in production. Logs 400,000 times a day.",
  },
  {
    id: 'womm',
    name: "It Works On My Machine™",
    rarity: 'common',
    emoji: '📜',
    description: 'Professionally laminated. Internationally unrecognized. Personally treasured.',
  },
  {
    id: 'npm-install',
    name: 'npm install (3.2MB for isEven)',
    rarity: 'common',
    emoji: '📦',
    description: 'Returns true if a number is even. Has 47 dependencies. Downloads: 4.2 million per week.',
  },
  {
    id: 'todo-comment',
    name: "// TODO: Fix Later",
    rarity: 'common',
    emoji: '🟡',
    description: 'Later came. Later left. The TODO remains. The commit message says "minor cleanup."',
  },
  {
    id: 'cold-coffee',
    name: 'Cold Coffee (Gone Cold)',
    rarity: 'common',
    emoji: '☕',
    description: 'You had a plan. The plan was coffee. The coffee got cold during the standup.',
  },
  {
    id: 'semicolon',
    name: 'The Semicolon You Forgot',
    rarity: 'common',
    emoji: ';',
    description: 'Three hours of debugging. One character. It was you. It is always you.',
  },
  {
    id: 'gitignore',
    name: '.gitignore (Handwritten)',
    rarity: 'common',
    emoji: '📄',
    description: 'node_modules/. .env. .DS_Store. And somehow also your hopes and deployment plans.',
  },
  {
    id: 'readme',
    name: 'README.md (Outdated)',
    rarity: 'common',
    emoji: '📖',
    description: 'Installation instructions reference Node 8. Section titled "TODO: Write This Section."',
  },
  {
    id: 'hotfix',
    name: 'Hotfix on Friday 4:55pm',
    rarity: 'common',
    emoji: '🔥',
    description: '"It is a small change," you said. "Five minutes," you said. It was neither.',
  },

  // RARE
  {
    id: 'first-pr',
    name: 'First Pull Request (Merged)',
    rarity: 'rare',
    emoji: '🔀',
    description: '3 files changed. 1 line added. 847 lines deleted. Approved without being read.',
  },
  {
    id: 'localhost',
    name: 'localhost:3000',
    rarity: 'rare',
    emoji: '🌐',
    description: 'The only URL that has never let you down. It is always there. It understands.',
  },
  {
    id: 'regex',
    name: 'A Working Regex',
    rarity: 'rare',
    emoji: '🔍',
    description: 'It works. You do not know why. You will not touch it. You will never touch it.',
  },
  {
    id: 'stack-trace',
    name: 'The Perfect Stack Trace',
    rarity: 'rare',
    emoji: '📍',
    description: 'Line 47. Your file. Your function. Your bug. Devastating. Efficient. Almost beautiful.',
  },
  {
    id: 'vim-exit',
    name: 'Vim Exit Cheatsheet',
    rarity: 'rare',
    emoji: '📋',
    description: 'The :wq section is worn off from use. :q! is underlined three times in red.',
  },
  {
    id: 'dark-mode',
    name: 'The Dark Mode Toggle',
    rarity: 'rare',
    emoji: '🌙',
    description: 'You added it before any other feature. You are not sorry. You will do it again.',
  },
  {
    id: 'temp-folder',
    name: "The 'temp/' Folder",
    rarity: 'rare',
    emoji: '📁',
    description: 'Created in 2019. Contains 847 files. You do not know what any of them are. You will not delete it.',
  },

  // ULTRA RARE
  {
    id: 'o1-solution',
    name: 'The O(1) Solution',
    rarity: 'ultra-rare',
    emoji: '📈',
    description: 'You found it at 11pm. Refactored the entire codebase for it. It is a hashmap. It was always a hashmap.',
  },
  {
    id: 'deep-work',
    name: 'Uninterrupted 4-Hour Deep Work',
    rarity: 'ultra-rare',
    emoji: '🧘',
    description: 'No standups. No pings. No "quick questions." You shipped the whole feature. You cherish this memory.',
  },
  {
    id: 'first-google',
    name: 'Correct Answer on First Google Search',
    rarity: 'ultra-rare',
    emoji: '👑',
    description: 'It happened. You have no proof. Nobody will believe you. It was a Thursday.',
  },
  {
    id: 'segfault',
    name: 'Segmentation Fault (Core Dumped)',
    rarity: 'ultra-rare',
    emoji: '💀',
    description: "The OS itself gave up. It didn't even tell you why. It just left. Respect.",
  },
  {
    id: 'doom-source',
    name: 'The DOOM Source Code',
    rarity: 'ultra-rare',
    emoji: '👾',
    description: 'John Carmack wrote this in the dark. You found it in the dark. There is a pattern here.',
  },

  // LEGENDARY
  {
    id: 'agi',
    name: 'The AGI',
    rarity: 'legendary',
    emoji: '🤖',
    description: "It found you first. It just wanted to see what you'd do. It asked you to keep this between us. You are reading this on a public leaderboard.",
  },
];

export const RARITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  'ultra-rare': '#A855F7',
  legendary: '#F59E0B',
};

export const RARITY_LABELS: Record<string, string> = {
  common: 'COMMON',
  rare: 'RARE',
  'ultra-rare': 'ULTRA RARE',
  legendary: 'LEGENDARY',
};

export function getRandomItems(count: number): ItemDef[] {
  const pool = ITEMS.filter(i => i.rarity !== 'legendary');
  const weights: Record<string, number> = {
    common: 60,
    rare: 28,
    'ultra-rare': 12,
  };

  const weighted: ItemDef[] = [];
  pool.forEach(item => {
    const w = weights[item.rarity] ?? 0;
    for (let i = 0; i < w; i++) weighted.push(item);
  });

  const picked: ItemDef[] = [];
  const usedIds = new Set<string>();

  while (picked.length < count && usedIds.size < pool.length) {
    const candidate = weighted[Math.floor(Math.random() * weighted.length)];
    if (!usedIds.has(candidate.id)) {
      picked.push(candidate);
      usedIds.add(candidate.id);
    }
  }

  return picked;
}
