
import { Category, Business, MediaPost } from './types';

export const MOCK_BUSINESSES: Record<string, Business> = {
  'b1': {
    id: 'b1',
    name: 'Artisan Brews',
    logo: 'https://picsum.photos/id/10/200/200',
    bio: 'Locally sourced coffee and hand-crafted pastries in the heart of the city.',
    category: Category.FOOD,
    verified: true,
    location: '123 Main St, New York',
    hours: '08:00 AM - 06:00 PM',
    links: [
      { title: 'Order Online', url: '#' },
      { title: 'Instagram', url: '#' }
    ],
    contact: { whatsapp: '1234567890', email: 'hello@artisanbrews.com' },
    rating: 4.8,
    reviewCount: 124
  },
  'b2': {
    id: 'b2',
    name: 'Swift Code Studio',
    logo: 'https://picsum.photos/id/2/200/200',
    bio: 'Premium mobile app development for startups and visionaries.',
    category: Category.TECH,
    verified: true,
    location: 'Remote / SF',
    hours: 'Mon-Fri 9-5',
    links: [
      { title: 'Portfolio', url: '#' },
      { title: 'Hire Us', url: '#' }
    ],
    contact: { email: 'info@swiftcode.dev' },
    rating: 5.0,
    reviewCount: 45
  },
  'b3': {
    id: 'b3',
    name: 'Mountain Escape',
    logo: 'https://picsum.photos/id/11/200/200',
    bio: 'Modern tiny homes nestled in the woods for your next getaway.',
    category: Category.REAL_ESTATE,
    verified: true,
    location: 'Asheville, NC',
    hours: '24/7 Booking',
    links: [
      { title: 'Airbnb Listing', url: '#' },
      { title: 'Direct Booking', url: '#' }
    ],
    contact: { phone: '9876543210' },
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
    caption: 'Fresh morning pour! ☕ Come experience the best beans in NYC.',
    ctaText: 'View Menu',
    ctaUrl: '#',
    tags: ['#coffee', '#nyc', '#artisan'],
    likes: 1240,
    isAffiliate: false
  },
  {
    id: 'p2',
    businessId: 'b3',
    type: 'image',
    url: 'https://picsum.photos/id/1016/1080/1920',
    thumbnail: 'https://picsum.photos/id/1016/1080/1920',
    caption: 'The view from our newest tiny home is absolutely breathtaking.',
    ctaText: 'Book Now',
    ctaUrl: '#',
    tags: ['#travel', '#nature', '#tinyhome'],
    likes: 890,
    isAffiliate: false
  },
  {
    id: 'p3',
    businessId: 'b2',
    type: 'image',
    url: 'https://picsum.photos/id/101/1080/1920',
    thumbnail: 'https://picsum.photos/id/101/1080/1920',
    caption: 'Just launched! 🚀 Our new design system for client projects.',
    ctaText: 'Free Consultation',
    ctaUrl: '#',
    tags: ['#development', '#uxui', '#startup'],
    likes: 560,
    isAffiliate: true
  }
];
