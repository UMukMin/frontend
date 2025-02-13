"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import Link from "next/link";

interface LocationInfo {
  address: string;
  lat: number;
  lng: number;
}

const GoogleMapPage: React.FC = () => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const selectedMarkerRef = useRef<google.maps.Marker | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isFirstUpdate = useRef(true);

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
        clickable: true,
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
        maximumAge: 0, // 항상 최신 위치 정보 사용
        timeout: 5000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [updateMarkerPosition]);

  const getAddressFromLatLng = useCallback(async (latLng: google.maps.LatLng) => {
    const geocoder = new google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ location: latLng });
      if (response.results[0]) {
        const locationInfo: LocationInfo = {
          address: response.results[0].formatted_address,
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
          title: locationInfo.address,
          animation: google.maps.Animation.DROP,
          clickable: false
        });
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
      setLocationError("주소를 가져오는데 실패했습니다.");
    }
  }, []);

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: "weekly",
      libraries: ["places"]
    });

    loader.load().then(() => {
      const defaultLocation = { lat: 37.5665, lng: 126.978 };
      const mapInstance = new google.maps.Map(
        document.getElementById("map") as HTMLElement,
        {
          center: defaultLocation,
          zoom: 15,
          disableDefaultUI: false,
          clickableIcons: false,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          },
          scaleControl: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          streetViewControl: false,
        }
      );

      mapInstance.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          getAddressFromLatLng(e.latLng);
        }
      });

      mapRef.current = mapInstance;
      trackUserLocation();
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.setMap(null);
        selectedMarkerRef.current = null;
      }
    };
  }, [trackUserLocation, getAddressFromLatLng]);

  return (
    <div className="flex h-screen">
      <div 
        className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-transform duration-300 ease-in-out w-96 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">위치 정보</h2>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {selectedLocation && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">주소</h3>
                <p className="text-gray-600">{selectedLocation.address}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700">좌표</h3>
                <p className="text-gray-600">
                  위도: {selectedLocation.lat.toFixed(6)}<br />
                  경도: {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
              <button
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                onClick={() => {
                  console.log('위치 저장:', selectedLocation);
                }}
              >
                이 위치로 등록하기
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Google Map</h1>
          <Link href="/" className="text-blue-500 hover:underline mb-4">
            Home
          </Link>
          {locationError && (
            <p className="text-red-500 font-semibold mb-2">{locationError}</p>
          )}
          <div id="map" className="h-[500px] w-[600px] rounded-md shadow-lg bg-white cursor-pointer"></div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapPage;