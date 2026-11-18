// La Réserve PTG : service worker (consultation hors ligne)
// Changer la version à chaque mise en ligne pour forcer la mise à jour.
const CACHE = 'reserve-v4';
const SHELL = ['./', './index.html', './manifest.json', './logo.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Base de données et connexion Google : toujours en direct
  if (/firebaseio\.com|firebasedatabase\.app|identitytoolkit|securetoken|firebaseapp\.com|accounts\.google\.com|apis\.google\.com/.test(url.hostname + url.pathname)) return;

  // Page de l'appli : réseau d'abord (pour avoir la dernière version), cache si hors ligne
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Polices, SDK Firebase, icônes : cache d'abord, mise à jour en arrière-plan
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
