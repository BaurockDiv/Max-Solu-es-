
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
    name: 'NeoDynamics AI',
    logo: 'https://picsum.photos/id/2/200/200',
    bio: 'Automação inteligente e desenvolvimento de software sob demanda.',
    category: Category.TECH,
    verified: true,
    location: 'Home Office / Remoto',
    hours: 'Seg - Sex, 09:00 - 18:00',
    links: [{ title: 'Nosso Portfolio', url: '#' }],
    contact: { email: 'contato@neodynamics.tech' },
    rating: 5.0,
    reviewCount: 45
  },
  'b3': {
    id: 'b3',
    name: 'Skyline Lofts',
    logo: 'https://picsum.photos/id/1016/200/200',
    bio: 'Aluguéis de curta temporada em lofts industriais luxuosos.',
    category: Category.REAL_ESTATE,
    verified: true,
    location: 'Vila Olímpia, SP',
    hours: 'Diariamente, 24h',
    links: [{ title: 'Airbnb', url: '#' }, { title: 'Direct Booking', url: '#' }],
    contact: { phone: '11988887777' },
    rating: 4.9,
    reviewCount: 230
  },
  'b4': {
    id: 'b4',
    name: 'Clay & Soul',
    logo: 'https://picsum.photos/id/1027/200/200',
    bio: 'Cerâmicas feitas à mão com técnicas ancestrais e design moderno.',
    category: Category.CRAFTS,
    verified: false,
    location: 'Embu das Artes, SP',
    hours: 'Sab - Dom, 10:00 - 17:00',
    links: [{ title: 'Loja Online', url: '#' }],
    contact: { whatsapp: '11977776666' },
    rating: 4.7,
    reviewCount: 88
  },
  'b5': {
    id: 'b5',
    name: 'Zenith Wellness',
    logo: 'https://picsum.photos/id/1025/200/200',
    bio: 'Estúdio de Yoga e meditação guiada para equilíbrio urbano.',
    category: Category.HEALTH,
    verified: true,
    location: 'Jardins, SP',
    hours: 'Seg - Sab, 06:00 - 21:00',
    links: [{ title: 'Agendar Aula', url: '#' }],
    contact: { email: 'zenith@wellness.com' },
    rating: 4.9,
    reviewCount: 312
  },
  'b6': {
    id: 'b6',
    name: 'Prime Clean Detailing',
    logo: 'https://picsum.photos/id/1071/200/200',
    bio: 'Limpeza técnica e proteção de pintura para veículos premium.',
    category: Category.SERVICES,
    verified: true,
    location: 'Moema, SP',
    hours: 'Seg - Sex, 08:30 - 17:30',
    links: [{ title: 'Tabela de Preços', url: '#' }],
    contact: { whatsapp: '11966665555' },
    rating: 4.6,
    reviewCount: 156
  },
  'b7': {
    id: 'b7',
    name: 'Mind Academy',
    logo: 'https://picsum.photos/id/1062/200/200',
    bio: 'Bootcamp intensivo de programação e ciência de dados.',
    category: Category.EDUCATION,
    verified: true,
    location: 'Av. Paulista, SP',
    hours: 'Seg - Qui, 19:00 - 22:30',
    links: [{ title: 'Ementa dos Cursos', url: '#' }],
    contact: { email: 'info@mindacademy.edu' },
    rating: 5.0,
    reviewCount: 204
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
    businessId: 'b3',
    type: 'image',
    url: 'https://picsum.photos/id/1016/1080/1920',
    thumbnail: 'https://picsum.photos/id/1016/1080/1920',
    caption: 'Acordar com essa vista é o novo padrão de luxo. Reserve seu loft.',
    ctaText: 'Reservar Agora',
    ctaUrl: '#',
    tags: ['#lifestyle', '#luxury', '#sp'],
    likes: 890,
    isAffiliate: false
  },
  {
    id: 'p3',
    businessId: 'b5',
    type: 'video',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://picsum.photos/id/1025/1080/1920',
    caption: 'Encontre sua paz no meio do caos de São Paulo. Aula experimental grátis.',
    ctaText: 'Agendar Aula',
    ctaUrl: '#',
    tags: ['#yoga', '#wellness', '#zen'],
    likes: 560,
    isAffiliate: false
  },
  {
    id: 'p4',
    businessId: 'b7',
    type: 'image',
    url: 'https://picsum.photos/id/1062/1080/1920',
    thumbnail: 'https://picsum.photos/id/1062/1080/1920',
    caption: 'As inscrições para a turma de Python & Data Science estão abertas!',
    ctaText: 'Ver Ementa',
    ctaUrl: '#',
    tags: ['#tech', '#education', '#coding'],
    likes: 420,
    isAffiliate: true
  },
  {
    id: 'p5',
    businessId: 'b4',
    type: 'image',
    url: 'https://picsum.photos/id/1027/1080/1920',
    thumbnail: 'https://picsum.photos/id/1027/1080/1920',
    caption: 'Nova coleção de vasos rústicos saindo do forno hoje. Peças limitadas.',
    ctaText: 'Comprar Agora',
    ctaUrl: '#',
    tags: ['#decor', '#handmade', '#art'],
    likes: 310,
    isAffiliate: false
  }
];
