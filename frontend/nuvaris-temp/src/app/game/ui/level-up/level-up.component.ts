import { Component, EventEmitter, Output, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbilityOption } from '../../abilities/ability-option';
import { ProyectoASkills } from '../../abilities/skills/proyecto-a.skills';
import { LarsSkills } from '../../abilities/skills/lars.skills';
import { ProyectoYSkills } from '../../abilities/skills/proyecto-y.skills';

type Rarity = 'basica' | 'epica' | 'legendaria';

interface RouletteUpgrade extends AbilityOption {
    displayClass: string; // For CSS styling
}

@Component({
    selector: 'app-level-up',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './level-up.component.html',
    styleUrls: ['./level-up.component.scss']
})
export class LevelUpComponent implements OnInit, OnDestroy {
    @Input() characterId: string = 'proyecto-a';
    @Output() upgradeSelected = new EventEmitter<AbilityOption>();

    // Roulette state
    isSpinning = true;
    showResult = false;
    selectedUpgrade: RouletteUpgrade | null = null;
    spinningUpgrades: RouletteUpgrade[] = [];
    currentSpinIndex = 0;

    // Available upgrades for this character
    private characterUpgrades: AbilityOption[] = [];

    // Probabilities: 63% basica, 32% epica, 5% legendaria
    private readonly BASIC_CHANCE = 0.63;
    private readonly EPIC_CHANCE = 0.32;
    private readonly LEGENDARY_CHANCE = 0.05;

    // Spin animation timing
    private spinInterval: ReturnType<typeof setInterval> | null = null;
    private spinDuration = 3000; // 3 seconds of spinning
    private initialSpinSpeed = 50; // Start fast (50ms between updates)
    private finalSpinSpeed = 400; // End slow (400ms between updates)

    ngOnInit() {
        this.loadCharacterUpgrades();
        this.startRoulette();
    }

    ngOnDestroy() {
        this.stopSpinAnimation();
    }

    /**
     * Load upgrades specific to the current character
     */
    private loadCharacterUpgrades(): void {
        switch (this.characterId) {
            case 'proyecto-a':
                this.characterUpgrades = ProyectoASkills;
                break;
            case 'lars':
                this.characterUpgrades = LarsSkills;
                break;
            case 'proyecto-y':
                this.characterUpgrades = ProyectoYSkills;
                break;
            default:
                this.characterUpgrades = ProyectoASkills;
        }
    }

    /**
     * Start the roulette animation
     */
    private startRoulette(): void {
        this.isSpinning = true;
        this.showResult = false;

        // Pre-select the winner based on probability
        const winnerRarity = this.rollRarity();
        const availableOfRarity = this.characterUpgrades.filter(u => u.rarity === winnerRarity);

        if (availableOfRarity.length === 0) {
            // Fallback to any upgrade if no upgrades of that rarity exist
            this.selectedUpgrade = this.toRouletteUpgrade(
                this.characterUpgrades[Math.floor(Math.random() * this.characterUpgrades.length)]
            );
        } else {
            this.selectedUpgrade = this.toRouletteUpgrade(
                availableOfRarity[Math.floor(Math.random() * availableOfRarity.length)]
            );
        }

        // Create spinning array with mixed upgrades for visual effect
        this.spinningUpgrades = this.createSpinSequence();

        // Start spinning animation
        const startTime = Date.now();
        let currentSpeed = this.initialSpinSpeed;

        const spinTick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.spinDuration, 1);

            // Gradually slow down (ease-out)
            currentSpeed = this.initialSpinSpeed + (this.finalSpinSpeed - this.initialSpinSpeed) * Math.pow(progress, 2);

            // Advance to next item
            this.currentSpinIndex = (this.currentSpinIndex + 1) % this.spinningUpgrades.length;

            if (progress >= 1) {
                // Spinning complete - show the winner
                this.stopSpinAnimation();
                this.revealWinner();
            } else {
                // Schedule next tick
                this.spinInterval = setTimeout(spinTick, currentSpeed);
            }
        };

        this.spinInterval = setTimeout(spinTick, currentSpeed);
    }

    /**
     * Roll for rarity based on probabilities
     */
    private rollRarity(): Rarity {
        const roll = Math.random();

        if (roll < this.LEGENDARY_CHANCE) {
            return 'legendaria';
        } else if (roll < this.LEGENDARY_CHANCE + this.EPIC_CHANCE) {
            return 'epica';
        } else {
            return 'basica';
        }
    }

    /**
     * Create a sequence of upgrades for the spin animation
     * Includes the winner near the end for dramatic effect
     */
    private createSpinSequence(): RouletteUpgrade[] {
        const sequence: RouletteUpgrade[] = [];
        const allUpgrades = this.characterUpgrades.map(u => this.toRouletteUpgrade(u));

        // Add 15-20 random items before the winner
        const preWinnerCount = 15 + Math.floor(Math.random() * 6);
        for (let i = 0; i < preWinnerCount; i++) {
            const randomUpgrade = allUpgrades[Math.floor(Math.random() * allUpgrades.length)];
            sequence.push(randomUpgrade);
        }

        // Add the winner
        if (this.selectedUpgrade) {
            sequence.push(this.selectedUpgrade);
        }

        // Add a few more items after for smooth animation
        for (let i = 0; i < 3; i++) {
            const randomUpgrade = allUpgrades[Math.floor(Math.random() * allUpgrades.length)];
            sequence.push(randomUpgrade);
        }

        return sequence;
    }

    /**
     * Convert AbilityOption to RouletteUpgrade with display class
     */
    private toRouletteUpgrade(ability: AbilityOption): RouletteUpgrade {
        return {
            ...ability,
            displayClass: this.getRarityClass(ability.rarity)
        };
    }

    /**
     * Map rarity to CSS class
     */
    private getRarityClass(rarity: string): string {
        switch (rarity) {
            case 'basica':
                return 'common';
            case 'epica':
                return 'rare';
            case 'legendaria':
                return 'legendary';
            default:
                return 'common';
        }
    }

    /**
     * Stop the spin animation
     */
    private stopSpinAnimation(): void {
        if (this.spinInterval) {
            clearTimeout(this.spinInterval);
            this.spinInterval = null;
        }
    }

    /**
     * Reveal the winner with fanfare
     */
    private revealWinner(): void {
        this.isSpinning = false;
        this.showResult = true;
    }

    /**
     * Get current spinning upgrade for display
     */
    get currentSpinUpgrade(): RouletteUpgrade | null {
        if (this.spinningUpgrades.length === 0) return null;
        return this.spinningUpgrades[this.currentSpinIndex];
    }

    /**
     * Accept the selected upgrade
     */
    acceptUpgrade(): void {
        if (this.selectedUpgrade) {
            this.upgradeSelected.emit(this.selectedUpgrade);
        }
    }

    /**
     * Get display rarity text (translated)
     */
    getRarityText(rarity: string): string {
        switch (rarity) {
            case 'basica':
                return 'BASIC';
            case 'epica':
                return 'EPIC';
            case 'legendaria':
                return 'LEGENDARY';
            default:
                return rarity.toUpperCase();
        }
    }

    /**
     * Get icon for ability (default icons based on character)
     */
    getAbilityIcon(ability: AbilityOption): string {
        // You can customize icons per ability ID here
        switch (ability.rarity) {
            case 'legendaria':
                return '⭐';
            case 'epica':
                return '💎';
            default:
                return '🔹';
        }
    }
}
