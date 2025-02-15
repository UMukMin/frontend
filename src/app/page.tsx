'use client';

import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import RegionButtons from './components/RegionButtons';
import Link from 'next/link';

const HomePage = () => {

  return (
    <div>
      <Header />
      <main>
        <h1>Welcome to the Home Page</h1>
        <RegionButtons />
        <Link href="/googleMap">✨ 맛있는 음식점 등록하기 ✨</Link> 
        <br />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
