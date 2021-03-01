import {Workbox, messageSW} from 'workbox-window';

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const wb = new Workbox('./sw.js');
    let registration;

    const showSkipWaitingPrompt = () => {
      const result = confirm('Update available: Do you want to update this app?');
      if (result) {
        wb.addEventListener('controlling', () => {
          window.location.reload();
        });

        if (registration && registration.waiting) {
          messageSW(registration.waiting, {type: 'SKIP_WAITING'});
        }
      }
    };

    wb.addEventListener('waiting', showSkipWaitingPrompt);
    wb.addEventListener('externalwaiting', showSkipWaitingPrompt);

    wb.register().then((r) => registration = r);
  }
}