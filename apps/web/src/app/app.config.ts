import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { AgentAlerts } from '@features/agent-alerts';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Alerts listen for the whole app lifetime, whatever page is open.
    provideAppInitializer(() => inject(AgentAlerts).start()),
  ],
};
