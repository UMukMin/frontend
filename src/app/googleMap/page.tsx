'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchRestaurantData, postRestaurantData } from './api';

declare global {
  interface Window {
    initMap: () => void;
  }
}

const GoogleMapPage: React.FC = () => {
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [reviews, setReviews] = useState<{ rating: number; comment: string }[]>([]);

  useEffect(() => {
    if (isMapLoaded) return;

    window.initMap = () => {
      const defaultPosition = { lat: 37.5665, lng: 126.9780 }; // 기본 서울 중심 좌표
      const map = new google.maps.Map(document.getElementById('map') as HTMLElement, {
        center: defaultPosition,
        zoom: 12,
      });

      // 현재 위치 가져오기
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            setCurrentPosition(userLocation);
            map.setCenter(userLocation); // 지도 중심을 현재 위치로 설정

            // 사용자 위치에 마커 추가
            new google.maps.Marker({
              map,
              position: userLocation,
              title: '현재 위치',
              icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png', // 사용자 위치를 파란색 마커로 표시
              },
            });
          },
          (error) => {
            console.error('위치 정보를 가져올 수 없습니다:', error);
          }
        );
      } else {
        console.warn('Geolocation을 지원하지 않는 브라우저입니다.');
      }

      const input = document.getElementById('pac-input') as HTMLInputElement;
      const searchBox = new google.maps.places.SearchBox(input);
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

      let markers: google.maps.Marker[] = [];

      searchBox.addListener('places_changed', () => {
        const places = searchBox.getPlaces();
        if (!places || places.length === 0) return;

        markers.forEach((marker) => marker.setMap(null));
        markers = [];

        const bounds = new google.maps.LatLngBounds();
        places.forEach((place) => {
          if (!place.geometry || !place.geometry.location) return;

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
          fetchRestaurantData(place.formatted_address || '');
        });

        map.fitBounds(bounds);

        if (selectedPlace && selectedPlace.formatted_address) {
          const address = selectedPlace.formatted_address;
          const message = `선택한 주소: ${address} 입니다. 레스토랑 정보를 등록하시겠습니까?`;
          if (window.confirm(message)) { // confirm 알럿 창 사용 (확인/취소 버튼 제공)
            // 사용자가 "확인" 버튼을 클릭했을 때 post 요청
            if (selectedPlace.name && selectedPlace.geometry && selectedPlace.geometry.location) {
              const restaurantData = {
                name: selectedPlace.name,
                address: selectedPlace.formatted_address,
                lat: selectedPlace.geometry.location.lat(),
                lng: selectedPlace.geometry.location.lng(),
              };

              postRestaurantData(restaurantData)
                .then((response) => {
                  console.log('Restaurant registered from alert:', response.data);
                  alert('레스토랑 정보가 등록되었습니다!'); // 등록 성공 알림 (선택 사항)
                })
                .catch((error) => {
                  console.error('Error registering restaurant from alert:', error);
                  alert('레스토랑 정보 등록에 실패했습니다.'); // 등록 실패 알림 (선택 사항)
                });
            } else {
              console.error('Selected place 정보가 불충분합니다.');
              alert('선택한 장소에 이름 또는 위치 정보가 없습니다.'); // 정보 부족 알림 (선택 사항)
            }
          } else {
            // 사용자가 "취소" 버튼을 클릭했을 때 (아무 동작 안함)
            console.log('레스토랑 등록 취소'); // 취소 로그 (선택 사항)
          }
        }
      });

      setIsMapLoaded(true);
    };

    if (!window.google || !window.google.maps) {
      const scriptId = 'google-maps-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ko&callback=initMap`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        script.onload = () => {
          if (window.initMap) {
            window.initMap();
          }
        };

        script.onerror = () => {
          console.error('Google Maps 스크립트를 로드하는 중 오류 발생!');
        };
      }
    } else {
      window.initMap();
    }
  }, [isMapLoaded]);

  const handleRegister = () => {
    if (selectedPlace && selectedPlace.geometry && selectedPlace.geometry.location) {
      if (selectedPlace.name && selectedPlace.formatted_address) {
        const restaurantData = {
          name: selectedPlace.name,
          address: selectedPlace.formatted_address,
          lat: selectedPlace.geometry.location.lat(),
          lng: selectedPlace.geometry.location.lng(),
        };

        postRestaurantData(restaurantData)
          .then((response) => {
            console.log('Restaurant registered:', response.data);
          })
          .catch((error) => {
            console.error('Error registering restaurant:', error);
          });
      } else {
        console.error('Selected place does not have a name or address.');
      }
    }
  };

  const handleReviewSubmit = (rating: number, comment: string) => {
    const newReview = { rating, comment };
    setReviews([...reviews, newReview]);
    // Optionally, send the review to the server
    // postReviewData(selectedPlace.formatted_address || '', newReview);
  };

  return (
    <div>
      <h1>Google Map</h1> <Link href="/">Home</Link>
      <input 
        id="pac-input" 
        type="text" 
        placeholder="검색" 
        style={{ marginBottom: '10px', padding: '5px', width: '300px' }} 
      />
      <div id="map" style={{ height: '660px', width: '540px' }}></div>
      {selectedPlace && (
        <>
          <button onClick={handleRegister} style={{ marginTop: '10px', padding: '10px' }}>
            Register Restaurant
          </button>
          <div style={{ marginTop: '20px' }}>
            <h2>Leave a Review</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const rating = parseInt((e.target as any).rating.value);
              const comment = (e.target as any).comment.value;
              handleReviewSubmit(rating, comment);
            }}>
              <label>
                Rating:
                <input type="number" name="rating" min="1" max="5" required />
              </label>
              <br />
              <label>
                Comment:
                <textarea name="comment" required></textarea>
              </label>
              <br />
              <button type="submit">Submit Review</button>
            </form>
            <h3>Reviews</h3>
            <ul>
              {reviews.map((review, index) => (
                <li key={index}>
                  <strong>Rating:</strong> {review.rating} <br />
                  <strong>Comment:</strong> {review.comment}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default GoogleMapPage;
