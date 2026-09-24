import { Routes } from '@angular/router';

import { DenPage } from '@pages/den';

export const routes: Routes = [
  { path: '', component: DenPage, title: 'agent-den' },
  { path: '**', redirectTo: '' },
];
