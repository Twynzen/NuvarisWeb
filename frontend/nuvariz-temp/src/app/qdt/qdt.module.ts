import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { QdtPage } from './qdt.page';

const routes: Routes = [
    {
        path: '',
        component: QdtPage
    }
];

@NgModule({
    imports: [
        CommonModule,
        IonicModule,
        RouterModule.forChild(routes),
        QdtPage
    ]
})
export class QdtModule { }
