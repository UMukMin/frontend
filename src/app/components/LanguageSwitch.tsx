'use client';

import React from 'react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import styles from '@/app/styles/components/header.module.css';

const LanguageSwitch = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={styles.lang_switch}>
      <div className={`${styles.lang_switch_item} ${language === 'ko' ? styles.selected : ''}`}>
        <button onClick={() => setLanguage('ko')}>한국어</button>
      </div>
      <div className={`${styles.lang_switch_item} ${language === 'en' ? styles.selected : ''}`}>
        <button onClick={() => setLanguage('en')}>English</button>
      </div>
      <div className={`${styles.lang_switch_item} ${language === 'ja' ? styles.selected : ''}`}>
        <button onClick={() => setLanguage('ja')}>日本語</button>
      </div>
    </div>
  );
};

export default LanguageSwitch; 