import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { NuvarisIntroComponent } from '../game/ui/nuvaris-intro/nuvaris-intro.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    NuvarisIntroComponent,
    CommonModule
  ],
})
export class HomePage {
  constructor(private router: Router) { }

  // Called when user presses any key or clicks on Nuvaris intro
  onNuvarisContinue() {
    this.router.navigate(['/qdt']);
  }
}
