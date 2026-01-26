
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';
import { MOCK_POSTS, MOCK_BUSINESSES } from '../data';
import { Category, Comment } from '../types';

const supabaseUrl = 'https://SEU_PROJETO.supabase.co';
const supabaseAnonKey = 'SUA_ANON_KEY_AQUI';

const isPlaceholder = supabaseUrl.includes('SEU_PROJETO');

// Estado Local Persistente
let mockSession: any = null;
let customPosts = [...MOCK_POSTS];
let mockComments: Comment[] = [
  { id: 'c1', postId: 'p1', userId: 'u1', userEmail: 'ana@example.com', text: 'Melhor café da região! ❤️', createdAt: new Date().toISOString() },
  { id: 'c2', postId: 'p1', userId: 'u2', userEmail: 'joao@dev.com', text: 'Atendimento impecável.', createdAt: new Date().toISOString() }
];
let followedBusinessIds = new Set<string>(['b1']); // Começa seguindo o Artisan Brews
const authListeners = new Set<(event: string, session: any) => void>();

let mockBusinessStore: any = null;
const mediaCache = new Map<string, string>();

const mockSupabase = {
  auth: {
    getSession: async () => ({ data: { session: mockSession }, error: null }),
    getUser: async () => ({ data: { user: mockSession?.user || null }, error: null }),
    signInWithPassword: async ({ email }: any) => {
      const userId = btoa(email).substring(0, 8);
      mockSession = { user: { id: userId, email }, access_token: 'mock-token' };
      authListeners.forEach(fn => fn('SIGNED_IN', mockSession));
      return { data: { session: mockSession }, error: null };
    },
    signOut: async () => {
      mockSession = null;
      authListeners.forEach(fn => fn('SIGNED_OUT', null));
      return { error: null };
    },
    onAuthStateChange: (callback: any) => {
      authListeners.add(callback);
      return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
    }
  },
  from: (table: string) => ({
    select: (columns?: string) => ({
      order: () => Promise.resolve({ 
        data: table === 'posts' ? [...customPosts] : [], 
        error: null 
      }),
      eq: (col: string, val: any) => ({
        single: () => {
          if (table === 'businesses' && col === 'owner_id') {
            if (!mockBusinessStore) {
              mockBusinessStore = { 
                id: `biz-${val}`, 
                name: "Meu Negócio",
                logo: 'https://picsum.photos/200/200',
                category: Category.SERVICES,
                owner_id: val,
                bio: "Bem-vindo ao meu perfil profissional.",
                verified: true,
                location: "Brasil",
                hours: "09:00 - 18:00",
                links: [],
                contact: { email: mockSession?.user?.email },
                rating: 5.0,
                reviewCount: 0
              };
            }
            return Promise.resolve({ data: mockBusinessStore, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        select: () => {
          if (table === 'comments') {
            return Promise.resolve({ data: mockComments.filter(c => c.postId === val), error: null });
          }
          if (table === 'posts' && col === 'business_id') {
            return Promise.resolve({ data: customPosts.filter(p => (p as any).business_id === val || p.businessId === val), error: null });
          }
          return Promise.resolve({ data: [], error: null });
        }
      }),
      in: (col: string, vals: string[]) => Promise.resolve({
        data: table === 'posts' ? customPosts.filter(p => vals.includes(p.businessId)) : [],
        error: null
      })
    }),
    insert: (obj: any) => {
      if (table === 'comments') {
        const newComment: Comment = {
          id: `c-${Date.now()}`,
          postId: obj.post_id,
          userId: mockSession?.user?.id || 'anon',
          userEmail: mockSession?.user?.email || 'Visitante',
          text: obj.text,
          createdAt: new Date().toISOString()
        };
        mockComments.push(newComment);
        return Promise.resolve({ data: [newComment], error: null });
      }
      if (table === 'posts') {
        const newPost = {
          id: `p-${Date.now()}`,
          businessId: obj.business_id,
          type: obj.type,
          url: obj.media_url, 
          thumbnail: obj.media_url,
          caption: obj.caption,
          ctaText: obj.cta_text || "Saiba Mais",
          ctaUrl: '#',
          tags: ["#bizstream"],
          likes: 0,
          isAffiliate: false,
          created_at: new Date().toISOString(),
          business: mockBusinessStore
        };
        customPosts = [(newPost as any), ...customPosts];
      }
      return Promise.resolve({ data: null, error: null });
    },
    update: (obj: any) => ({
      eq: (col: string, val: any) => {
        if (table === 'posts' && col === 'id') {
          customPosts = customPosts.map(p => p.id === val ? { ...p, ...obj } : p);
        }
        return Promise.resolve({ data: null, error: null });
      }
    })
  }),
  // Lógica de Seguidores Customizada
  helpers: {
    getFollowedIds: () => Array.from(followedBusinessIds),
    toggleFollow: (id: string) => {
      if (followedBusinessIds.has(id)) followedBusinessIds.delete(id);
      else followedBusinessIds.add(id);
      return Array.from(followedBusinessIds);
    },
    isFollowing: (id: string) => followedBusinessIds.has(id)
  },
  storage: {
    from: (bucket: string) => ({
      upload: (path: string, file: Blob) => {
        const localUrl = URL.createObjectURL(file);
        mediaCache.set(path, localUrl);
        return Promise.resolve({ data: { path }, error: null });
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: mediaCache.get(path) || 'https://picsum.photos/1080/1920' } })
    })
  }
};

export const supabase = isPlaceholder 
  ? (mockSupabase as any) 
  : createClient(supabaseUrl, supabaseAnonKey);
