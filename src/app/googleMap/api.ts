import axios from 'axios';

interface RestaurantData {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const fetchRestaurantData = (address: string) => {
  return axios.get(`/api/restaurants?address=${encodeURIComponent(address)}`)
    .then(response => {
      console.log('Fetched restaurant data:', response.data);
      return response.data;
    })
    .catch(error => {
      console.error('Error fetching restaurant data:', error);
      throw error;
    });
};

export const postRestaurantData = (restaurantData: RestaurantData) => {
  return axios.post('/api/restaurants', restaurantData)
    .then(response => {
      console.log('Restaurant information inserted successfully:', response.data);
      return response.data;
    })
    .catch(error => {
      console.error('Error inserting restaurant information:', error);
      throw error;
    });
};
