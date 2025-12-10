import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'game',
    loadComponent: () => import('./game/components/phaser-game/phaser-game.component').then(m => m.PhaserGameComponent)
  },
  {
    path: 'tartarus-prime',
    loadComponent: () => import('./features/tartarus/tartarus.component').then(m => m.TartarusComponent)
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
