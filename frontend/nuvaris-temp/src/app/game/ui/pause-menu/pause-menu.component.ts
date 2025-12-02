import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-pause-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pause-menu.component.html',
  styleUrls: ['./pause-menu.component.scss']
})
export class PauseMenuComponent implements OnInit {
  @Output() resume = new EventEmitter<void>();
  @Output() quit = new EventEmitter<void>();

  // Volume controls
  masterVolume = 100;
  musicVolume = 30;
  sfxVolume = 70;

  // Mute state
  isMuted = false;

  constructor(private audioService: AudioService) {}

  ngOnInit(): void {
    // Load current volume settings
    this.masterVolume = Math.round(this.audioService.getMasterVolume() * 100);
    this.musicVolume = Math.round(this.audioService.getMusicVolume() * 100);
    this.sfxVolume = Math.round(this.audioService.getSFXVolume() * 100);
    this.isMuted = this.audioService.isSoundMuted();
  }

  onResume(): void {
    this.audioService.play('ui-select');
    this.resume.emit();
  }

  onQuit(): void {
    this.audioService.play('ui-select');
    this.quit.emit();
  }

  onMasterVolumeChange(value: number): void {
    this.masterVolume = value;
    this.audioService.setMasterVolume(value / 100);
  }

  onMusicVolumeChange(value: number): void {
    this.musicVolume = value;
    this.audioService.setMusicVolume(value / 100);
  }

  onSFXVolumeChange(value: number): void {
    this.sfxVolume = value;
    this.audioService.setSFXVolume(value / 100);
    // Play a test sound
    this.audioService.play('ui-hover');
  }

  toggleMute(): void {
    this.isMuted = this.audioService.toggleMute();
  }
}
