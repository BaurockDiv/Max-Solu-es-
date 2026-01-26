
import { Category, Business, MediaPost } from './types';

export const MOCK_BUSINESSES: Record<string, Business> = {
  'b1': {
    id: 'b1',
    name: 'Artisan Brews',
    logo: 'https://picsum.photos/id/10/200/200',
    bio: 'Cafés de origem controlada e confeitaria artesanal no coração de SP.',
    category: Category.FOOD,
    verified: true,
    location: 'Pinheiros, São Paulo',
    hours: 'Seg - Sex, 08:00 - 18:00',
    links: [{ title: 'Cardápio Digital', url: '#' }, { title: 'Instagram', url: '#' }],
    contact: { whatsapp: '11999999999', email: 'hello@artisanbrews.com' },
    rating: 4.8,
    reviewCount: 124
  },
  'b2': {
    id: 'b2',
    name: 'Skyline Lofts',
    logo: 'https://picsum.photos/id/1016/200/200',
    bio: 'Aluguéis de curta temporada em lofts industriais luxuosos.',
    category: Category.REAL_ESTATE,
    verified: true,
    location: 'Vila Olímpia, SP',
    hours: 'Diariamente, 24h',
    links: [{ title: 'Airbnb', url: '#' }],
    contact: { phone: '11988887777' },
    rating: 4.9,
    reviewCount: 230
  }
};

export const MOCK_POSTS: MediaPost[] = [
  {
    id: 'p1',
    businessId: 'b1',
    type: 'video',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://picsum.photos/id/100/1080/1920',
    caption: 'O aroma do café fresquinho passando agora! ☕ #coffee #artisan',
    ctaText: 'Ver Cardápio',
    ctaUrl: '#',
    tags: ['#coffee', '#sp', '#artisan'],
    likes: 1240,
    isAffiliate: false
  },
  {
    id: 'p2',
    businessId: 'b2',
    type: 'image',
    url: 'https://picsum.photos/id/1016/1080/1920',
    thumbnail: 'https://picsum.photos/id/1016/1080/1920',
    caption: 'Acordar com essa vista é o novo padrão de luxo. Reserve seu loft.',
    ctaText: 'Reservar Agora',
    ctaUrl: '#',
    tags: ['#lifestyle', '#luxury', '#sp'],
    likes: 890,
    isAffiliate: false
  }
];
