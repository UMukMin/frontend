'use client';

import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import RegionButtons from './components/RegionButtons';
import Link from 'next/link';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <div className="bg-gray-50 py-8 sm:py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
              맛있는 식당을 찾고 계신가요?
              <span className="block text-lg sm:text-xl text-gray-600 mt-2">
                지금 바로 UMukMin과 함께 찾아보세요!
              </span>
            </h1>
            <div className="mt-6 sm:mt-8">
              <div className="max-w-xl sm:max-w-2xl mx-auto">
                <div className="flex shadow-sm rounded-lg overflow-hidden">
                  <input 
                    type="text" 
                    placeholder="지역, 식당 또는 음식" 
                    className="flex-1 px-4 sm:px-6 py-3 sm:py-4 border-0 focus:ring-2 focus:ring-primary focus:outline-none text-sm sm:text-base"
                  />
                  <button className="px-4 sm:px-6 py-3 sm:py-4 bg-primary text-white hover:bg-primary/90 transition-colors text-sm sm:text-base">
                    검색
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-8 sm:py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-900 mb-6 sm:mb-8">
              지역별 맛집
            </h2>
            <RegionButtons />
          </div>
        </div>

        <div className="bg-gray-50 py-8 sm:py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                나만 알고 있는 맛집이 있나요?
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                맛집을 등록하고 다른 사람들과 공유해보세요!
              </p>
              <Link 
                href="/googleMap" 
                className="inline-block px-6 sm:px-8 py-2 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
              >
                맛집 등록하기
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
