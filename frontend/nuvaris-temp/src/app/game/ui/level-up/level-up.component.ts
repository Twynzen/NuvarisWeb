import { Component, EventEmitter, Output, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AbilityOption } from '../../abilities/ability-option';
import { ProyectoASkills } from '../../abilities/skills/proyecto-a.skills';
import { LarsSkills } from '../../abilities/skills/lars.skills';
import { ProyectoYSkills } from '../../abilities/skills/proyecto-y.skills';
import { getSkillIcon, SkillIcon } from '../../abilities/skill-icons';

type Rarity = 'basica' | 'epica' | 'legendaria';

interface RouletteUpgrade extends AbilityOption {
    displayClass: string;
    skillIcon: SkillIcon;
}

interface SlotLane {
    items: RouletteUpgrade[];
    currentIndex: number;
    isSpinning: boolean;
    winner: RouletteUpgrade | null;
    offset: number; // For smooth animation
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

    // Slot machine state
    lanes: SlotLane[] = [];
    finalSelection: RouletteUpgrade | null = null;
    showFinalResult = false;
    allLanesStopped = false;
    showWinnerReveal = false;
    winnerLaneIndex: number = -1;

    // Keyboard handler reference
    private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

    // Character upgrades pool
    private characterUpgrades: AbilityOption[] = [];

    // Probabilities: 63% basica, 32% epica, 5% legendaria
    private readonly BASIC_CHANCE = 0.63;
    private readonly EPIC_CHANCE = 0.32;
    private readonly LEGENDARY_CHANCE = 0.05;

    // Animation timing
    private spinIntervals: ReturnType<typeof setInterval>[] = [];
    private readonly ITEMS_PER_LANE = 8;
    private readonly SPIN_DURATION_BASE = 2000; // Base duration per lane
    private readonly LANE_STOP_DELAY = 600; // Delay between each lane stopping
    private readonly INITIAL_SPEED = 60; // ms between updates
    private readonly FINAL_SPEED = 300; // ms at the end

    constructor(private sanitizer: DomSanitizer) {}

    ngOnInit() {
        this.loadCharacterUpgrades();
        this.initializeSlotMachine();
        this.startAllLanes();
        this.setupKeyboardControls();
    }

    ngOnDestroy() {
        this.stopAllAnimations();
        this.removeKeyboardControls();
    }

    /**
     * Setup keyboard controls for skip/continue
     */
    private setupKeyboardControls(): void {
        this.keyboardHandler = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.handleSkip();
            }
        };
        window.addEventListener('keydown', this.keyboardHandler);
    }

    /**
     * Remove keyboard controls
     */
    private removeKeyboardControls(): void {
        if (this.keyboardHandler) {
            window.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
    }

    /**
     * Handle skip action based on current state
     */
    private handleSkip(): void {
        if (!this.allLanesStopped) {
            // Skip spinning animation - stop all lanes immediately
            this.stopAllAnimations();
            this.lanes.forEach(lane => {
                const winnerIndex = lane.items.findIndex(item => item === lane.winner);
                lane.currentIndex = winnerIndex;
                lane.isSpinning = false;
            });
            this.allLanesStopped = true;
            // Immediately select winner
            this.selectFinalWinner();
        } else if (this.showWinnerReveal && !this.showFinalResult) {
            // Skip reveal animation - go to final result
            this.showFinalResult = true;
        } else if (this.showFinalResult) {
            // Skip final result - apply upgrade immediately
            this.applyUpgrade();
        }
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
     * Initialize 3 slot lanes with random items
     */
    private initializeSlotMachine(): void {
        this.lanes = [];

        for (let i = 0; i < 3; i++) {
            // Roll rarity for this lane's winner
            const winnerRarity = this.rollRarity();
            const availableOfRarity = this.characterUpgrades.filter(u => u.rarity === winnerRarity);

            let winner: AbilityOption;
            if (availableOfRarity.length > 0) {
                winner = availableOfRarity[Math.floor(Math.random() * availableOfRarity.length)];
            } else {
                winner = this.characterUpgrades[Math.floor(Math.random() * this.characterUpgrades.length)];
            }

            const winnerUpgrade = this.toRouletteUpgrade(winner);

            // Create items array with random upgrades + winner at a specific position
            const items: RouletteUpgrade[] = [];
            const winnerPosition = this.ITEMS_PER_LANE - 2; // Winner near the end

            for (let j = 0; j < this.ITEMS_PER_LANE; j++) {
                if (j === winnerPosition) {
                    items.push(winnerUpgrade);
                } else {
                    const randomAbility = this.characterUpgrades[Math.floor(Math.random() * this.characterUpgrades.length)];
                    items.push(this.toRouletteUpgrade(randomAbility));
                }
            }

            this.lanes.push({
                items,
                currentIndex: 0,
                isSpinning: true,
                winner: winnerUpgrade,
                offset: 0
            });
        }
    }

    /**
     * Start all lanes spinning with staggered stop times
     */
    private startAllLanes(): void {
        this.lanes.forEach((lane, index) => {
            const stopDelay = this.SPIN_DURATION_BASE + (index * this.LANE_STOP_DELAY);
            this.startLaneSpin(lane, index, stopDelay);
        });
    }

    /**
     * Start spinning a single lane
     */
    private startLaneSpin(lane: SlotLane, laneIndex: number, totalDuration: number): void {
        const startTime = Date.now();
        let currentSpeed = this.INITIAL_SPEED;

        const spinTick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);

            // Ease-out: slow down as we approach the end
            currentSpeed = this.INITIAL_SPEED + (this.FINAL_SPEED - this.INITIAL_SPEED) * Math.pow(progress, 2);

            // Advance to next item
            lane.currentIndex = (lane.currentIndex + 1) % lane.items.length;
            lane.offset = 0;

            if (progress >= 1) {
                // Stop at winner position
                const winnerIndex = lane.items.findIndex(item => item === lane.winner);
                lane.currentIndex = winnerIndex;
                lane.isSpinning = false;
                this.checkAllLanesStopped();
            } else {
                // Schedule next tick
                const interval = setTimeout(spinTick, currentSpeed);
                this.spinIntervals.push(interval);
            }
        };

        const interval = setTimeout(spinTick, currentSpeed);
        this.spinIntervals.push(interval);
    }

    /**
     * Check if all lanes have stopped
     */
    private checkAllLanesStopped(): void {
        if (this.lanes.every(lane => !lane.isSpinning)) {
            this.allLanesStopped = true;

            // Select the final winner (random from the 3 winners)
            setTimeout(() => {
                this.selectFinalWinner();
            }, 800);
        }
    }

    /**
     * Select final winner from the 3 lane winners
     * Fase 1: Reveal winner among the 3 cards (winner highlighted, others fade)
     * Fase 2: Show final result card
     */
    private selectFinalWinner(): void {
        const winners = this.lanes.map(lane => lane.winner).filter(w => w !== null) as RouletteUpgrade[];
        const randomIndex = Math.floor(Math.random() * winners.length);
        this.finalSelection = winners[randomIndex];
        this.winnerLaneIndex = randomIndex;

        // Fase 1: Show winner reveal with all 3 cards visible
        this.showWinnerReveal = true;

        // Fase 2: After 2s, show the final big card
        setTimeout(() => {
            this.showFinalResult = true;
        }, 2000);

        // Fase 3: Auto-apply after showing final result
        setTimeout(() => {
            this.applyUpgrade();
        }, 4000);
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
     * Convert AbilityOption to RouletteUpgrade with display class and icon
     */
    private toRouletteUpgrade(ability: AbilityOption): RouletteUpgrade {
        return {
            ...ability,
            displayClass: this.getRarityClass(ability.rarity),
            skillIcon: getSkillIcon(ability.id, this.characterId)
        };
    }

    /**
     * Map rarity to CSS class
     */
    private getRarityClass(rarity: string): string {
        switch (rarity) {
            case 'basica':
                return 'basic';
            case 'epica':
                return 'epic';
            case 'legendaria':
                return 'legendary';
            default:
                return 'basic';
        }
    }

    /**
     * Stop all animations
     */
    private stopAllAnimations(): void {
        this.spinIntervals.forEach(interval => clearTimeout(interval));
        this.spinIntervals = [];
    }

    /**
     * Apply the selected upgrade
     */
    applyUpgrade(): void {
        if (this.finalSelection) {
            this.upgradeSelected.emit(this.finalSelection);
        }
    }

    /**
     * Get display rarity text
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
     * Get current item for a lane (visible in the slot)
     */
    getLaneCurrentItem(lane: SlotLane): RouletteUpgrade {
        return lane.items[lane.currentIndex];
    }

    /**
     * Get items around current for smooth scroll effect
     */
    getLaneVisibleItems(lane: SlotLane): RouletteUpgrade[] {
        const items: RouletteUpgrade[] = [];
        const total = lane.items.length;

        // Show 3 items: previous, current, next
        for (let i = -1; i <= 1; i++) {
            const index = (lane.currentIndex + i + total) % total;
            items.push(lane.items[index]);
        }

        return items;
    }

    /**
     * Sanitize SVG for rendering
     */
    getSafeSvg(skillIcon: SkillIcon): SafeHtml {
        const svgString = `<svg viewBox="${skillIcon.viewBox}" xmlns="http://www.w3.org/2000/svg">${skillIcon.svg}</svg>`;
        return this.sanitizer.bypassSecurityTrustHtml(svgString);
    }

    /**
     * Check if this lane's winner is the final selection
     */
    isWinnerLane(lane: SlotLane): boolean {
        return this.finalSelection !== null && lane.winner === this.finalSelection;
    }
}
