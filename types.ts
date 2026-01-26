
export enum Category {
  FOOD = 'Food & Hospitality',
  TECH = 'Tech & Design',
  SERVICES = 'Professional Services',
  CRAFTS = 'Art & Crafts',
  HEALTH = 'Health & Wellness',
  REAL_ESTATE = 'Real Estate',
  EDUCATION = 'Education'
}

export interface Business {
  id: string;
  name: string;
  logo: string;
  bio: string;
  category: Category;
  verified: boolean;
  location: string;
  hours: string;
  links: Array<{ title: string; url: string }>;
  contact: {
    whatsapp?: string;
    email?: string;
    phone?: string;
  };
  rating: number;
  reviewCount: number;
}

export interface MediaPost {
  id: string;
  businessId: string;
  type: 'video' | 'image';
  url: string;
  thumbnail: string;
  caption: string;
  ctaText: string;
  ctaUrl: string;
  tags: string[];
  likes: number;
  isAffiliate: boolean;
  business?: Business;
}

export type ViewState = 'feed' | 'discovery' | 'profile' | 'dashboard' | 'me' | 'record';
