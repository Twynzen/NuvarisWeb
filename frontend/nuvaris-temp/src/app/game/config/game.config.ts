export const GameConfig = {
  // Palette (Neon/Cyberpunk style)
  colors: {
    player: 0x00ff00,      // Bright Green
    enemy: {
      zombie: 0xff4444,    // Red
      runner: 0x44ff44,    // Greenish
      tank: 0x4444ff,      // Blue
      boss: 0xff00ff       // Magenta
    },
    projectile: {
      player: 0xffff00,    // Yellow
      enemy: 0xff0000      // Red
    },
    xp: {
      low: 0x00ffff,       // Cyan
      medium: 0x00ff00,    // Green
      high: 0xff00ff       // Purple
    },
    ui: {
      health: 0x00ff00,
      damage: 0xff0000,
      xp: 0x00ffff
    }
  },

  // Entity Sizes (Dimensions in pixels)
  sizes: {
    player: 40,
    enemy: {
      zombie: 30,
      runner: 25,
      tank: 45,
      boss: 60
    },
    projectile: 8
  },

  // Depths (Z-Index)
  depths: {
    background: 0,
    floor: 10,
    items: 20,
    enemies: 30,
    player: 40,
    projectiles: 50,
    effects: 60,
    ui: 100
  },

  // Game Balance
  balance: {
    player: {
      speed: 200,
      maxHealth: 100
    }
  }
};
