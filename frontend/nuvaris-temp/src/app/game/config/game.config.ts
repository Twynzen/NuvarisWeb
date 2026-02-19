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
  debugCollisions: false,
  debugPhysicsBodies: false,
  debugTileGrid: false,

  // Animations
  animations: {
    // Arcadio (Project A)
    'proyecto-a-concept': Array.from({ length: 30 }, (_, i) => `proyecto-a-concept-${i + 1}`),
    'proyecto-a-idle': Array.from({ length: 30 }, (_, i) => `proyecto-a-idle-${i + 1}`),
    'proyecto-a-walk-down': Array.from({ length: 30 }, (_, i) => `proyecto-a-walk-down-${i + 1}`),
    'proyecto-a-walk-up': Array.from({ length: 30 }, (_, i) => `proyecto-a-walk-up-${i + 1}`),
    'proyecto-a-walk-left': Array.from({ length: 30 }, (_, i) => `proyecto-a-walk-right-${i + 1}`), // Reuse right, will flip
    'proyecto-a-walk-right': Array.from({ length: 30 }, (_, i) => `proyecto-a-walk-right-${i + 1}`),
    'proyecto-a-shoot-right': Array.from({ length: 30 }, (_, i) => `proyecto-a-shoot-right-${i + 1}`),
    'proyecto-a-shoot-down': Array.from({ length: 30 }, (_, i) => `proyecto-a-shoot-down-${i + 1}`),
    'proyecto-a-shoot-up': Array.from({ length: 30 }, (_, i) => `proyecto-a-shoot-up-${i + 1}`),
    'proyecto-a-projectile': Array.from({ length: 30 }, (_, i) => `proyecto-a-projectile-${i + 1}`),
    'proyecto-a-dead': Array.from({ length: 30 }, (_, i) => `proyecto-a-dead-${i + 1}`),

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

    // Yurany (Project Y)
    'proyecto-y-concept': Array.from({ length: 30 }, (_, i) => `proyecto-y-concept-${i + 1}`),
    'proyecto-y-idle': Array.from({ length: 30 }, (_, i) => `proyecto-y-idle-${i + 1}`),
    'proyecto-y-walk-down': Array.from({ length: 30 }, (_, i) => `proyecto-y-walk-down-${i + 1}`),
    'proyecto-y-walk-up': Array.from({ length: 30 }, (_, i) => `proyecto-y-walk-up-${i + 1}`),
    'proyecto-y-walk-left': Array.from({ length: 30 }, (_, i) => `proyecto-y-walk-right-${i + 1}`),
    'proyecto-y-walk-right': Array.from({ length: 30 }, (_, i) => `proyecto-y-walk-right-${i + 1}`),
    'proyecto-y-walk-down-left': ['proyecto-y-walk-down-left-2'],
    'proyecto-y-walk-down-right': ['proyecto-y-walk-down-right-1', 'proyecto-y-walk-down-right-2'],
    'proyecto-y-walk-up-left': ['proyecto-y-walk-up-left-1', 'proyecto-y-walk-up-left-2'],
    'proyecto-y-walk-up-right': ['proyecto-y-walk-up-right-1', 'proyecto-y-walk-up-right-2'],
    'proyecto-y-shoot-right': Array.from({ length: 30 }, (_, i) => `proyecto-y-shoot-right-${i + 1}`),
    'proyecto-y-shoot-down': Array.from({ length: 30 }, (_, i) => `proyecto-y-shoot-down-${i + 1}`),
    'proyecto-y-shoot-up': Array.from({ length: 30 }, (_, i) => `proyecto-y-shoot-up-${i + 1}`),
    'proyecto-y-projectile': Array.from({ length: 30 }, (_, i) => `proyecto-y-projectile-${i + 1}`),
    'proyecto-y-dead': Array.from({ length: 30 }, (_, i) => `proyecto-y-dead-${i + 1}`),

    // Enemies
    'worm-move': Array.from({ length: 30 }, (_, i) => `worm-move-${i + 1}`),
    'spider-move': Array.from({ length: 30 }, (_, i) => `spider-move-${i + 1}`),
    'boss-move': ['boss-walk-1', 'boss-walk-2', 'boss-walk-3', 'boss-walk-4']
  }
};
