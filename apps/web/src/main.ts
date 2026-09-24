import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((error: unknown) => {
  // eslint-disable-next-line no-console -- bootstrap failure is the one place we must surface to the console
  console.error(error);
});
