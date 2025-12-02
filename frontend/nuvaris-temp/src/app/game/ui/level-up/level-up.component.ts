import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Upgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
}

@Component({
  selector: 'app-level-up',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './level-up.component.html',
  styleUrls: ['./level-up.component.scss']
})
export class LevelUpComponent implements OnInit {
  @Output() upgradeSelected = new EventEmitter<Upgrade>();

  upgrades: Upgrade[] = [];

  availableUpgrades: Upgrade[] = [
    { id: 'damage', name: 'Neural Damage Boost', description: 'Increases projectile damage by 20%', icon: '💥', rarity: 'common' },
    { id: 'speed', name: 'Synaptic Speed', description: 'Increases movement speed by 10%', icon: '⚡', rarity: 'common' },
    { id: 'multishot', name: 'Split Stream', description: 'Adds an additional projectile', icon: '🔱', rarity: 'legendary' },
    { id: 'health', name: 'Nanobot Repair', description: 'Heals 20 HP and increases Max HP', icon: '❤️', rarity: 'rare' },
    { id: 'fire_rate', name: 'Overclock', description: 'Increases fire rate by 15%', icon: '🔥', rarity: 'rare' }
  ];

  ngOnInit() {
    this.rollUpgrades();
  }

  rollUpgrades() {
    // Select 3 random upgrades
    const shuffled = [...this.availableUpgrades].sort(() => 0.5 - Math.random());
    this.upgrades = shuffled.slice(0, 3);
  }

  selectUpgrade(upgrade: Upgrade) {
    this.upgradeSelected.emit(upgrade);
  }
}
