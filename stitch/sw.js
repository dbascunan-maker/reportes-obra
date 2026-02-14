const CACHE_NAME = 'reportes-app-v1';
const ASSETS_TO_CACHE = [
    './index.html',
    './app.js',
    './manifest.json',
    'https://cdn.tailwindcss.com?plugins=forms,container-queries',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
    // Add detail pages here if needed, but 'listado' is start path
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
