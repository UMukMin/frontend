"use client"; 

import React from "react";
import Link from "next/link";
import styles from '@/app/styles/pages/home.module.css';

const RegionButtons = () => {
  const regions = [
    "서울", "부산", "대구", "인천", "광주",
    "대전", "울산", "세종", "경기", "강원",
    "충북", "충남", "전북", "전남", "경북",
    "경남", "제주"
  ];

  return (
    <div className={styles.region_grid}>
      {regions.map((region) => (
        <Link 
          key={region}
          href={`/restaurants/${region.toLowerCase()}`}
          className={styles.region_button}
        >
          {region}
        </Link>
      ))}
    </div>
  );
};

export default RegionButtons;