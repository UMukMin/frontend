'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Add this line to import the Google Maps types
/// <reference types="@types/google.maps" />

const GoogleMapPage: React.FC = () => {
  const [selectedPlace, setSelectedPlace] = useState <google.maps.places.PlaceResult | null>(null);

  useEffect(() => {
    const initMap = () => {
      const map = new google.maps.Map(document.getElementById('map') as HTMLElement, {
        center: { lat: 37.5665, lng: 126.9780 }, // 서울의 위도와 경도
        zoom: 12,
      });

      const input = document.getElementById('pac-input') as HTMLInputElement;
      const searchBox = new google.maps.places.SearchBox(input);
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

      let markers: google.maps.Marker[] = [];

      map.addListener('bounds_changed', () => {
        searchBox.setBounds(map.getBounds() as google.maps.LatLngBounds);
      });

      searchBox.addListener('places_changed', () => {
        const places = searchBox.getPlaces();

        if (places?.length === 0) {
          return;
        }

        markers.forEach((marker) => marker.setMap(null));
        markers = [];

        const bounds = new google.maps.LatLngBounds();
        places?.forEach((place) => {
          if (!place.geometry || !place.geometry.location) {
            return;
          }

          const marker = new google.maps.Marker({
            map,
            position: place.geometry.location,
          });
          markers.push(marker);

          if (place.geometry.viewport) {
            bounds.union(place.geometry.viewport);
          } else {
            bounds.extend(place.geometry.location);
          }

          setSelectedPlace(place);
        });
        map.fitBounds(bounds);
      });
    };

    if (!window.google) {
      const script = document.createElement('script');
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ko&callback=initMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      script.onload = () => {
        initMap();
      };
    } else {
      initMap();
    }
  }, []);

  const handleRegister = () => {
    if (selectedPlace && selectedPlace.geometry && selectedPlace.geometry.location) {
      const restaurantData = {
        name: selectedPlace.name,
        address: selectedPlace.formatted_address,
        lat: selectedPlace.geometry.location.lat(),
        lng: selectedPlace.geometry.location.lng(),
        // Add other necessary fields here
      };

      axios.post('/api/restaurants', restaurantData)
        .then(response => {
          console.log('Restaurant information inserted successfully:', response.data);
        })
        .catch(error => {
          console.error('Error inserting restaurant information:', error);
        });
    }
  };

  return (
    <div>
      <h1>Google Map</h1>
      <input 
        id="pac-input" 
        type="text" 
        placeholder="검색" 
        style={{ marginBottom: '10px', padding: '5px', width: '300px' }} 
      />
      <div id="map" style={{ height: '660px', width: '540px' }}></div>
      {selectedPlace && (
        <button onClick={handleRegister} style={{ marginTop: '10px', padding: '10px' }}>
          Register Restaurant
        </button>
      )}
    </div>
  );
};

export default GoogleMapPage;
