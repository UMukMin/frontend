"use client"; 

import React from "react";
import Link from "next/link";

const NavigateButtons = () => {

  return (
    <div>
      <Link href="/restaurants/seoul">서울</Link>
    </div>
  );
};

export default NavigateButtons;