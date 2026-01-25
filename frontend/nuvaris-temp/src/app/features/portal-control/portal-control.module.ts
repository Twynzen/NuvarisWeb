/**
 * PORTAL CONTROL - Module
 * Lazy-loaded module for the Portal Control game
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PortalControlComponent } from './portal-control.component';

const routes: Routes = [
  {
    path: '',
    component: PortalControlComponent,
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    PortalControlComponent,
  ]
})
export class PortalControlModule { }
