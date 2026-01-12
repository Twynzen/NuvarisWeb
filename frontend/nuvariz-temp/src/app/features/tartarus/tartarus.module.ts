import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { TartarusComponent } from './tartarus.component';

const routes: Routes = [
  {
    path: '',
    component: TartarusComponent
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    TartarusComponent // Importar standalone component
  ]
})
export class TartarusModule { }
