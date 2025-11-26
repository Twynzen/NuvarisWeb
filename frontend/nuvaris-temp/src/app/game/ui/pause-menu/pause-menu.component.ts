import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pause-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pause-menu.component.html',
  styleUrls: ['./pause-menu.component.scss']
})
export class PauseMenuComponent {
  @Output() resume = new EventEmitter<void>();
  @Output() quit = new EventEmitter<void>();

  onResume() {
    this.resume.emit();
  }

  onQuit() {
    this.quit.emit();
  }
}
