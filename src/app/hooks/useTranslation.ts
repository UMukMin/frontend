import { useLanguage } from '@/app/contexts/LanguageContext';
import { translations } from '@/app/translations';

export const useTranslation = () => {
  const { language } = useLanguage();
  
  return {
    t: translations[language],
    language,
  };
}; 