
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';
import { MOCK_POSTS, MOCK_BUSINESSES } from '../data';

const supabaseUrl = 'https://SEU_PROJETO.supabase.co';
const supabaseAnonKey = 'SUA_ANON_KEY_AQUI';

const isPlaceholder = supabaseUrl.includes('SEU_PROJETO');

// Estado Local para Simulação (Persiste enquanto a aba estiver aberta)
let mockSession: any = null;
let customPosts = [...MOCK_POSTS];
const authListeners = new Set<(event: string, session: any) => void>();

const mockSupabase = {
  auth: {
    getSession: async () => ({ data: { session: mockSession }, error: null }),
    getUser: async () => ({ data: { user: mockSession?.user || null }, error: null }),
    signInWithPassword: async ({ email }: any) => {
      const userId = btoa(email).substring(0, 8); // Gera um ID único por e-mail
      mockSession = { user: { id: userId, email }, access_token: 'mock-token' };
      authListeners.forEach(fn => fn('SIGNED_IN', mockSession));
      return { data: { session: mockSession }, error: null };
    },
    signUp: async ({ email }: any) => {
      const userId = btoa(email).substring(0, 8);
      mockSession = { user: { id: userId, email }, access_token: 'mock-token' };
      authListeners.forEach(fn => fn('SIGNED_UP', mockSession));
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
        data: table === 'posts' ? customPosts : [], 
        error: null 
      }),
      eq: (col: string, val: any) => ({
        // Simula busca de negócio do dono ou posts do negócio
        single: () => {
          if (table === 'businesses' && col === 'owner_id') {
            return Promise.resolve({ 
              data: { 
                id: `biz-${val}`, 
                name: `Empresa de ${mockSession?.user?.email?.split('@')[0]}`,
                logo: 'https://picsum.photos/200/200',
                category: 'Professional Services',
                owner_id: val
              }, 
              error: null 
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
        select: () => Promise.resolve({ 
          data: table === 'posts' ? customPosts.filter(p => p.businessId === val) : [], 
          error: null 
        })
      })
    }),
    insert: (obj: any) => {
      if (table === 'posts') {
        const newPost = {
          id: `p-${Date.now()}`,
          businessId: obj.business_id,
          type: obj.type,
          url: obj.media_url,
          thumbnail: obj.media_url,
          caption: obj.caption,
          ctaText: obj.cta_text,
          ctaUrl: '#',
          // Fix: Added missing required property 'tags' to satisfy MediaPost interface
          tags: [],
          likes: 0,
          isAffiliate: false,
          created_at: new Date().toISOString(),
          business: { name: "Meu Negócio", logo: 'https://picsum.photos/200/200' }
        };
        // Fix: Use type casting to any to allow updating customPosts in mock implementation
        customPosts = [(newPost as any), ...customPosts];
      }
      return Promise.resolve({ data: null, error: null });
    }
  }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: { path: 'mock/path' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://picsum.photos/seed/' + Math.random() + '/800/1200' } })
    })
  }
};

export const supabase = isPlaceholder 
  ? (mockSupabase as any) 
  : createClient(supabaseUrl, supabaseAnonKey);
