const appName = 'mws-restaurant';
const staticCacheName = `${appName}-v3`;

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(staticCacheName).then((cache) => {
        return cache.addAll([
            '/',
            '/restaurant.html',
            '/css/responsive.css',
            '/css/styles.css',
            '/data/restaurants.json',
            '/img/1.jpg',
            '/img/2.jpg',
            '/img/3.jpg',
            '/img/4.jpg',
            '/img/5.jpg',
            '/img/6.jpg',
            '/img/7.jpg',
            '/img/8.jpg',
            '/img/9.jpg',
            '/img/10.jpg',
            '/js/dbhelper.js',
            '/js/main.js',
            '/js/restaurant_info.js'
        ]);
    }));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.filter((cacheName) => {
            return cacheName.startsWith(appName) &&
                cacheName !== staticCacheName;
        }).map((cacheName) => {
            return caches.delete(cacheName);
        }));
    }));
});

self.addEventListener('fetch', (event) => {
    let requestUrl = new URL(event.request.url);
    if (requestUrl.pathname.startsWith('/restaurant.html')) {
        requestUrl.search = '';
    }
    event.respondWith(caches.match(requestUrl).then((response) => {
        return response || fetch(event.request);
    }));
});
