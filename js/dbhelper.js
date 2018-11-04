/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    return 'http://localhost:1337/restaurants';
  }

  static get dbPromise() {
    if (!DBHelper._dbPromise && window.indexedDB) {
      DBHelper._dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open('restaurant-reviews', 1);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          db.createObjectStore('restaurants', {
            keyPath: 'id'
          });
        };
        request.onsuccess = (event) => {
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
      xhr.open('GET', DBHelper.DATABASE_URL);
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
          store.add(restaurant);
        });
      });
    }
  }

  static fetchRestaurants() {
    return DBHelper.getRestaurantsFromCache().catch(() => {
      return DBHelper.getRestaurantsFromServer().then((restaurants) => {
        DBHelper.saveRestaurantsToCache(restaurants);
        return restaurants;
      });
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

