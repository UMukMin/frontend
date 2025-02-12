"use client";  

import React, { useCallback, useEffect, useState } from "react";
import { fetchRestaurantData } from "./api";
import Link from "next/link"; 

declare global {
  interface Window {
    initMap: () => void;
  }
}

const GoogleMapPage: React.FC = () => {
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [reviews, setReviews] = useState<{ rating: number; comment: string }[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleReviewSubmit = useCallback(() => {
    setReviews((prevReviews) => [...prevReviews, { rating, comment }]);
    setRating(0);
    setComment("");
  }, [rating, comment]);

  const loadGoogleMapsScript = useCallback(() => {
    if (typeof window === "undefined") return; 
    if (!window.google || !window.google.maps) {
      const scriptId = "google-maps-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&language=ko&callback=initMap`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        script.onload = () => window.initMap?.();
        script.onerror = () => console.error("Google Maps 스크립트 로드 오류 ~!");
      }
    } else {
      window.initMap?.();
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return; 
    if (isMapLoaded) return;

    window.initMap = () => {
      const defaultLocation = { lat: 37.5665, lng: 126.978 };
      const map = new google.maps.Map(document.getElementById("map") as HTMLElement, {
        center: defaultLocation,
        zoom: 15,
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            map.setCenter(userLocation);
            new google.maps.Marker({
              map,
              position: userLocation,
              icon: { url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" },
            });
          },
          (error) => console.error("위치 정보를 가져올 수 없습니다.", error)
        );
      }

      const input = document.getElementById("pac-input") as HTMLInputElement;
      const searchBox = new google.maps.places.SearchBox(input);
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

      let markers: google.maps.Marker[] = [];

      searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();
        if (!places?.length) return;

        markers.forEach((marker) => marker.setMap(null));
        markers = [];

        const bounds = new google.maps.LatLngBounds();
        places.forEach((place) => {
          if (!place.geometry?.location) return;

          const marker = new google.maps.Marker({
            map,
            position: place.geometry.location,
          });
          markers.push(marker);

          bounds.extend(place.geometry.location);
          setSelectedPlace(place);
          fetchRestaurantData(place.formatted_address || "");
        });

        map.fitBounds(bounds);
      });
      setIsMapLoaded(true);
    };
    loadGoogleMapsScript();
  }, [isMapLoaded, loadGoogleMapsScript]);

  return (
    <div>
      <h1>Google Map</h1>
      <Link href="/">Home</Link> 
      <input id="pac-input" type="text" placeholder="검색" style={{ marginBottom: "10px", padding: "5px", width: "300px" }} />
      <div id="map" style={{ height: "660px", width: "540px" }}></div>
      {selectedPlace && <ReviewSection rating={rating} setRating={setRating} comment={comment} setComment={setComment} handleReviewSubmit={handleReviewSubmit} reviews={reviews} />}
    </div>
  );
};

const ReviewSection: React.FC<{
  rating: number;
  setRating: (value: number) => void;
  comment: string;
  setComment: (value: string) => void;
  handleReviewSubmit: () => void;
  reviews: { rating: number; comment: string }[];
}> = ({ rating, setRating, comment, setComment, handleReviewSubmit }) => (
  <div style={{ marginTop: "20px" }}>
    <h2>맛있다고 생각한 음식점 등록 하기</h2>
    <form onSubmit={(e) => {
      e.preventDefault();
      handleReviewSubmit();
    }}>
      <label>Rating:<input type="number" min="1" max="3" value={rating} onChange={(e) => setRating(Number(e.target.value))} required /></label>
      <br />
      <label>Comment:<textarea value={comment} onChange={(e) => setComment(e.target.value)} required /></label>
      <br />
      <button type="submit">등록하기</button>
    </form>
  </div>
);

export default GoogleMapPage;
