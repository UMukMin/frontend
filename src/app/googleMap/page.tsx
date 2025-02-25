"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useRouter, useSearchParams } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { translations } from '@/app/translations';
import Image from 'next/image';

interface LocationInfo {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];
  photoUrl?: string;
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
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [currentLanguage, setCurrentLanguage] = useState<Language>('ko');
  const [searchText, setSearchText] = useState(() => {
    const initialQuery = searchParams.get('q');
    return initialQuery ? DOMPurify.sanitize(decodeURIComponent(initialQuery)) : '';
  });

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
      language: currentLanguage,  // 현재 언어 설정
    });
  }, []);  // 의존성 배열을 비워서 한 번만 생성되도록 함

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
    if (!navigator.geolocation) {
      setLocationError("이 브라우저는 Geolocation을 지원하지 않습니다.");
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
                photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 300 }) || '/default-place.jpg',
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
      setLocationError('주소를 가져오는데 실패했습니다.');
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
      photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 300 }) || '/default-place.jpg',
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
      trackUserLocation();
    } else {
      setIsTrackingLocation(false);
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
    }
  }, [isTrackingLocation, trackUserLocation]);

  /**
   * 8) 지도 초기화
   */
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      try {
        await loader.load();
        if (!isMounted) return;

        const map = new google.maps.Map(document.getElementById('map')!, {
          center: { lat: 37.5665, lng: 126.9780 },
          zoom: 14,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
        });

        mapRef.current = map;

        // Autocomplete
        const searchInput = document.getElementById('place-search') as HTMLInputElement;
        const autocomplete = new google.maps.places.Autocomplete(searchInput, {
          componentRestrictions: { country: 'kr' },
          fields: [
            'name',
            'formatted_address',
            'geometry',
            'rating',
            'user_ratings_total',
            'photos',
            'types',
          ],
        });
        autocompleteRef.current = autocomplete;

        autocomplete.addListener('place_changed', handleAutocompletePlaceChanged);

        // 지도 클릭 이벤트 -> 주소/장소정보 가져오기
        map.addListener("click", async (e: google.maps.MapMouseEvent) => {
          if (e.latLng) await getAddressFromLatLng(e.latLng);
        });

        // 위치 추적 시작
        trackUserLocation();
      } catch (error) {
        console.error('Error loading map:', error);
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, [
    handleAutocompletePlaceChanged,
    getAddressFromLatLng,
    trackUserLocation,
    currentLanguage,
    loader
  ]);

  /**
   * URL 파라미터에 q=? 검색어 있으면 자동 설정
   */
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      const decoded = decodeURIComponent(query).replace(/[<>{}]/g, '');
      setSearchText(DOMPurify.sanitize(decoded));
      const searchInput = document.getElementById('place-search') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = decoded;
      }
    }
  }, [searchParams]);

  /**
   * 마커 클릭 이벤트 핸들러 추가
   */
  // const handleMarkerClick = useCallback((place: google.maps.places.PlaceResult) => {
  //   if (!mapRef.current) return;
  //   const placesService = new google.maps.places.PlacesService(mapRef.current);
    
  //   placesService.getDetails({
  //     placeId: place.place_id!,
  //     fields: ['name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'types', 'opening_hours', 'formatted_phone_number']
  //   }, (placeDetail, status) => {
  //     if (status === google.maps.places.PlacesServiceStatus.OK && placeDetail) {
  //       setSelectedLocation({
  //         name: placeDetail.name || '',
  //         address: placeDetail.formatted_address || '',
  //         lat: placeDetail.geometry?.location?.lat() || 0,
  //         lng: placeDetail.geometry?.location?.lng() || 0,
  //         rating: placeDetail.rating,
  //         userRatingsTotal: placeDetail.user_ratings_total,
  //         types: placeDetail.types,
  //         openingHours: placeDetail.opening_hours,
  //         phoneNumber: placeDetail.formatted_phone_number,
  //         photoUrl: placeDetail.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 300 }) || '/default-place.jpg',
  //       });
  //       setIsSidebarOpen(true);
  //     }
  //   });
  // }, []);

  /**
   * 1. locationError 사용
   */
  useEffect(() => {
    if (locationError) {
      console.error('Location error:', locationError);
      // 에러 메시지를 사용자에게 표시할 수 있음
    }
  }, [locationError]);

  /**
   * 2. setCurrentLanguage 사용 - 브라우저 언어에 따라 초기 설정
   */
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (['ko', 'en', 'ja'].includes(browserLang)) {
      setCurrentLanguage(browserLang as Language);
    }
  }, []);

  /**
   * 실제 렌더링
   */
  return (
    <div className="relative flex h-screen">
      {/* 사이드바 */}
      <div className={`w-full md:w-96 bg-white shadow-lg transform transition-transform duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } fixed md:relative h-full z-20`}>
        <div className="h-full overflow-y-auto">
          {/* 검색 영역 */}
          <div className="p-4 border-b">
            <div className="relative">
              <input
                id="place-search"
                type="text"
                defaultValue={searchText}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder={translations[currentLanguage].search.placeholder}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {searchText && (
                <button 
                  onClick={clearSearch}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <span className="google-symbols">close</span>
                </button>
              )}
              <button 
                onClick={executeSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors"
              >
                <span className="google-symbols">search</span>
              </button>
            </div>
          </div>

          {/* 선택된 장소 정보 */}
          {selectedLocation && (
            <>
              {/* 대표 이미지 */}
              <div className="relative h-48 bg-gray-200">
                <Image
                  src={selectedLocation.photoUrl || '/placeholder.jpg'}
                  alt={selectedLocation.name || '장소 이미지'}
                  width={800}
                  height={400}
                  className="w-full h-full object-cover rounded-t-lg"
                />
              </div>

              {/* 장소 헤더 */}
              <div className="p-4">
                <h1 className="text-xl font-bold">{selectedLocation.name}</h1>
                <div className="flex items-center mt-2">
                  <span className="text-lg font-semibold">
                    {(selectedLocation.rating ?? 0).toFixed(1)}
                  </span>
                  <div className="flex mx-2">
                    {[1,2,3,4,5].map((star) => (
                      <span key={star} className="google-symbols text-yellow-400">
                        {star <= Math.round(selectedLocation.rating ?? 0) ? 'star' : 'star_border'}
                      </span>
                    ))}
                  </div>
                  <span className="text-gray-600">
                    ({selectedLocation.userRatingsTotal ?? '0'})
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {(selectedLocation.types ?? []).join(', ')}
                </div>
                
                {/* 등록 버튼 추가 */}
                <button
                  onClick={async () => {
                    // 현재 지도의 중심 좌표 가져오기
                    const center = mapRef.current?.getCenter();
                    if (!center) return;

                    try {
                      // Geocoder 인스턴스 생성
                      const geocoder = new google.maps.Geocoder();
                      
                      // 좌표를 주소로 변환
                      const response = await geocoder.geocode({
                        location: { lat: center.lat(), lng: center.lng() }
                      });

                      if (response.results[0]) {
                        // 주소 컴포넌트에서 지역 정보 찾기
                        const addressComponents = response.results[0].address_components;
                        const district = addressComponents.find(component => 
                          component.types.includes('sublocality_level_1') || 
                          component.types.includes('sublocality') ||
                          component.types.includes('locality')
                        );

                        setSelectedLocation({
                          name: selectedLocation.name || '',
                          address: selectedLocation.address || '',
                          lat: selectedLocation.lat || 0,
                          lng: selectedLocation.lng || 0,
                          rating: 0,
                          userRatingsTotal: 0,
                          region: district?.long_name || '',
                          category: '',
                          openingHours: selectedLocation.openingHours || {
                            weekday_text: [],
                            isOpen: () => false
                          },
                          phoneNumber: selectedLocation.phoneNumber || '',
                          description: '',
                          averagePrice: 0,
                          paymentMethods: [],
                        } as LocationInfo);
                      }
                    } catch (error) {
                      console.error('Error getting region:', error);
                    }
                  }}
                  className="mt-4 w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {translations[currentLanguage].location.registerRestaurant}
                </button>
              </div>

              {/* 액션 버튼들 */}
              <div className="grid grid-cols-4 gap-2 p-4 border-t border-b">
                <button className="flex flex-col items-center p-2 hover:bg-gray-100 rounded">
                  <span className="text-sm">{translations[currentLanguage].location.actions.directions}</span>
                </button>
                <button className="flex flex-col items-center p-2 hover:bg-gray-100 rounded">
                  <span className="text-sm">{translations[currentLanguage].location.actions.save}</span>
                </button>
                <button className="flex flex-col items-center p-2 hover:bg-gray-100 rounded">
                  <span className="text-sm">{translations[currentLanguage].location.actions.nearby}</span>
                </button>
                <button className="flex flex-col items-center p-2 hover:bg-gray-100 rounded">
                  <span className="text-sm">{translations[currentLanguage].location.actions.share}</span>
                </button>
              </div>

              {/* 탭 */}
              <div className="flex border-b">
                {['overview', 'reviews', 'photos', 'about'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-sm font-medium ${
                      activeTab === tab 
                        ? 'text-primary border-b-2 border-primary' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {translations[currentLanguage].location.tabs[tab as keyof typeof translations.ko.location.tabs]}
                  </button>
                ))}
              </div>

              {/* 탭 내용 */}
              <div className="p-4">
                {activeTab === 'overview' && (
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm">{selectedLocation.address}</h3>
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <span className="google-symbols">content_copy</span>
                    </button>
                  </div>
                )}
                {activeTab === 'reviews' && (
                  <div className="text-sm text-gray-600">리뷰(추가 구현 가능)</div>
                )}
                {activeTab === 'photos' && (
                  <div className="text-sm text-gray-600">사진 목록(추가 구현 가능)</div>
                )}
                {activeTab === 'about' && (
                  <div className="text-sm text-gray-600">장소 상세 정보(추가 구현 가능)</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 사이드바 토글 버튼 - 모바일에서만 표시 */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed left-0 top-4 bg-white p-2 rounded-r-lg shadow-lg z-30"
      >
        <span className="google-symbols">
          {isSidebarOpen ? '>' : '<'}
        </span>
      </button>

      {/* 지도 우측 상단 버튼들 */}
      <div className="absolute right-4 top-4 z-10">
        <button
          onClick={handleLocationButtonClick}
          className={`p-3 bg-white rounded-lg shadow-lg hover:bg-gray-100 ${
            isTrackingLocation ? 'text-primary' : 'text-gray-700'
          }`}
          title="내 위치"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
          </svg>
        </button>
      </div>

      {/* 실제 지도 영역 */}
      <div id="map" className="flex-1 h-full" />
    </div>
  );
};

const GoogleMapPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-semibold text-gray-700">Loading...</div>
      </div>
    }>
      <GoogleMapContent />
    </Suspense>
  );
};

export default GoogleMapPage;
