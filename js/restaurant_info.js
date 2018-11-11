let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoiYmluZ2p1biIsImEiOiJjamlkbzd4ZzYwMWN1M3BteWwzMXhxMDUwIn0.kU11gEF83sRq9MzQeHLj2A',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
};
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id).then((restaurant) => {
      self.restaurant = restaurant;
      fillRestaurantHTML();
      callback(null, restaurant)
    }, (error) => {
      console.error(error);
    });
    DBHelper.getReviewsByRestaurantId(id).then((reviews) => {
      self.reviews = reviews;
      fillReviewsHTML();
    }, (error) => {
      console.error(error);
    });
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Feature picture of ${restaurant.name}`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill heart
  fillFavoriteHTML();

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
};

fillFavoriteHTML = () => {
  const restaurant = self.restaurant;
  const heart = document.getElementById('restaurant-heart');
  heart.src = restaurant.is_favorite ? 'img/heart-true.png' : 'img/heart-false.png';
  heart.alt = restaurant.is_favorite ? `Remove ${restaurant.name} from favorites` : `Add ${restaurant.name} to favorites`;
};

/**
 * Change is_favorite from true to false, or from false to true.
 */
toggleFavorite = () => {
  const restaurant = self.restaurant;
  restaurant.is_favorite = !restaurant.is_favorite;
  fillFavoriteHTML();
  return DBHelper.setRestaurantFavorite(restaurant.id, restaurant.is_favorite);
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = () => {
  const reviews = self.reviews;
  const list = document.getElementById('reviews-list');
  list.innerHTML = '';
  if (reviews) {
    reviews.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }).forEach(review => {
      list.appendChild(createReviewHTML(review));
    });
  } else {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    list.appendChild(noReviews);
  }
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');

  const date = document.createElement('div');
  date.className = 'review-date';
  date.innerHTML = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '';
  li.appendChild(date);

  const name = document.createElement('h4');
  name.innerHTML = review.name;
  li.appendChild(name);

  const rating = document.createElement('p');
  rating.className = 'review-rating';
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.className = 'review-content';
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

submitReview = () => {
  const name = document.getElementById('reviews-add-name').value;
  const rating = document.getElementById('reviews-add-rating').value;
  const comments = document.getElementById('reviews-add-comments').value;
  if (name && rating && comments) {
    DBHelper.createReview(self.restaurant.id, name, rating, comments).then(() => {
      document.getElementById('reviews-add-name').value = '';
      document.getElementById('reviews-add-rating').value = 5;
      document.getElementById('reviews-add-comments').value = '';
      const reviews = self.reviews;
      reviews.push({
        name, rating, comments, createdAt: Date.now()
      });
      fillReviewsHTML();
    });
  } else {
    alert('All fields are required.');
  }
  return false;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const ul = breadcrumb.getElementsByTagName('ul')[0];
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  ul.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
