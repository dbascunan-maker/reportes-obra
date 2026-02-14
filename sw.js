const CACHE_NAME = 'reportes-app-v3';
const ASSETS_TO_CACHE = [
    './index.html',
    './app.js',
    './manifest.json',
    'https://cdn.tailwindcss.com?plugins=forms,container-queries',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
    // Detail pages
    './detalle__fachada/code.html',
    './detalle__punto_de_acceso/code.html',
    './detalle__paneles_solares/code.html',
    './detalle__estructura/code.html',
    './detalle__canalización/code.html',
    './detalle__cableado/code.html',
    './detalle__aterrizaje/code.html',
    './detalle__inversor/code.html',
    './detalle__tablero/code.html',
    './detalle__automáticos/code.html',
    './detalle__bastidor/code.html',
    './detalle__señalética/code.html',
    './detalle__perfil_chile/code.html',
    './detalle__medición_a_tierra/code.html',
    './detalle__transformador/code.html'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Network first for API/Script calls, Cache first for assets
    if (event.request.url.includes('script.google.com')) {
        return; // Don't cache API calls
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
