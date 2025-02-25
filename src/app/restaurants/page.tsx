'use client';

import { useTranslation } from '@/app/hooks/useTranslation';
import Restaurant from "../restaurants/Restaurant";

const RestaurantsPage = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t.restaurants.title}</h1>
      <p>{t.restaurants.description}</p>
      <Restaurant />
    </div>
  );
};

export default RestaurantsPage;