'use client';

import React from 'react';
import Link from 'next/link';
import LanguageSwitch from './LanguageSwitch';
import { translations } from '@/app/translations';
import { useLanguage } from '@/app/contexts/LanguageContext';

const Header = () => {
  const { language: currentLanguage } = useLanguage();

  return (
    <header className="w-full bg-white shadow-sm">
      {/* 상단 링크 */}
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end space-x-4 py-2 text-sm">
            <Link href="/about" className="text-gray-600 hover:text-primary transition-colors">
              UMukMin에 대해서
            </Link>
            <Link href="/help" className="text-gray-600 hover:text-primary transition-colors">
              FAQ
            </Link>
          </div>
        </div>
      </div>

      {/* 메인 헤더 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <div className="flex-shrink-0">
            <Link 
              href="/" 
              className="text-2xl font-bold text-gray-800 hover:text-primary transition-colors"
              title="UMukMin"
            >
              UMukMin
            </Link>
          </div>

          {/* 모바일 메뉴 버튼 */}
          <div className="md:hidden">
            <button className="p-2 text-gray-600 hover:text-gray-900">
              <span className="google-symbols">menu</span>
            </button>
          </div>

          {/* 데스크톱 네비게이션과 맛집 등록하기 버튼을 포함하는 컨테이너 */}
          <div className="flex items-center space-x-4">
            {/* 데스크톱 네비게이션 */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/restaurants" className="text-gray-600 hover:text-primary transition-colors">
                맛집 찾기
              </Link>
              <Link href="/googleMap" className="text-gray-600 hover:text-primary transition-colors">
                지도 검색
              </Link>
              <LanguageSwitch />
            </nav>

            {/* 맛집 등록하기 버튼 */}
            <Link
              href="/googleMap"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              {translations[currentLanguage].home.registerButton}
            </Link>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 (기본적으로 숨김) */}
      <div className="hidden md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1">
          <Link 
            href="/restaurants" 
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
          >
            맛집 찾기
          </Link>
          <Link 
            href="/googleMap" 
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
          >
            지도 검색
          </Link>
          <div className="px-3 py-2">
            <LanguageSwitch />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
