"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';

interface LocationInfo {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface RegisteredPlace extends LocationInfo {
  id?: number;  
  isRegistered?: boolean;  
}

type Language = 'ko' | 'en' | 'ja';

const GoogleMapContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const selectedMarkerRef = useRef<google.maps.Marker | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isFirstUpdate = useRef(true);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('ko');
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const [searchText, setSearchText] = useState(() => {
    const initialQuery = searchParams.get('q');
    return initialQuery ? DOMPurify.sanitize(decodeURIComponent(initialQuery)) : '';
  });

  const updateMarkerPosition = useCallback((position: GeolocationPosition) => {
    const userLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    const heading = position.coords.heading;

    if (!markerRef.current && mapRef.current) {
      const locationIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#4285F4',
        fillOpacity: 1,
        scale: 8,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      };

      markerRef.current = new google.maps.Marker({
        position: userLocation,
        map: mapRef.current,
        icon: locationIcon,
        title: "현재 위치",
        clickable: false,
        zIndex: 1
      });
    } else if (markerRef.current) {
      const animationDuration = 200;
      const start = markerRef.current.getPosition();
      if (!start) return;

      const startTime = Date.now();

      const animate = () => {
        if (!markerRef.current) return;

        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);

        const lat = start.lat() + (userLocation.lat - start.lat()) * progress;
        const lng = start.lng() + (userLocation.lng - start.lng()) * progress;
        const newPos = new google.maps.LatLng(lat, lng);

        markerRef.current.setPosition(newPos);

        if (heading !== null && heading !== undefined) {
          const currentIcon = markerRef.current.getIcon() as google.maps.Symbol;
          const updatedIcon = {
            ...currentIcon,
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            rotation: heading,
            scale: 8
          };
          markerRef.current.setIcon(updatedIcon);
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }

    if (isFirstUpdate.current && mapRef.current) {
      mapRef.current.setCenter(userLocation);
      mapRef.current.setZoom(17);
      isFirstUpdate.current = false;
    }
  }, []);

  const trackUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation을 지원하지 않는 브라우저입니다.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      updateMarkerPosition,
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("위치 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("위치 정보를 사용할 수 없습니다.");
            break;
          case error.TIMEOUT:
            setLocationError("위치 정보를 가져오는 데 시간이 초과되었습니다.");
            break;
          default:
            setLocationError("알 수 없는 오류가 발생했습니다.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0, 
        timeout: 5000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [updateMarkerPosition]);

  const getAddressFromLatLng = useCallback(async (latLng: google.maps.LatLng) => {
    const geocoder = new google.maps.Geocoder();
    const placesService = new google.maps.places.PlacesService(mapRef.current!);
    
    try {
      const response = await geocoder.geocode({ location: latLng });
      if (response.results[0]) {
        const request: google.maps.places.PlaceSearchRequest = {
          location: latLng,
          radius: 50, 
          type: 'establishment' 
        };

        placesService.nearbySearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const nearestPlace = results[0];
            
            placesService.getDetails(
              {
                placeId: nearestPlace.place_id!,
                fields: ['name', 'formatted_address', 'geometry']
              },
              (place, detailStatus) => {
                if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                  const locationInfo: LocationInfo = {
                    name: place.name || response.results[0].address_components[0].long_name,
                    address: place.formatted_address || response.results[0].formatted_address,
                    lat: latLng.lat(),
                    lng: latLng.lng()
                  };

                  setSelectedLocation(locationInfo);
                  setIsSidebarOpen(true);

                  if (selectedMarkerRef.current) {
                    selectedMarkerRef.current.setMap(null);
                  }
                  selectedMarkerRef.current = new google.maps.Marker({
                    position: latLng,
                    map: mapRef.current,
                    title: locationInfo.name,
                    animation: google.maps.Animation.DROP,
                    clickable: false
                  });
                } else {
                  const locationInfo: LocationInfo = {
                    name: response.results[0].address_components[0].long_name,
                    address: response.results[0].formatted_address,
                    lat: latLng.lat(),
                    lng: latLng.lng()
                  };
                  setSelectedLocation(locationInfo);
                  setIsSidebarOpen(true);
                }
              }
            );
          } else {
            const locationInfo: LocationInfo = {
              name: response.results[0].address_components[0].long_name,
              address: response.results[0].formatted_address,
              lat: latLng.lat(),
              lng: latLng.lng()
            };
            setSelectedLocation(locationInfo);
            setIsSidebarOpen(true);
          }
        });
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
      setLocationError("주소를 가져오는데 실패했습니다.");
    }
  }, []);

  const handlePlaceSelect = useCallback(() => {
    if (!searchBoxRef.current) return;
    
    const places = searchBoxRef.current.getPlaces();
    if (!places || places.length === 0) return;

    const place = places[0];
    if (!place.geometry || !place.geometry.location) return;

    const locationInfo: LocationInfo = {
      name: place.name || '',
      address: place.formatted_address || '',
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };

    setSelectedLocation(locationInfo);
    setIsSidebarOpen(true);

    if (mapRef.current) {
      mapRef.current.setCenter(place.geometry.location);
      mapRef.current.setZoom(17);
    }

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.setMap(null);
    }
    selectedMarkerRef.current = new google.maps.Marker({
      position: place.geometry.location,
      map: mapRef.current,
      title: locationInfo.address,
      animation: google.maps.Animation.DROP,
      clickable: false
    });
  }, []);

  const changeLanguage = useCallback((lang: Language) => {
    setCurrentLanguage(lang);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > 100) return;
    
    const filtered = value.replace(/[<>{}]/g, '');
    const sanitizedValue = DOMPurify.sanitize(filtered);
    setSearchText(sanitizedValue);
  };

  const executeSearch = useCallback(() => {
    if (!searchText.trim()) return;

    const sanitizedQuery = encodeURIComponent(DOMPurify.sanitize(searchText));
    router.push(`/googleMap?q=${sanitizedQuery}`);

    if (!searchBoxRef.current) return;
    const places = searchBoxRef.current.getPlaces();
    if (places && places.length > 0) {
      handlePlaceSelect();
    }
  }, [searchText, router, handlePlaceSelect]);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      if (query.length > 100) return;
      
      const decodedQuery = decodeURIComponent(query);
      const filtered = decodedQuery.replace(/[<>{}]/g, '');
      const sanitizedQuery = DOMPurify.sanitize(filtered);
      setSearchText(sanitizedQuery);
      
      if (searchBoxRef.current) {
        const searchInput = document.getElementById('place-search') as HTMLInputElement;
        if (searchInput) {
          searchInput.value = sanitizedQuery;
          const event = new Event('input', { bubbles: true });
          searchInput.dispatchEvent(event);
        }
      }
    }
  }, [searchParams]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    }
  };

  const clearSearch = () => {
    setSearchText('');
    router.push('/googleMap');
    const searchInput = document.getElementById('place-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
  };

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        version: "weekly",
        libraries: ["places"],
        language: currentLanguage
      });

      const google = await loader.load();
      const map = new google.maps.Map(document.getElementById("map")!, {
        center: { lat: 37.5665, lng: 126.9780 },
        zoom: 17,
        draggableCursor: 'default',
        draggingCursor: 'grab',
        clickableIcons: false,
      });

      mapRef.current = map;

      const searchInput = document.getElementById('place-search') as HTMLInputElement;
      const searchBox = new google.maps.places.SearchBox(searchInput);
      searchBoxRef.current = searchBox;

      const places: RegisteredPlace[] = [/* 여기에 등록된 장소 데이터 */];
      places.forEach(place => {
        const marker = new google.maps.Marker({
          position: { lat: place.lat, lng: place.lng },
          map: map,
          title: place.name,
          clickable: true,
        });

        marker.addListener('mouseover', () => {
          map.getDiv().style.cursor = 'pointer';
        });

        marker.addListener('mouseout', () => {
          map.getDiv().style.cursor = 'default';
        });
      });

      map.addListener('dragstart', () => {
        map.getDiv().style.cursor = 'grabbing';
      });

      map.addListener('dragend', () => {
        map.getDiv().style.cursor = 'default';
      });

      map.addListener("click", async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        await getAddressFromLatLng(e.latLng);
      });

      searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();
        if (!places || places.length === 0) return;
        handlePlaceSelect();
      });

      trackUserLocation();
    };

    initMap().catch(console.error);
  }, [currentLanguage, trackUserLocation, handlePlaceSelect, getAddressFromLatLng]);

  return (
    <div className="flex h-screen relative">
      <div className="fixed top-4 right-4 z-30 bg-white rounded-lg shadow-md p-2 flex gap-2">
        <button
          onClick={() => changeLanguage('ko')}
          className={`px-3 py-1 rounded ${
            currentLanguage === 'ko' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          한국어
        </button>
        <button
          onClick={() => changeLanguage('en')}
          className={`px-3 py-1 rounded ${
            currentLanguage === 'en' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          English
        </button>
        <button
          onClick={() => changeLanguage('ja')}
          className={`px-3 py-1 rounded ${
            currentLanguage === 'ja' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          日本語
        </button>
      </div>

      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed left-0 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-r-lg p-2 z-30 transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-[384px] md:translate-x-96' : 'translate-x-0'
        }`}
      >
        <svg
          className="w-6 h-6 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isSidebarOpen ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
          />
        </svg>
      </button>

      <div 
        className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-transform duration-300 ease-in-out transform 
          w-full md:w-96 z-20 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 md:p-6">
          <div className="mb-6">
            <div className="relative flex items-center">
              <button
                onClick={() => window.history.back()}
                className="absolute left-2 text-gray-400 hover:text-gray-600 p-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <input
                id="place-search"
                type="text"
                value={searchText}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder={
                  currentLanguage === 'ko' ? '주소 또는 매장명 검색...' :
                  currentLanguage === 'en' ? 'Search address or place...' :
                  '住所または店舗名を検索...'
                }
                className="w-full px-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />

              {searchText && (
                <button
                  onClick={clearSearch}
                  className="absolute right-12 text-gray-400 hover:text-gray-600 p-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}

              <button
                onClick={executeSearch}
                className="absolute right-2 text-gray-400 hover:text-gray-600 p-2"
              >
                <svg 
                  className="w-5 h-5"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              {currentLanguage === 'ko' && '위치 정보'}
              {currentLanguage === 'en' && 'Location Info'}
              {currentLanguage === 'ja' && '位置情報'}
            </h2>
          </div>
          
          {selectedLocation && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-700">
                  {currentLanguage === 'ko' && '매장명'}
                  {currentLanguage === 'en' && 'Place Name'}
                  {currentLanguage === 'ja' && '店舗名'}
                </h3>
                <p className="text-sm md:text-base text-gray-600">{selectedLocation.name}</p>
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-700">
                  {currentLanguage === 'ko' && '주소'}
                  {currentLanguage === 'en' && 'Address'}
                  {currentLanguage === 'ja' && '住所'}
                </h3>
                <p className="text-sm md:text-base text-gray-600">{selectedLocation.address}</p>
              </div>
              <button
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm md:text-base"
                onClick={() => {
                  console.log('위치 저장:', selectedLocation);
                }}
              >
                {currentLanguage === 'ko' && '이 위치로 등록하기'}
                {currentLanguage === 'en' && 'Register this location'}
                {currentLanguage === 'ja' && 'この位置を登録する'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Google Map</h1>
          <Link href="/" className="text-blue-500 hover:underline mb-4 text-sm md:text-base">
            Home
          </Link>
          {locationError && (
            <p className="text-red-500 font-semibold mb-2 text-sm md:text-base">{locationError}</p>
          )}
          <div 
            id="map" 
            className="w-full md:w-[600px] h-[400px] md:h-[500px] rounded-md shadow-lg bg-white"
            style={{
              cursor: 'default', 
            }}
          ></div>
        </div>
      </div>

      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

const GoogleMapPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <GoogleMapContent />
    </Suspense>
  );
};

export default GoogleMapPage;