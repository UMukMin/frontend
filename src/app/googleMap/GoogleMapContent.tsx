"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useRouter, useSearchParams } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { translations } from '@/app/translations';
import Sidebar from "@/app/googleMap/components/Sidebar";
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface LocationInfo {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];
  // photoUrl?: string;
  openingHours?: google.maps.places.PlaceOpeningHours | {
    weekday_text?: string[];
    isOpen: () => boolean;
  };
  phoneNumber?: string;
  region?: string;
  category?: string;
  description?: string;
  averagePrice?: number;
  paymentMethods?: string[];
}

type Language = 'ko' | 'en' | 'ja';

const GoogleMapContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  /** 지도 관련 ref */
  const mapRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const selectedMarkerRef = useRef<google.maps.Marker | null>(null);

  /** 상태 값 */
  const [selectedLocation, setSelectedLocation] = useState<LocationInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [currentLanguage, /*setCurrentLanguage*/] = useState<Language>('ko');
  const [searchText, setSearchText] = useState(() => {
    const initialQuery = searchParams.get('q');
    return initialQuery ? DOMPurify.sanitize(decodeURIComponent(initialQuery)) : '';
  });
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [isPanelOpen, setIsPanelOpen] = useState(true);

  /** 최초 로딩 시, 지도 이동 한 번만 하기 위한 플래그 */
  const isFirstUpdate = useRef(true);

  /** Autocomplete Ref (SearchBox 대신 사용) */
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Loader 인스턴스를 메모이제이션
  const loader = React.useMemo(() => {
    return new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
      libraries: ['places'],
      language: currentLanguage,
    });
  }, [currentLanguage]);

  /**
   * 1) 실시간 위치(Marker) 업데이트
   */
  const updateMarkerPosition = useCallback((position: GeolocationPosition) => {
    const userLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    const heading = position.coords.heading;

    // 마커가 없으면 새로 생성
    if (!userMarkerRef.current && mapRef.current) {
      userMarkerRef.current = new google.maps.Marker({
        position: userLocation,
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#4285F4',
          fillOpacity: 1,
          scale: 8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        title: "내 위치",
        clickable: false,
        zIndex: 1
      });
    }
    // 이미 마커가 있으면 애니메이션으로 위치 이동 & heading 변경
    else if (userMarkerRef.current) {
      const start = userMarkerRef.current.getPosition();
      if (!start) return;

      const animationDuration = 200;
      const startTime = Date.now();

      const animate = () => {
        if (!userMarkerRef.current) return;
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);

        const lat = start.lat() + (userLocation.lat - start.lat()) * progress;
        const lng = start.lng() + (userLocation.lng - start.lng()) * progress;
        userMarkerRef.current.setPosition(new google.maps.LatLng(lat, lng));

        // heading이 있으면 아이콘을 화살표로 변경
        if (heading !== null && heading !== undefined) {
          const currentIcon = userMarkerRef.current.getIcon() as google.maps.Symbol;
          userMarkerRef.current.setIcon({
            ...currentIcon,
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            rotation: heading,
            scale: 6,
          });
        } else {
          // heading이 없으면 다시 원형 아이콘
          const currentIcon = userMarkerRef.current.getIcon() as google.maps.Symbol;
          userMarkerRef.current.setIcon({
            ...currentIcon,
            path: google.maps.SymbolPath.CIRCLE,
            rotation: 0,
            scale: 8,
          });
        }

        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }

    // 처음 위치 추적 시, 지도 중심 이동
    if (isFirstUpdate.current && mapRef.current) {
      mapRef.current.setCenter(userLocation);
      mapRef.current.setZoom(17);
      isFirstUpdate.current = false;
    }
  }, []);

  /**
   * 2) 위치 추적 on/off
   */
  const trackUserLocation = useCallback(() => {
    if(!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      updateMarkerPosition,
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000, 
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [updateMarkerPosition]);

  /**
   * 3) 지도 클릭 시, LatLng -> 주소/장소 정보 가져오기
   */
  const getAddressFromLatLng = useCallback(async (latLng: google.maps.LatLng) => {
    if (!mapRef.current) return;
    const geocoder = new google.maps.Geocoder();
    const placesService = new google.maps.places.PlacesService(mapRef.current);

    try {
      // 1. 먼저 클릭한 위치의 주소 정보를 가져옴
      const response = await geocoder.geocode({ location: latLng });
      if (!response.results[0]) return;

      // 2. 주변 장소 검색 (반경 50m 이내)
      placesService.nearbySearch({
        location: latLng,
        radius: 50,
        type: 'establishment'
      }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
          // 가장 가까운 장소 선택
          const nearestPlace = results[0];
          
          // 3. 선택된 장소의 상세 정보 가져오기
          placesService.getDetails({
            placeId: nearestPlace.place_id!,
            fields: [
              'name',
              'formatted_address',
              'geometry',
              'rating',
              'user_ratings_total',
              'types',
              'photos',
              'opening_hours',
              'website',
              'formatted_phone_number'
            ]
          }, (place, detailStatus) => {
            if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
              const locationInfo: LocationInfo = {
                name: place.name || '이름 없음',
                address: place.formatted_address || response.results[0].formatted_address,
                lat: latLng.lat(),
                lng: latLng.lng(),
                rating: place.rating ?? 0,
                userRatingsTotal: place.user_ratings_total ?? 0,
                types: place.types ?? [],
                openingHours: place.opening_hours,
                phoneNumber: place.formatted_phone_number,
                // photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 300 }) || '/default-place.jpg',
              };

              // 4. 상태 업데이트 및 마커 표시
              setSelectedLocation(locationInfo);
              setIsSidebarOpen(true);

              // 기존 선택 마커 제거 후 새로 표시
              if (selectedMarkerRef.current) {
                selectedMarkerRef.current.setMap(null);
              }
              selectedMarkerRef.current = new google.maps.Marker({
                position: latLng,
                map: mapRef.current!,
                animation: google.maps.Animation.DROP,
              });
            } else {
              // 장소 상세 정보를 가져오지 못한 경우, 기본 주소 정보만 표시
              const locationInfo: LocationInfo = {
                name: response.results[0].formatted_address,
                address: response.results[0].formatted_address,
                lat: latLng.lat(),
                lng: latLng.lng(),
              };
              setSelectedLocation(locationInfo);
              setIsSidebarOpen(true);

              if (selectedMarkerRef.current) {
                selectedMarkerRef.current.setMap(null);
              }
              selectedMarkerRef.current = new google.maps.Marker({
                position: latLng,
                map: mapRef.current!,
                animation: google.maps.Animation.DROP,
              });
            }
          });
        } else {
          // 주변에 등록된 장소가 없는 경우, 기본 주소 정보만 표시
          const locationInfo: LocationInfo = {
            name: response.results[0].formatted_address,
            address: response.results[0].formatted_address,
            lat: latLng.lat(),
            lng: latLng.lng(),
          };
          setSelectedLocation(locationInfo);
          setIsSidebarOpen(true);

          if (selectedMarkerRef.current) {
            selectedMarkerRef.current.setMap(null);
          }
          selectedMarkerRef.current = new google.maps.Marker({
            position: latLng,
            map: mapRef.current!,
            animation: google.maps.Animation.DROP,
          });
        }
      });
    } catch (error) {
      console.error('Error getting address:', error);
      // setLocationError('주소를 가져오는데 실패했습니다.');
    }
  }, []);

  /**
   * 4) Autocomplete place_changed 처리
   */
  const handleAutocompletePlaceChanged = useCallback(() => {
    if (!autocompleteRef.current || !mapRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place?.geometry?.location) return;

    // 지도 이동
    mapRef.current.setCenter(place.geometry.location);
    mapRef.current.setZoom(17);

    // 마커 표시
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.setMap(null);
    }
    selectedMarkerRef.current = new google.maps.Marker({
      position: place.geometry.location,
      map: mapRef.current,
      animation: google.maps.Animation.DROP,
    });

    // 상세 정보 세팅 (가능한 필드 확장)
    const locationInfo: LocationInfo = {
      name: place.name || '',
      address: place.formatted_address || '',
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      rating: place.rating ?? 0,
      userRatingsTotal: place.user_ratings_total ?? 0,
      types: place.types ?? [],
      // photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 300 }) || '/default-place.jpg',
    };
    setSelectedLocation(locationInfo);
    setIsSidebarOpen(true);
  }, []);

  /**
   * 5) 검색어 입력 핸들링
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // 간단한 필터링(태그 등 제거)
    value = value.replace(/[<>{}]/g, '');
    const sanitizedValue = DOMPurify.sanitize(value);
    if (sanitizedValue.length > 100) return; // 검색어 길이 제한
    setSearchText(sanitizedValue);
  };

  /**
   * 6) 검색 실행 (Enter 키 또는 버튼)
   */
  const executeSearch = useCallback(() => {
    if (!searchText.trim()) return;
    const encodedQuery = encodeURIComponent(DOMPurify.sanitize(searchText));
    router.push(`/googleMap?q=${encodedQuery}`);
    // Autocomplete가 place_changed 이벤트를 통해 자동 처리
  }, [searchText, router]);

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

  /**
   * 7) 내 위치 버튼
   */
  const handleLocationButtonClick = useCallback(() => {
    if (!isTrackingLocation) {
      setIsTrackingLocation(true);
  
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newCenter = { lat: latitude, lng: longitude };
  
          if (mapRef.current) {
            mapRef.current.setCenter(newCenter);
            mapRef.current.setZoom(17);
  
            if (!userMarkerRef.current) {
              userMarkerRef.current = new google.maps.Marker({
                position: newCenter,
                map: mapRef.current,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  scale: 8,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2,
                },
                zIndex: 1,
              });
            } else {
              userMarkerRef.current.setPosition(newCenter);
              userMarkerRef.current.setMap(mapRef.current);
            }
          }
        },
        (error) => {
          console.error("현재 위치를 가져오는 데 실패했습니다:", error);
        }
      );
  
      trackUserLocation();
    } else {
      setIsTrackingLocation(false);
  
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
    }
  }, [isTrackingLocation, trackUserLocation]);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    loader.load().then(() => {
      if(mapContainerRef.current && !mapRef.current) {
        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center: {lat: 37.5665, lng: 126.9780},
          zoom: 15,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
        });

        mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
          if(e.latLng) {
            getAddressFromLatLng(e.latLng);
          }
        });
        const input = document.getElementById('place-search') as HTMLInputElement;
        if(input) {
          autocompleteRef.current = new google.maps.places.Autocomplete(input, {
            fields: ['name', 'geometry', 'formatted_address', 'photos', 'rating', 'user_ratings_total', 'types'],
          });
          autocompleteRef.current.addListener('place_changed', handleAutocompletePlaceChanged);
        }
      }
    })
  }, [loader, handleAutocompletePlaceChanged, getAddressFromLatLng]);

  return (
    <div className="map-container">
      {/* 검색창 */}
      <div   className="absolute top-4 left-4 md:top-6 md:left-6 
              bg-white shadow-md rounded-lg p-2 flex items-center space-x-2
              w-64 md:w-80 h-10 md:h-12 z-50"
              > 
        <input
          id="place-search"
          type="text"
          className="w-full bg-transparent outline-none text-sm md:text-base px-2"
          placeholder={translations[currentLanguage]?.home?.searchPlaceholder || "검색어를 입력하세요"}
          value={searchText}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
        />
        <button onClick={executeSearch}
                className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm md:text-base hover:bg-blue-600 transition">
          {translations[currentLanguage]?.search?.button}
        </button>
        {searchText && (
          <button className="clear-button" onClick={clearSearch}>
            {translations[currentLanguage]?.common?.buttons?.close}
          </button>
        )}
      </div>

      {/* 지도 영역 */}
      <div id="map" className="map-container" ref={mapContainerRef}></div>

      {/* 내 위치 버튼 */}
      <button 
        className="absolute right-2.5 md:right-2.5 bottom-[250px] md:bottom-[290px]
                  bg-white shadow-md rounded-full w-10 h-10 md:w-10 md:h-10 flex items-center justify-center
                  hover:bg-gray-100 transition-all duration-300 z-50"
        onClick={handleLocationButtonClick}
      >
        <LocationOnIcon className="text-blue-500 w-6 h-6" />
      </button>


      {/* 패널 토글 버튼 */}
      <button 
        id="panel-toggle-control"
        className="absolute top-1/2 left-2 md:left-4 transform -translate-y-1/2 
                  bg-white shadow-md rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center
                  hover:bg-gray-100 transition-all duration-300 z-50"
        onClick={togglePanel}
      >
        {isPanelOpen ? (
          <FaChevronLeft className="text-gray-600 w-5 h-5 md:w-6 md:h-6" />
        ) : (
          <FaChevronRight className="text-gray-600 w-5 h-5 md:w-6 md:h-6" />
        )}
      </button>


      {/* 사이드바 */}
      {isSidebarOpen && selectedLocation && (
        <Sidebar
          isOpen={isSidebarOpen}
          location={selectedLocation}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab)}
        />
      )}
    </div>
  );
};

export default GoogleMapContent;
