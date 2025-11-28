import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MapEditorRoutingModule } from './map-editor-routing.module';
import { MapEditorPage } from './map-editor.page';
import { EditorViewportComponent } from './components/editor-viewport/editor-viewport.component';

@NgModule({
  imports: [
    CommonModule,
    MapEditorRoutingModule,
    // Standalone components
    EditorViewportComponent
  ],
  declarations: [
    MapEditorPage
  ]
})
export class MapEditorModule {}
