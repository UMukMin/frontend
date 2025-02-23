"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useRouter, useSearchParams } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import styles from '@/app/styles/pages/googleMap.module.css';
import { translations } from '@/app/translations';

interface LocationInfo {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];      
  // photoUrl?: string;     // 대표 사진 URL
  // reviews?: google.maps.places.PlaceReview[];
  openingHours?: google.maps.places.OpeningHours;
  // website?: string;
  phoneNumber?: string;
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
      const response = await geocoder.geocode({ location: latLng });
      if (!response.results[0]) return;

      // 주변에서 가장 가까운 establishment 찾아보기
      const request: google.maps.places.PlaceSearchRequest = {
        location: latLng,
        radius: 50,
        type: 'establishment',
      };

      placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
          const nearestPlace = results[0];
          placesService.getDetails(
            {
              placeId: nearestPlace.place_id!,
              fields: [
                'name',
                'formatted_address',
                'geometry',
                'rating',
                'user_ratings_total',
                'types',
                'photos',
              ]
            },
            (place, detailStatus) => {
              if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                const locationInfo: LocationInfo = {
                  name: place.name || '이름 없음',
                  address: place.formatted_address || response.results[0].formatted_address,
                  lat: latLng.lat(),
                  lng: latLng.lng(),
                  rating: place.rating ?? 0,
                  userRatingsTotal: place.user_ratings_total ?? 0,
                  types: place.types ?? [],
                  // photoUrl: place.photos && place.photos.length > 0
                  //   ? place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 })
                  //   : '/default-place.jpg'
                };
                setSelectedLocation(locationInfo);
                setIsSidebarOpen(true);

                // 기존 선택 마커 제거 후 새로 표시
                if (selectedMarkerRef.current) {
                  selectedMarkerRef.current.setMap(null);
                }
                selectedMarkerRef.current = new google.maps.Marker({
                  position: latLng,
                  map: mapRef.current!,
                  title: locationInfo.name,
                  animation: google.maps.Animation.DROP,
                  clickable: false,
                });
              } else {
                // Place details 못 가져온 경우, 기본 주소 정보만 사용
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
          // nearbySearch 결과가 없으면 기본 주소 정보만
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
    } catch (error) {
      console.error("Geocoding failed:", error);
      setLocationError("주소를 가져오는 중 오류가 발생했습니다.");
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
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: "weekly",
          libraries: ["places"],
          language: currentLanguage, // 언어 변경 시 참조 가능
        });

        const google = await loader.load();
        const map = new google.maps.Map(document.getElementById("map")!, {
          center: { lat: 37.5665, lng: 126.9780 },
          zoom: 14,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
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

        // 이미 등록된 마커가 있다면, 해당 위치에 마커 추가(예시)
        // const places: LocationInfo[] = [ ... ];
        // places.forEach(place => { ... });

        // 위치 추적 시작
        trackUserLocation();
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };
    initMap();
  }, [
    handleAutocompletePlaceChanged,
    getAddressFromLatLng,
    trackUserLocation,
    currentLanguage
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
   * 실제 렌더링
   */
  return (
    <div className={styles.container}>
      {/* 사이드바 */}
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebar_open : styles.sidebar_closed}`}>
        <div className={styles.sidebar_content}>
          {/* 검색 영역 */}
          <div className={styles.search_container}>
            <div className={styles.search_box}>
              <input
                id="place-search"
                type="text"
                defaultValue={searchText}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder={translations[currentLanguage].search.placeholder}
                className={styles.search_input}
              />
              {searchText && (
                <button onClick={clearSearch} className={styles.clear_button}>
                  <span className="google-symbols">close</span>
                </button>
              )}
              <button onClick={executeSearch} className={styles.search_button}>
                <span className="google-symbols">search</span>
              </button>
            </div>
          </div>

          {/* 선택된 장소 정보 */}
          {selectedLocation && (
            <>
              {/* 대표 이미지 */}
              <div className={styles.place_image}>
                <img
                  // src={selectedLocation.photoUrl || '/default-place.jpg'}
                  alt={selectedLocation.name}
                />
                <button className={styles.photo_button}>
                  <span className="google-symbols">photo_library</span>
                  사진 보기
                </button>
              </div>

              {/* 장소 헤더 */}
              <div className={styles.place_header}>
                <h1>{selectedLocation.name}</h1>
                <div className={styles.rating}>
                  <span>{(selectedLocation.rating ?? 0).toFixed(1)}</span>
                  <div className={styles.stars}>
                    {[1,2,3,4,5].map((star) => (
                      <span key={star} className="google-symbols">
                        {star <= Math.round(selectedLocation.rating ?? 0) ? 'star' : 'star_border'}
                      </span>
                    ))}
                  </div>
                  <span>({selectedLocation.userRatingsTotal ?? '0'})</span>
                </div>
                {/* types 표기 예시 */}
                <div className={styles.place_type}>
                  {(selectedLocation.types ?? []).join(', ')}
                </div>
              </div>

              {/* 액션 버튼들 (경로, 저장, 주변, 공유) */}
              <div className={styles.action_buttons}>
                <button className={styles.action_button}>
                  <span className="google-symbols">directions</span>
                  <span>경로</span>
                </button>
                <button className={styles.action_button}>
                  <span className="google-symbols">bookmark_border</span>
                  <span>저장</span>
                </button>
                <button className={styles.action_button}>
                  <span className="google-symbols">near_me</span>
                  <span>주변</span>
                </button>
                <button className={styles.action_button}>
                  <span className="google-symbols">share</span>
                  <span>공유</span>
                </button>
              </div>

              {/* 탭 */}
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'overview' && styles.active}`}
                  onClick={() => setActiveTab('overview')}
                >
                  개요
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'reviews' && styles.active}`}
                  onClick={() => setActiveTab('reviews')}
                >
                  리뷰
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'photos' && styles.active}`}
                  onClick={() => setActiveTab('photos')}
                >
                  사진
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'about' && styles.active}`}
                  onClick={() => setActiveTab('about')}
                >
                  정보
                </button>
              </div>

              {/* 탭 내용 */}
              <div className={styles.tab_content}>
                {activeTab === 'overview' && (
                  <div className={styles.overview}>
                    <div className={styles.address_section}>
                      <h3>{selectedLocation.address}</h3>
                      <button className={styles.copy_button}>
                        <span className="google-symbols">content_copy</span>
                      </button>
                    </div>
                  </div>
                )}
                {activeTab === 'reviews' && (
                  <div>리뷰(추가 구현 가능)</div>
                )}
                {activeTab === 'photos' && (
                  <div>사진 목록(추가 구현 가능)</div>
                )}
                {activeTab === 'about' && (
                  <div>장소 상세 정보(홈페이지, 전화번호 등 추가 가능)</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 사이드바 토글 버튼 */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={styles.toggle_button}
      >
        <span className="google-symbols">
          {isSidebarOpen ? '>' : '<'}
        </span>
      </button>

      {/* 지도 우측 상단 버튼들 (내 위치 추적 등) */}
      <div className={styles.map_controls}>
        <button
          onClick={handleLocationButtonClick}
          className={`${styles.control_button} ${isTrackingLocation ? styles.location_button_active : styles.location_button}`}
          title="내 위치"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
          </svg>
        </button>
      </div>

      {/* 실제 지도 영역 */}
      <div id="map" className={styles.map_container} />
    </div>
  );
};

const GoogleMapPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className={styles.loading}>
        <div className={styles.loading_text}>Loading...</div>
      </div>
    }>
      <GoogleMapContent />
    </Suspense>
  );
};

export default GoogleMapPage;
