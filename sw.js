const appName = 'mws-restaurant';
const staticCacheName = `${appName}-v3`;

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(staticCacheName).then((cache) => {
        return cache.addAll([
            '/',
            '/restaurant.html',
            '/css/responsive.css',
            '/css/styles.css',
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
            '/img/heart-true.png',
            '/img/heart-false.png',
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

/**
 * Background sync.
 */

const API_URL = 'http://localhost:1337';

const dbPromise = new Promise((resolve, reject) => {
    const request = self.indexedDB.open('restaurant-reviews', 3);
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (event.oldVersion < 1) {
            db.createObjectStore('restaurants', {
                keyPath: 'id'
            });
        }
        if (event.oldVersion < 2) {
            const store = db.createObjectStore('reviews', {
                keyPath: 'id'
            });
            store.createIndex('by_restaurant_id', 'restaurant_id');
        }
        if (event.oldVersion < 3) {
            db.createObjectStore('pending-reviews', {
                autoIncrement: true
            });
        }
    };
    request.onsuccess = () => {
        resolve(request.result);
    };
    request.onerror = reject;
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'sendPendingReviews') {
        event.waitUntil(sendPendingReviews());
    }
});

const sendPendingReviews = () => {
    return findFirstPendingReview().then((review) => {
        return postReview(review);
    }).then(() => {
        return deleteFirstPendingReview();
    }).then(() => {
        // Recursively loop through all of them
        return sendPendingReviews();
    }).catch(() => {
        console.log('done');
    });
};

const findFirstPendingReview = () => {
    return dbPromise.then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['pending-reviews'], 'readonly');
            const request = transaction.objectStore('pending-reviews').openCursor();
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    resolve(cursor.value);
                } else {
                    reject();
                }
            };
            request.onerror = reject;
        });
    });
};

const postReview = (review) => {
    return fetch(`${API_URL}/reviews`, {
        method: 'POST',
        body: JSON.stringify(review),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });
};

const deleteFirstPendingReview = () => {
    return dbPromise.then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['pending-reviews'], 'readwrite');
            const request = transaction.objectStore('pending-reviews').openCursor();
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    resolve(cursor.delete());
                } else {
                    reject();
                }
            };
            request.onerror = reject;
        });
    });
};
