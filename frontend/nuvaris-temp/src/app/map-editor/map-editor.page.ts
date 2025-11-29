import { Component } from '@angular/core';

@Component({
  selector: 'app-map-editor',
  standalone: false,
  template: `
    <div class="map-editor-page">
      <app-editor-viewport></app-editor-viewport>
    </div>
  `,
  styles: [`
    .map-editor-page {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
  `]
})
export class MapEditorPage {}
