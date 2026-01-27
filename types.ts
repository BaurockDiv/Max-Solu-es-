
export enum Category {
  BEAUTY = 'Beleza & Estética',
  HEALTH = 'Saúde & Bem-estar',
  TECH = 'Tecnologia & TI',
  MARKETING = 'Marketing & Vendas',
  LAW = 'Direito & Jurídico',
  FINANCE = 'Finanças & Contabilidade',
  CONSTRUCTION = 'Construção & Reformas',
  EDUCATION = 'Educação & Treinamentos',
  FOOD = 'Gastronomia & Eventos',
  AUTOMOTIVE = 'Automotivo & Mecânica',
  RETAIL = 'Varejo & Comércio',
  SERVICES = 'Serviços Domésticos',
  PETS = 'Pets & Veterinária',
  ARTS = 'Artes & Entretenimento',
  REAL_ESTATE = 'Imobiliária & Corretagem',
  FASHION = 'Moda & Acessórios',
  LOGISTICS = 'Transporte & Logística',
  FITNESS = 'Esportes & Fitness'
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  status: 'pending' | 'accepted' | 'declined';
  last_message?: string;
  updated_at: string;
  other_participant?: {
    name: string;
    logo?: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'audio';
  created_at: string;
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
  whatsapp?: string;
  email?: string;
  phone?: string;
  rating: number;
  reviewCount: number;
  owner_id?: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userEmail: string;
  text: string;
  created_at: string;
}

export interface MediaPost {
  id: string;
  business_id: string;
  type: 'video' | 'image';
  media_url: string;
  thumbnail_url: string;
  caption: string;
  cta_text?: string;
  cta_url?: string;
  tags: string[];
  likes: number;
  is_affiliate: boolean;
  business?: Business;
  comments_count?: number;
}

export type ViewState = 'feed' | 'discovery' | 'profile' | 'following' | 'me' | 'record' | 'dashboard';
