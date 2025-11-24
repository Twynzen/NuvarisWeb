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
  debugAssetSizes: false,

  // Animations
  animations: {
    // Arcadio
    'arcadio-concept': Array.from({ length: 30 }, (_, i) => `arcadio-concept-${i + 1}`),
    'arcadio-idle': Array.from({ length: 30 }, (_, i) => `arcadio-idle-${i + 1}`),
    'arcadio-walk-down': Array.from({ length: 30 }, (_, i) => `arcadio-walk-down-${i + 1}`),
    'arcadio-walk-up': Array.from({ length: 30 }, (_, i) => `arcadio-walk-up-${i + 1}`),
    'arcadio-walk-left': Array.from({ length: 30 }, (_, i) => `arcadio-walk-right-${i + 1}`), // Reuse right, will flip
    'arcadio-walk-right': Array.from({ length: 30 }, (_, i) => `arcadio-walk-right-${i + 1}`),
    'arcadio-shoot-right': Array.from({ length: 30 }, (_, i) => `arcadio-shoot-right-${i + 1}`),
    'arcadio-shoot-down': Array.from({ length: 30 }, (_, i) => `arcadio-shoot-down-${i + 1}`),
    'arcadio-shoot-up': Array.from({ length: 30 }, (_, i) => `arcadio-shoot-up-${i + 1}`),
    'arcadio-projectile': Array.from({ length: 30 }, (_, i) => `arcadio-projectile-${i + 1}`),
    'arcadio-dead': Array.from({ length: 30 }, (_, i) => `arcadio-dead-${i + 1}`),

    // Lars
    'lars-concept': Array.from({ length: 30 }, (_, i) => `lars-concept-${i + 1}`),
    'lars-idle': Array.from({ length: 30 }, (_, i) => `lars-idle-${i + 1}`),
    'lars-walk-down': Array.from({ length: 30 }, (_, i) => `lars-walk-down-${i + 1}`),
    'lars-walk-up': Array.from({ length: 30 }, (_, i) => `lars-walk-up-${i + 1}`),
    'lars-walk-left': Array.from({ length: 30 }, (_, i) => `lars-walk-right-${i + 1}`), // Reuse right, will flip
    'lars-walk-right': Array.from({ length: 30 }, (_, i) => `lars-walk-right-${i + 1}`),
    'lars-shoot-right': Array.from({ length: 30 }, (_, i) => `lars-shoot-right-${i + 1}`),
    'lars-shoot-down': Array.from({ length: 30 }, (_, i) => `lars-shoot-down-${i + 1}`),
    'lars-shoot-up': Array.from({ length: 30 }, (_, i) => `lars-shoot-up-${i + 1}`),
    'lars-projectile': Array.from({ length: 30 }, (_, i) => `lars-projectile-${i + 1}`),
    'lars-dead': Array.from({ length: 30 }, (_, i) => `lars-dead-${i + 1}`),

    // Yurany
    'yurany-concept': Array.from({ length: 30 }, (_, i) => `yurany-concept-${i + 1}`),
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
    'yurany-dead': Array.from({ length: 30 }, (_, i) => `yurany-dead-${i + 1}`),

    // Enemies
    'worm-move': Array.from({ length: 30 }, (_, i) => `worm-move-${i + 1}`),
    'spider-move': Array.from({ length: 30 }, (_, i) => `spider-move-${i + 1}`),
    'boss-move': ['boss-walk-1', 'boss-walk-2', 'boss-walk-3', 'boss-walk-4']
  }
};
