export interface AbilityOption {
    id: string;
    name: string;
    description: string;
    rarity: 'basica' | 'epica' | 'legendaria';
    icon?: string;
    effect: (scene: any) => void; // Pass scene or player context
}
