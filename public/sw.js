const CACHE_PREFIX = 'logs-cache-';
const CACHE_NAME = `${CACHE_PREFIX}network-only-v1`;

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => (
      Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) || key.startsWith('yuru-d-cache-'))
          .map(key => caches.delete(key))
      )
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(self.registration.scope)
      }
    })
  );
});
