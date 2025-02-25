export type Language = 'ko' | 'en' | 'ja';

type TranslationContent = {
  search: {
    placeholder: string;
    button: string;
  };
  location: {
    title: string;
    storeName: string;
    address: string;
    register: string;
    registerRestaurant: string;
    registerSuccess: string;
    registerError: string;
    confirmRegister: string;
    cancel: string;
    actions: {
      directions: string;
      save: string;
      nearby: string;
      share: string;
    };
    tabs: {
      overview: string;
      reviews: string;
      photos: string;
      about: string;
    };
  };
  home: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    registerTitle: string;
    registerDesc: string;
    registerButton: string;
  };
  restaurants: {
    title: string;
    description: string;
    filter: {
      all: string;
      korean: string;
      japanese: string;
      chinese: string;
      western: string;
      cafe: string;
      other: string;
    };
    sort: {
      rating: string;
      reviews: string;
      distance: string;
    };
  };
  common: {
    buttons: {
      submit: string;
      cancel: string;
      save: string;
      delete: string;
      edit: string;
      close: string;
    };
    validation: {
      required: string;
      invalid: string;
    };
    loading: string;
    error: string;
    success: string;
  };
};

export interface TranslationType {
  ko: TranslationContent;
  en: TranslationContent;
  ja: TranslationContent;
} 