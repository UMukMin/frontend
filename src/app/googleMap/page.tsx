"use client";

import { Suspense } from "react";
import GoogleMapContent from "./GoogleMapContent";

export default function GoogleMapPage() {
  return (
    <Suspense fallback={<div>지도를 불러오는 중...</div>}>
      <GoogleMapContent />
    </Suspense>
  )
}