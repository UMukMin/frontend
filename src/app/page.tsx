'use client';

import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import RegionButtons from './components/RegionButtons';
import Link from 'next/link';
import styles from '@/app/styles/pages/home.module.css';

const HomePage = () => {
  return (
    <div className={styles.container}>
      <Header />
      <main className={styles.main}>
        <div className={styles.hero_section}>
          <div className={styles.contents_fixed}>
            <h1 className={styles.main_title}>
              맛있는 식당을 찾고 계신가요?
              <span className={styles.sub_title}>지금 바로 UMukMin과 함께 찾아보세요!</span>
            </h1>
            <div className={styles.search_section}>
              <div className={styles.search_box}>
                <input 
                  type="text" 
                  placeholder="지역, 식당 또는 음식" 
                  className={styles.search_input}
                />
                <button className={styles.search_button}>검색</button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.region_section}>
          <div className={styles.contents_fixed}>
            <h2 className={styles.section_title}>지역별 맛집</h2>
            <RegionButtons />
          </div>
        </div>

        <div className={styles.register_section}>
          <div className={styles.contents_fixed}>
            <div className={styles.register_box}>
              <h2 className={styles.register_title}>나만 알고 있는 맛집이 있나요?</h2>
              <p className={styles.register_desc}>맛집을 등록하고 다른 사람들과 공유해보세요!</p>
              <Link href="/googleMap" className={styles.register_button}>
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
