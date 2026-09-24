import { bootstrapApplication } from '@angular/platform-browser';

import { App, appConfig } from './app';

bootstrapApplication(App, appConfig).catch((error: unknown) => {
  // eslint-disable-next-line no-console -- bootstrap failure is the one place we must surface to the console
  console.error(error);
});
