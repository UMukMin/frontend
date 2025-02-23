'use client';

import React from 'react';
import Link from 'next/link';
import styles from '@/app/styles/components/header.module.css';

const Header = () => {
  return (
    <header>
      <div className={styles.inbound_about}>
        <div className={styles.contents_fixed}>
          <Link href="/about" className={styles.about_link}>UMukMin에 대해서</Link>
          <Link href="/help" className={styles.about_link}>FAQ</Link>
        </div>
      </div>
      <div className={styles.header_wrapper_top}>
        <div className={styles.contents_fixed}>
          <div className={styles.header_inbound}>
            <div className={styles.header_title}>
              <h1>한국 맛집검색, 맛집리뷰 [UMukMin]</h1>
            </div>
            <ul className={styles.lang_switch}>
              <li className={styles.lang_switch_item}>
                <Link href="/en">English</Link>
              </li>
              <li className={`${styles.lang_switch_item} ${styles.selected}`}>
                <Link href="/kr">한국어</Link>
              </li>
              <li className={styles.lang_switch_item}>
                <Link href="/jp">日本語</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.header_wrapper_bottom}>
        <div className={styles.contents_fixed}>
          <div className={styles.header}>
            <p className={styles.header_logo}>
              <Link href="/" title="UMukMin">
                UMukMin
              </Link>
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
