const CACHE_NAME = 'solarscan-v2';
const ASSETS = [
  './',
  './index.html',
  './captura_de_paneles_-_nueva_paleta/code.html',
  './historial_de_capturas/code.html',
  './manifest.json',
  './logo_sustentambiente.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
