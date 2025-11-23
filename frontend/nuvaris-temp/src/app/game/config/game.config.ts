export const GameConfig = {
  // Colors
  colors: {
    primary: 0x00ffff,    // Cyan
    secondary: 0xff00ff,  // Magenta
    danger: 0xff0000,     // Red
    success: 0x00ff00,    // Green
    warning: 0xffff00,    // Yellow
    background: 0x111111, // Dark Grey
    text: '#ffffff',
    textHighlight: '#00ffff',

    // Entity specific (Legacy support)
    player: 0x00ff00,
    enemy: {
      zombie: 0xff4444,
      runner: 0x44ff44,
      tank: 0x4444ff,
      boss: 0xff00ff
    },
    projectile: {
      player: 0xffff00,
      enemy: 0xff0000
    },
    xp: {
      low: 0x00ffff,
      medium: 0x00ff00,
      high: 0xff00ff
    }
  },

  // Entity Sizes (Radius/Dimensions)
  sizes: {
    player: 20,
    enemy: {
      zombie: 16, // Standard
      runner: 12,
      tank: 24,
      boss: 60
    },
    projectile: 5,
    xpGem: 8
  },

  // Depths (Z-Index)
  depths: {
    floor: 0,
    wall: 1,
    item: 5,
    enemy: 10,
    player: 20,
    projectile: 30,
    ui: 100,
    overlay: 200
  },

  // Game Balance
  balance: {
    player: {
      speed: 200,
      maxHealth: 100
    }
  },

  // Debug
  debugAssetSizes: true,

  // Animations
  animations: {
    // Arcadio
    'arcadio-idle': ['arcadio-static-1', 'arcadio-static-2', 'arcadio-static-3'],
    'arcadio-walk-down': ['arcadio-walk-down-1', 'arcadio-walk-down-2'],
    'arcadio-walk-up': ['arcadio-walk-up-1', 'arcadio-walk-up-2'],
    'arcadio-walk-left': ['arcadio-walk-left-1', 'arcadio-walk-left-2', 'arcadio-walk-left-3'],
    'arcadio-walk-right': ['arcadio-walk-right-1', 'arcadio-walk-right-2', 'arcadio-walk-right-3'],
    'arcadio-walk-down-left': ['arcadio-walk-down-left-1', 'arcadio-walk-down-left-2'],
    'arcadio-walk-down-right': ['arcadio-walk-down-right-1', 'arcadio-walk-down-right-2'],
    'arcadio-walk-up-left': ['arcadio-walk-up-left-1', 'arcadio-walk-up-left-2'],
    'arcadio-walk-up-right': ['arcadio-walk-up-right-1', 'arcadio-walk-up-right-2'],

    // Lars
    'lars-idle': Array.from({ length: 30 }, (_, i) => `lars-idle-${i + 1}`),
    'lars-walk-down': Array.from({ length: 30 }, (_, i) => `lars-walk-down-${i + 1}`),
    'lars-walk-up': ['lars-walk-up-1', 'lars-walk-up-2'],
    'lars-walk-left': Array.from({ length: 30 }, (_, i) => `lars-walk-right-${(i + 1).toString().padStart(3, '0')}`),
    'lars-walk-right': Array.from({ length: 30 }, (_, i) => `lars-walk-right-${(i + 1).toString().padStart(3, '0')}`),
    'lars-walk-down-left': ['lars-walk-down-left-1', 'lars-walk-down-left-2'],
    'lars-walk-down-right': ['lars-walk-down-right-1', 'lars-walk-down-right-2'],
    'lars-walk-up-left': ['lars-walk-up-left-1', 'lars-walk-up-left-2'],
    'lars-walk-up-right': ['lars-walk-up-right-1', 'lars-walk-up-right-2'],

    // Yurany
    'yurany-idle': Array.from({ length: 30 }, (_, i) => `yurany-idle-${i + 1}`),
    'yurany-walk-down': Array.from({ length: 30 }, (_, i) => `yurany-walk-down-${i + 1}`),
    'yurany-walk-up': Array.from({ length: 30 }, (_, i) => `yurany-walk-up-${i + 1}`),
    'yurany-walk-left': Array.from({ length: 30 }, (_, i) => `yurany-walk-right-${i + 1}`),
    'yurany-walk-right': Array.from({ length: 30 }, (_, i) => `yurany-walk-right-${i + 1}`),
    'yurany-walk-down-left': ['yurany-walk-down-left-2'],
    'yurany-walk-down-right': ['yurany-walk-down-right-1', 'yurany-walk-down-right-2'],
    'yurany-walk-up-left': ['yurany-walk-up-left-1', 'yurany-walk-up-left-2'],
    'yurany-walk-up-right': ['yurany-walk-up-right-1', 'yurany-walk-up-right-2'],
    'yurany-shoot-right': Array.from({ length: 30 }, (_, i) => `yurany-shoot-right-${i + 1}`),
    'yurany-shoot-down': Array.from({ length: 30 }, (_, i) => `yurany-shoot-down-${i + 1}`),
    'yurany-shoot-up': Array.from({ length: 30 }, (_, i) => `yurany-shoot-up-${i + 1}`),
    'yurany-projectile': Array.from({ length: 30 }, (_, i) => `yurany-projectile-${i + 1}`),

    // Enemies
    'worm-move': Array.from({ length: 30 }, (_, i) => `worm-move-${i + 1}`),
    'spider-move': Array.from({ length: 30 }, (_, i) => `spider-move-${i + 1}`),
    'boss-move': ['boss-walk-1', 'boss-walk-2', 'boss-walk-3', 'boss-walk-4']
  }
};
