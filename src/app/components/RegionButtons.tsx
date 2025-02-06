"use client"; 

import React from "react";
import { useRouter } from "next/navigation";

const NavigateButtons = () => {
  const router = useRouter();

  const navigateToRegion = (region: string) => {
    router.push(`/restaurants/${region}`);
  };

  return (
    <div>
      <li onClick={() => navigateToRegion("seoul")}>서울</li>
      <li onClick={() => navigateToRegion("busan")}>부산</li>
      <li onClick={() => navigateToRegion("daegu")}>대구</li>
      <li onClick={() => navigateToRegion("daejeon")}>대전</li>
      <li onClick={() => navigateToRegion("gwangju")}>광주</li>
      <li onClick={() => navigateToRegion("gwangju")}>제주</li>
    </div>
  );
};

export default NavigateButtons;