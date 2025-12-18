/**
 * SVG Icons for all character abilities
 * Style: QDT minimalist (white/gray on transparent)
 */

export interface SkillIcon {
    svg: string;
    viewBox: string;
}

// ==================== LARS ICONS (Mind Control Theme) ====================
export const LarsIcons: Record<string, SkillIcon> = {
    // BASIC
    persuasion: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 8c-10 0-18 8-18 18s8 18 18 18 18-8 18-18-8-18-18-18zm0 4c7.7 0 14 6.3 14 14s-6.3 14-14 14-14-6.3-14-14 6.3-14 14-14z" fill="currentColor" opacity="0.6"/>
              <circle cx="32" cy="26" r="6" fill="currentColor"/>
              <path d="M20 48c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
              <path d="M8 26c-2-4-2-8 0-12M56 26c2-4 2-8 0-12M12 16c-1-2-1-4 0-6M52 16c1-2 1-4 0-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`
    },
    leadership: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="16" r="8" fill="currentColor"/>
              <circle cx="16" cy="32" r="6" fill="currentColor" opacity="0.6"/>
              <circle cx="48" cy="32" r="6" fill="currentColor" opacity="0.6"/>
              <path d="M32 24v12M32 36l-12 4M32 36l12 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M16 38v8M32 36v16M48 38v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`
    },
    charisma: {
        viewBox: '0 0 64 64',
        svg: `<path d="M12 32c0-11 9-20 20-20s20 9 20 20" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
              <circle cx="32" cy="40" r="12" fill="currentColor" opacity="0.3"/>
              <circle cx="32" cy="40" r="6" fill="currentColor"/>
              <path d="M26 36l-8-8M38 36l8-8M32 28v-8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="18" cy="28" r="3" fill="currentColor" opacity="0.5"/>
              <circle cx="46" cy="28" r="3" fill="currentColor" opacity="0.5"/>
              <circle cx="32" cy="20" r="3" fill="currentColor" opacity="0.5"/>`
    },
    neural_freeze: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="28" r="14" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M32 14v-6M32 42v6M18 28h-6M46 28h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M22 18l-4-4M42 18l4-4M22 38l-4 4M42 38l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
              <circle cx="32" cy="28" r="6" fill="currentColor" opacity="0.4"/>
              <path d="M28 24l8 8M36 24l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    },

    // EPIC
    mass_hysteria: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/>
              <circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" stroke-width="2"/>
              <circle cx="32" cy="32" r="4" fill="currentColor"/>
              <circle cx="20" cy="24" r="3" fill="currentColor" opacity="0.6"/>
              <circle cx="44" cy="24" r="3" fill="currentColor" opacity="0.6"/>
              <circle cx="20" cy="40" r="3" fill="currentColor" opacity="0.6"/>
              <circle cx="44" cy="40" r="3" fill="currentColor" opacity="0.6"/>
              <path d="M32 32l-9-6M32 32l12-6M32 32l-9 10M32 32l12 10" stroke="currentColor" stroke-width="1" opacity="0.4"/>`
    },
    loyalty: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 12l4 8 8 2-6 6 2 8-8-4-8 4 2-8-6-6 8-2z" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="2"/>
              <circle cx="32" cy="44" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
              <circle cx="32" cy="44" r="3" fill="currentColor"/>
              <path d="M32 28v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    },
    sacrifice: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="24" r="12" fill="none" stroke="currentColor" stroke-width="2"/>
              <circle cx="28" cy="22" r="2" fill="currentColor"/>
              <circle cx="36" cy="22" r="2" fill="currentColor"/>
              <path d="M26 28c2 3 8 3 10 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
              <path d="M32 36l-12 16M32 36l12 16M32 36v16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="20" cy="52" r="3" fill="currentColor" opacity="0.5"/>
              <circle cx="32" cy="52" r="3" fill="currentColor" opacity="0.5"/>
              <circle cx="44" cy="52" r="3" fill="currentColor" opacity="0.5"/>`
    },
    unstable_mind: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="28" r="14" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 3"/>
              <path d="M24 24l4 4M36 24l-4 4M28 34h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M32 42l-8 12M32 42l8 12M32 42v12" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
              <circle cx="24" cy="54" r="2" fill="currentColor"/>
              <circle cx="40" cy="54" r="2" fill="currentColor"/>
              <circle cx="32" cy="54" r="2" fill="currentColor"/>`
    },
    terror: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 8c-12 0-20 12-20 24 0 8 4 16 12 20h16c8-4 12-12 12-20 0-12-8-24-20-24z" fill="none" stroke="currentColor" stroke-width="2"/>
              <circle cx="24" cy="28" r="4" fill="currentColor"/>
              <circle cx="40" cy="28" r="4" fill="currentColor"/>
              <path d="M24 40c0-4 16-4 16 0" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M20 40v4M28 40v6M36 40v6M44 40v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    },

    // LEGENDARY
    hive_mind: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="16" r="8" fill="currentColor"/>
              <circle cx="16" cy="36" r="6" fill="currentColor" opacity="0.7"/>
              <circle cx="48" cy="36" r="6" fill="currentColor" opacity="0.7"/>
              <circle cx="24" cy="52" r="5" fill="currentColor" opacity="0.5"/>
              <circle cx="40" cy="52" r="5" fill="currentColor" opacity="0.5"/>
              <path d="M32 24v-2M32 24l-14 10M32 24l14 10M22 42l-4 6M42 42l4 6M16 42l6 8M48 42l-6 8" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>`
    },
    volatile_psyche: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="24" r="12" fill="none" stroke="currentColor" stroke-width="2"/>
              <circle cx="32" cy="24" r="5" fill="currentColor"/>
              <path d="M20 36l-8 16M32 36v20M44 36l8 16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              <path d="M16 48l-4 8M24 52l-2 8M40 52l2 8M48 48l4 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
              <circle cx="32" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.4"/>`
    },
    rebellion: {
        viewBox: '0 0 64 64',
        svg: `<path d="M20 12l12 20-12 20" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M44 12l-12 20 12 20" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="32" cy="32" r="8" fill="currentColor"/>
              <path d="M32 24v-12M32 40v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    }
};

// ==================== PROYECTO A ICONS (Tank/Berserker Theme) ====================
export const ProyectoAIcons: Record<string, SkillIcon> = {
    // BASIC
    iron_skin: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 8l20 8v20c0 12-8 20-20 24-12-4-20-12-20-24V16z" fill="none" stroke="currentColor" stroke-width="3"/>
              <path d="M32 16l12 5v12c0 7-5 12-12 15-7-3-12-8-12-15V21z" fill="currentColor" opacity="0.3"/>
              <path d="M26 32h12M32 26v12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
    },
    heavy_hand: {
        viewBox: '0 0 64 64',
        svg: `<path d="M20 40l8-24h8l8 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 40h32v8c0 4-4 8-8 8H24c-4 0-8-4-8-8z" fill="currentColor" opacity="0.4" stroke="currentColor" stroke-width="2"/>
              <path d="M28 16v-4M36 16v-4M32 16v-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    },
    vitality: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 56c-16-8-24-20-24-32 0-8 8-16 16-16 4 0 6 2 8 4 2-2 4-4 8-4 8 0 16 8 16 16 0 12-8 24-24 32z" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="2"/>
              <path d="M32 20v20M24 32h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
    },
    thick_skin: {
        viewBox: '0 0 64 64',
        svg: `<rect x="16" y="16" width="32" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="3"/>
              <rect x="22" y="22" width="20" height="20" rx="2" fill="currentColor" opacity="0.3"/>
              <path d="M28 32h8M32 28v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    },
    blood_thirst: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 8c-8 12-16 20-16 32 0 8 8 16 16 16s16-8 16-16c0-12-8-20-16-32z" fill="currentColor" opacity="0.4" stroke="currentColor" stroke-width="2"/>
              <circle cx="32" cy="40" r="6" fill="currentColor"/>`
    },

    // EPIC
    seismic_wave: {
        viewBox: '0 0 64 64',
        svg: `<path d="M8 48c8-8 16-24 24-24s16 16 24 24" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
              <path d="M12 52c6-6 12-18 20-18s14 12 20 18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>
              <path d="M16 56c4-4 8-12 16-12s12 8 16 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.3"/>
              <circle cx="32" cy="24" r="4" fill="currentColor"/>`
    },
    retaliation: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 8l20 8v20c0 12-8 20-20 24-12-4-20-12-20-24V16z" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M24 28l8-8 8 8M24 36l8 8 8-8" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    adrenaline: {
        viewBox: '0 0 64 64',
        svg: `<path d="M12 32h8l4-12 8 24 8-24 4 12h8" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>`
    },
    blood_rage: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 8c-8 12-16 20-16 32 0 8 8 16 16 16s16-8 16-16c0-12-8-20-16-32z" fill="currentColor" opacity="0.5" stroke="currentColor" stroke-width="2"/>
              <path d="M24 36l8-8 8 8M28 44h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    },
    titan_resilience: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="3"/>
              <circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" stroke-width="2" opacity="0.6"/>
              <circle cx="32" cy="32" r="4" fill="currentColor"/>
              <path d="M32 12v4M32 48v4M12 32h4M48 32h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    },
    fury: {
        viewBox: '0 0 64 64',
        svg: `<path d="M16 20l8 12-8 12h8l8-12-8-12z" fill="currentColor"/>
              <path d="M32 20l8 12-8 12h8l8-12-8-12z" fill="currentColor" opacity="0.7"/>
              <path d="M48 20l8 12-8 12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.4"/>`
    },
    vampiric_strikes: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 8c-8 10-14 18-14 28 0 8 6 14 14 14s14-6 14-14c0-10-6-18-14-28z" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M24 32l8-8 8 8" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M32 24v16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
    },

    // LEGENDARY
    titan_form: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 4l-16 12v16l16 12 16-12V16z" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="2"/>
              <circle cx="32" cy="24" r="6" fill="currentColor"/>
              <path d="M24 44h16M20 52h24" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              <path d="M28 36v12M36 36v12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
    },
    earthquake: {
        viewBox: '0 0 64 64',
        svg: `<path d="M8 56h48" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              <path d="M12 48h40M18 40h28M24 32h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
              <path d="M32 8v24" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              <path d="M24 16l8-8 8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    berserk_mode: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="28" r="16" fill="none" stroke="currentColor" stroke-width="3"/>
              <path d="M24 24l4 4M36 24l-4 4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              <path d="M24 34c4 4 12 4 16 0" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
              <path d="M16 12l8 8M48 12l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M20 52l6-8M44 52l-6-8M32 52v-8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    },
    immortal_titan: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 8l20 8v20c0 12-8 20-20 24-12-4-20-12-20-24V16z" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="3"/>
              <circle cx="32" cy="32" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M32 22v20M22 32h20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              <circle cx="32" cy="32" r="4" fill="currentColor"/>`
    }
};

// ==================== PROYECTO Y ICONS (Electric/Speed Theme) ====================
export const ProyectoYIcons: Record<string, SkillIcon> = {
    // BASIC
    conductivity: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 8l-8 20h16l-8 20" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20 36l-8 12M44 36l8 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
              <circle cx="12" cy="48" r="3" fill="currentColor" opacity="0.5"/>
              <circle cx="52" cy="48" r="3" fill="currentColor" opacity="0.5"/>`
    },
    voltage: {
        viewBox: '0 0 64 64',
        svg: `<rect x="20" y="16" width="24" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="3"/>
              <rect x="26" y="12" width="12" height="4" fill="currentColor"/>
              <path d="M26 28h12M26 36h8M26 44h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <rect x="26" y="24" width="12" height="24" fill="currentColor" opacity="0.2"/>`
    },
    quick_charge: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="3"/>
              <path d="M32 16v16l12 8" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20 12l4 8M44 12l-4 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    },
    sharp_reflexes: {
        viewBox: '0 0 64 64',
        svg: `<ellipse cx="32" cy="32" rx="16" ry="20" fill="none" stroke="currentColor" stroke-width="3"/>
              <circle cx="32" cy="32" r="8" fill="currentColor" opacity="0.3"/>
              <circle cx="32" cy="32" r="3" fill="currentColor"/>
              <path d="M32 12v8M32 44v8M16 32h8M40 32h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`
    },
    precision: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="2"/>
              <circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" stroke-width="2"/>
              <circle cx="32" cy="32" r="4" fill="currentColor"/>
              <path d="M32 8v8M32 48v8M8 32h8M48 32h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    },

    // EPIC
    overload: {
        viewBox: '0 0 64 64',
        svg: `<path d="M32 8l-12 24h24l-12 24" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 20l-8 8M48 20l8 8M16 44l-8-8M48 44l8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
              <circle cx="32" cy="32" r="4" fill="currentColor"/>`
    },
    static_shock: {
        viewBox: '0 0 64 64',
        svg: `<path d="M20 16c-8 4-12 12-8 20s12 12 20 8" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="4 2"/>
              <path d="M44 48c8-4 12-12 8-20s-12-12-20-8" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="4 2"/>
              <path d="M32 24l-4 8h8l-4 8" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    phantom_dash: {
        viewBox: '0 0 64 64',
        svg: `<path d="M8 32h16M24 32l16-16M40 16h16" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 28h8M12 36h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
              <circle cx="48" cy="16" r="4" fill="currentColor"/>
              <path d="M44 20l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`
    },
    deadly_precision: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="2"/>
              <circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" stroke-width="2"/>
              <circle cx="32" cy="32" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M32 8v8M32 48v8M8 32h8M48 32h8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              <path d="M20 20l6 6M44 20l-6 6M20 44l6-6M44 44l-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`
    },
    energized: {
        viewBox: '0 0 64 64',
        svg: `<path d="M16 48l8-16 8 8 8-24 8 16" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="16" cy="48" r="3" fill="currentColor"/>
              <circle cx="48" cy="32" r="3" fill="currentColor"/>
              <path d="M8 52h48" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>`
    },

    // LEGENDARY
    thunderstorm: {
        viewBox: '0 0 64 64',
        svg: `<path d="M12 24c0-8 8-16 20-16s20 8 20 16c0 4-4 8-8 8H20c-4 0-8-4-8-8z" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="2"/>
              <path d="M24 32l-4 12 8-4-4 16" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M40 32l-4 12 8-4-4 16" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>`
    },
    plasma_arc: {
        viewBox: '0 0 64 64',
        svg: `<path d="M8 48c8-32 40-32 48 0" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
              <path d="M16 44c6-24 26-24 32 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>
              <circle cx="32" cy="20" r="4" fill="currentColor"/>
              <path d="M32 24v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    },
    perfect_evasion: {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="8 4"/>
              <path d="M20 32c0-8 12-16 24 0" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
              <path d="M44 32c0 8-12 16-24 0" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
              <circle cx="32" cy="32" r="4" fill="currentColor"/>`
    }
};

/**
 * Get icon for a specific ability by ID and character
 */
export function getSkillIcon(abilityId: string, characterId: string): SkillIcon {
    let iconSet: Record<string, SkillIcon>;

    switch (characterId) {
        case 'lars':
            iconSet = LarsIcons;
            break;
        case 'proyecto-a':
            iconSet = ProyectoAIcons;
            break;
        case 'proyecto-y':
            iconSet = ProyectoYIcons;
            break;
        default:
            iconSet = ProyectoAIcons;
    }

    // Return specific icon or default
    return iconSet[abilityId] || getDefaultIcon();
}

/**
 * Default icon for unknown abilities
 */
function getDefaultIcon(): SkillIcon {
    return {
        viewBox: '0 0 64 64',
        svg: `<circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="3"/>
              <circle cx="32" cy="32" r="8" fill="currentColor" opacity="0.5"/>
              <circle cx="32" cy="32" r="3" fill="currentColor"/>`
    };
}
