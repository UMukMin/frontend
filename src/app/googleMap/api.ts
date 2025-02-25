import axios from 'axios';
import { RestaurantData } from './types';

export const postRestaurantLocation = async (restaurantData: RestaurantData) => {
  console.log(restaurantData);
  try {
    const response = await axios.post('/api/restaurants', restaurantData);
    return response.data;
  } catch (error) {
    console.error('Error saving restaurant Data:', error);
    throw error;
  }
};
