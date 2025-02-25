"use client"; 

import React from "react";
import Link from "next/link";

const RegionButtons = () => {
  const regions = [
    "서울", "부산", "대구", "인천", "광주",
    "대전", "울산", "세종", "경기", "강원",
    "충북", "충남", "전북", "전남", "경북",
    "경남", "제주"
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {regions.map((region) => (
        <Link 
          key={region}
          href={`/restaurants/${region.toLowerCase()}`}
          className="flex items-center justify-center px-4 py-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-gray-800 hover:text-primary"
        >
          {region}
        </Link>
      ))}
    </div>
  );
};

export default RegionButtons;