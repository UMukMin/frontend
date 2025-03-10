"use client";

import { LocationInfo } from "@/app/googleMap/types";
import Image from "next/image";
import {FaMapMarkerAlt, FaClock} from "react-icons/fa";

interface SidebarProps {
  isOpen: boolean;
  location: LocationInfo | null;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar = ({ 
  isOpen, 
  location, 
  onClose, 
}: SidebarProps) => {
  if (!isOpen || !location) return null;

  return (
    <div className="fixed inset-y-0 left-0 w-full md:w-96 bg-white shadow-xl z-[60] transition-transform duration-300 transform translate-x-0">
      <div className="h-full flex flex-col">
        {/* 헤더 섹션 */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{location.name}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ✕
          </button>
        </div>

        {/* 장소 이미지 */}
        {location.photoUrl && (
          <div className="relative w-full h-40 md:h-48">
            <Image
              src={location.photoUrl}
              alt={location.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* 주소, 운영시간, 별점, 리뷰 */}
        <div className="p-4 space-y-3">
          {/* 주소 */}
          {location.address && (
            <div className="flex items-center text-gray-700 text-sm md:text-base">
              <FaMapMarkerAlt className="text-blue-500 w-5 h-5 mr-2" />
              {location.address}
            </div>
          )}

          {/* 운영시간 */}
          {location.openingHours?.weekday_text && (
            <div className="text-green-600 text-sm md:text-base">
              <FaClock className="text-blue-500 w-5 h-5 mr-2" />
              {location.openingHours.weekday_text[0]}
            </div>
          )}

          {/* 별점 & 리뷰 */}
          <div className="flex items-center space-x-2">
            {location.rating !== undefined && (
              <p className="text-lg font-semibold text-yellow-500">
                ★ {location.rating.toFixed(1)}
              </p>
            )}
            {location.userRatingsTotal !== undefined && (
              <p className="text-gray-500 text-sm">({location.userRatingsTotal} 리뷰)</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
