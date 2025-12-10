import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'qdt',
    loadChildren: () => import('./qdt/qdt.module').then( m => m.QdtModule)
  },
  {
    path: 'map-editor',
    loadChildren: () => import('./map-editor/map-editor.module').then( m => m.MapEditorModule)
  },
  {
    path: 'tartarus-prime',
    loadChildren: () => import('./features/tartarus/tartarus.module').then( m => m.TartarusModule)
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
