/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get API_URL() {
    return 'http://localhost:1337';
  }

  static get dbPromise() {
    if (!DBHelper._dbPromise && window.indexedDB) {
      DBHelper._dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open('restaurant-reviews', 3);
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
            const store = db.createObjectStore('pending-reviews', {
              autoIncrement: true
            });
          }
        };
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = reject;
      });
    }
    return DBHelper._dbPromise;
  }

  static getRestaurantsFromCache() {
    return new Promise((resolve, reject) => {
      const dbPromise = DBHelper.dbPromise;
      if (dbPromise) {
        dbPromise.then((db) => {
          const transaction = db.transaction(['restaurants'], 'readonly');
          const store = transaction.objectStore('restaurants');
          const request = store.getAll();
          request.onsuccess = () => {
            const restaurants = request.result;
            if (restaurants.length > 0) {
              resolve(request.result);
            } else {
              reject();
            }
          };
          request.onerror = reject;
        });
      } else {
        reject();
      }
    });
  }

  static getRestaurantsFromServer() {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${DBHelper.API_URL}/restaurants`);
      xhr.onload = () => {
        if (xhr.status === 200) { // Got a success response from server!
          const restaurants = JSON.parse(xhr.responseText);
          resolve(restaurants);
        } else { // Oops!. Got an error from server.
          reject(`Request failed. Returned status of ${xhr.status}`);
        }
      };
      xhr.send();
    });
  }

  static saveRestaurantsToCache(restaurants) {
    const dbPromise = DBHelper.dbPromise;
    if (dbPromise) {
      dbPromise.then((db) => {
        const transaction = db.transaction(['restaurants'], 'readwrite');
        const store = transaction.objectStore('restaurants');
        restaurants.forEach((restaurant) => {
          store.put(restaurant);
        });
      });
    }
  }

  static saveRestaurantToCache(restaurant) {
    const dbPromise = DBHelper.dbPromise;
    if (dbPromise && restaurant && restaurant.id) {
      dbPromise.then((db) => {
        const transaction = db.transaction(['restaurants'], 'readwrite');
        const store = transaction.objectStore('restaurants');
        store.put(restaurant);
      });
    }
  }

  static fetchRestaurants() {
    return DBHelper.getRestaurantsFromServer().catch(() => {
      return DBHelper.getRestaurantsFromCache();
    }).then((restaurants) => {
      DBHelper.saveRestaurantsToCache(restaurants);
      return restaurants;
    });
  }

  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    return DBHelper.fetchRestaurants().then((restaurants) => {
      let filtered = restaurants;
      if (cuisine !== 'all') { // filter by cuisine
        filtered = filtered.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood !== 'all') { // filter by neighborhood
        filtered = filtered.filter(r => r.neighborhood == neighborhood);
      }
      return filtered;
    });
  }

  static fetchRestaurantById(id) {
    return DBHelper.fetchRestaurants().then((restaurants) => {
      const restaurant = restaurants.find(r => r.id == id);
      if (restaurant) { // Got the restaurant
        return restaurant;
      } else { // Restaurant does not exist in the database
        throw 'Restaurant does not exist';
      }
    });
  }

  static fetchNeighborhoods() {
    return DBHelper.fetchRestaurants().then((restaurants) => {
      // Get all neighborhoods from all restaurants
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
      // Remove duplicates from neighborhoods
      const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) === i);
      return uniqueNeighborhoods;
    });
  }

  static fetchCuisines() {
    return DBHelper.fetchRestaurants().then((restaurants) => {
      // Get all cuisines from all restaurants
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
      // Remove duplicates from cuisines
      const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) === i);
      return uniqueCuisines;
    });
  }

  static setRestaurantFavorite(restaurantId, isFavorite = false) {
    return new Promise((resolve, reject) => {
      if (restaurantId) {
        const url = `${DBHelper.API_URL}/restaurants/${restaurantId}/?is_favorite=${isFavorite}`;
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        xhr.onload = () => {
          if (xhr.status === 200) { // Got a success response from server!
            const response = JSON.parse(xhr.responseText);
            response.is_favorite = response.is_favorite === 'true';
            DBHelper.saveRestaurantToCache(response);
            resolve(response);
          } else {
            reject(`Request failed. Returned status of ${xhr.status}`);
          }
        };
        xhr.send();
      } else {
        reject('Invalid restaurant ID');
      }
    });
  }

  static getReviewsFromServerByRestaurantId(restaurantId) {
    return new Promise((resolve, reject) => {
      if (restaurantId) {
        const url = `${DBHelper.API_URL}/reviews/?restaurant_id=${restaurantId}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.onload = () => {
          if (xhr.status === 200) { // Got a success response from server!
            const reviews = JSON.parse(xhr.responseText);
            DBHelper.saveReviewsToCache(reviews);
            resolve(reviews);
          } else {
            reject(`Request failed. Returned status of ${xhr.status}`);
          }
        };
        xhr.send();
      } else {
        reject('Invalid restaurant ID');
      }
    });
  }

  static saveReviewsToCache(reviews) {
    const dbPromise = DBHelper.dbPromise;
    if (dbPromise && restaurant && restaurant.id) {
      dbPromise.then((db) => {
        const transaction = db.transaction(['reviews'], 'readwrite');
        const store = transaction.objectStore('reviews');
        reviews.forEach((review) => {
          store.put(review);
        });
      });
    }
  }

  static getReviewsFromCacheByRestaurantId(restaurantId) {
    return new Promise((resolve, reject) => {
      const dbPromise = DBHelper.dbPromise;
      if (dbPromise && restaurantId) {
        dbPromise.then((db) => {
          const transaction = db.transaction(['reviews'], 'readonly');
          const store = transaction.objectStore('reviews');
          const request = store.index('by_restaurant_id').getAll(restaurantId);
          request.onsuccess = () => {
            resolve(request.result);
          };
          request.onerror = reject;
        });
      } else {
        reject();
      }
    });
  }

  static getReviewsByRestaurantId(restaurantId) {
    return DBHelper.getReviewsFromServerByRestaurantId(restaurantId).catch(() => {
      return DBHelper.getReviewsFromCacheByRestaurantId(restaurantId);
    }).then((reviews) => {
      DBHelper.saveReviewsToCache(reviews);
      return reviews;
    });
  }

  static createReview(restaurantId, name, rating, comments) {
    return new Promise((resolve, reject) => {
      if (restaurantId && name && rating && comments) {
        const review = { restaurant_id: restaurantId, name, rating, comments };
        if (navigator.serviceWorker) {
          resolve(DBHelper.savePendingReviewToDB(review).then(() => {
            return navigator.serviceWorker.ready;
          }).then((swRegistration) => {
            return swRegistration.sync.register('sendPendingReviews');
          }));
        } else {
          resolve(DBHelper.postReview(review));
        }
      } else {
        reject('Invalid data');
      }
    });
  }

  static postReview(review) {
    return new Promise((resolve, reject) => {
      const url = `${DBHelper.API_URL}/reviews`;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) { // Got a success response from server!
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } else {
          reject(`Request failed. Returned status of ${xhr.status}`);
        }
      };
      xhr.send(JSON.stringify(review));
    });
  }

  static savePendingReviewToDB(review) {
    const dbPromise = DBHelper.dbPromise;
    if (dbPromise && review) {
      return dbPromise.then((db) => {
        const transaction = db.transaction(['pending-reviews'], 'readwrite');
        const store = transaction.objectStore('pending-reviews');
        store.add(review);
      });
    } else {
      return Promise.reject();
    }
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

/**
 * Register Service Worker
 */
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('/sw.js');
}
