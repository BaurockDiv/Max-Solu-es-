
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

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userEmail: string;
  text: string;
  createdAt: string;
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
  commentsCount?: number;
}

export type ViewState = 'feed' | 'discovery' | 'profile' | 'following' | 'me' | 'record' | 'dashboard';
