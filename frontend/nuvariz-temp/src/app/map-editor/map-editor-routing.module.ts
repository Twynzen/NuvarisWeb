import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapEditorPage } from './map-editor.page';

const routes: Routes = [
  {
    path: '',
    component: MapEditorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MapEditorRoutingModule {}
