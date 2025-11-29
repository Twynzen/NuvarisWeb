import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  stats: { hp: number, speed: number, damage: number };
  conceptPath: string;
  conceptFrames: number;
}

@Component({
  selector: 'app-main-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.scss']
})
export class MainMenuComponent implements OnInit, OnDestroy {
  @Output() characterSelected = new EventEmitter<string>();

  characters: Character[] = [
    {
      id: 'arcadio',
      name: 'PROJECT A (ARCADIO)',
      role: 'Bio-Tank',
      description: 'Heavily mutated biological experiment. High durability, slow movement.',
      stats: { hp: 100, speed: 30, damage: 80 },
      conceptPath: 'assets/arcadio/concept/arcadio-concept-',
      conceptFrames: 30
    },
    {
      id: 'lars',
      name: 'DIRECTOR LARS',
      role: 'Technocrat',
      description: 'The architect of the nightmare. Balanced stats with tech-based weaponry.',
      stats: { hp: 60, speed: 60, damage: 60 },
      conceptPath: 'assets/lars/concept/lars-concept-',
      conceptFrames: 30
    },
    {
      id: 'yurany',
      name: 'PROJECT Y (YURANY)',
      role: 'Spectral Assassin',
      description: 'Unstable molecular structure. Extremely fast but fragile.',
      stats: { hp: 30, speed: 100, damage: 90 },
      conceptPath: 'assets/proyecto-y/concept/y-concept-',
      conceptFrames: 30
    }
  ];

  selectedCharacter: Character | null = null;
  hoveredCharacter: Character | null = null;

  currentConceptFrame = '';
  private animationInterval: any;
  private currentFrameIndex = 1;

  ngOnInit() {
    this.hoveredCharacter = this.characters[0];
    this.startAnimation();
  }

  ngOnDestroy() {
    this.stopAnimation();
  }

  onHover(char: Character) {
    this.hoveredCharacter = char;
    this.currentFrameIndex = 1;
    this.stopAnimation();
    this.startAnimation();
  }

  onSelect(char: Character) {
    this.selectedCharacter = char;
    this.characterSelected.emit(char.id);
  }

  private startAnimation() {
    if (!this.hoveredCharacter) return;

    this.animationInterval = setInterval(() => {
      if (!this.hoveredCharacter) return;

      const frameNum = this.currentFrameIndex.toString().padStart(3, '0');
      this.currentConceptFrame = `${this.hoveredCharacter.conceptPath}${frameNum}.png`;

      this.currentFrameIndex++;
      if (this.currentFrameIndex > this.hoveredCharacter.conceptFrames) {
        this.currentFrameIndex = 1;
      }
    }, 100); // 10 FPS
  }

  private stopAnimation() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
  }
}
