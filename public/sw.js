/* guessIo web push worker. Shows a notification for each push and opens the
   page it names when tapped. Payload: { title, body, url, type }. */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || 'guessIo';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: data.type || 'guessio',
      data: { url: data.url || '/dashboard' },
    })
  );
});

// Only same-origin paths are ever opened, whatever the payload says.
function safeTarget(raw) {
  try {
    const target = new URL(raw || '/dashboard', self.location.origin);
    return target.origin === self.location.origin ? target.href : new URL('/dashboard', self.location.origin).href;
  } catch {
    return new URL('/dashboard', self.location.origin).href;
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = safeTarget(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
