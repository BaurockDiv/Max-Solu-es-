
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';

const supabaseUrl = 'https://tfecoyaxojvmaawyyvwp.supabase.co';
const supabaseAnonKey = 'sb_publishable_6cUaUd7CDAUEpGASUm71wQ_GzCBpas5';

export const supabaseReal = createClient(supabaseUrl, supabaseAnonKey);

const getInitialFollows = () => {
  try {
    const saved = localStorage.getItem('maxcompany_follows');
    return new Set<string>(saved ? JSON.parse(saved) : []);
  } catch {
    return new Set<string>();
  }
};

let followedBusinessIds = getInitialFollows();

const supabaseHelpers = {
  getFollowedIds: () => Array.from(followedBusinessIds),
  
  toggleFollow: async (businessId: string, userId?: string) => {
    const isFollowing = followedBusinessIds.has(businessId);
    
    try {
      if (isFollowing) {
        followedBusinessIds.delete(businessId);
        if (userId) {
          await supabaseReal.from('follows').delete().match({ user_id: userId, business_id: businessId });
        }
      } else {
        followedBusinessIds.add(businessId);
        if (userId) {
          await supabaseReal.from('follows').insert({ user_id: userId, business_id: businessId });
        }
      }
      
      localStorage.setItem('maxcompany_follows', JSON.stringify(Array.from(followedBusinessIds)));
    } catch (err) {
      console.error("Erro ao sincronizar follow:", err);
    }
    
    return Array.from(followedBusinessIds);
  },
  
  isFollowing: (id: string) => followedBusinessIds.has(id),

  syncFollows: async (userId: string) => {
    try {
      const { data } = await supabaseReal.from('follows').select('business_id').eq('user_id', userId);
      if (data) {
        const dbIds = data.map(f => f.business_id);
        followedBusinessIds = new Set(dbIds);
        localStorage.setItem('maxcompany_follows', JSON.stringify(dbIds));
      }
    } catch (err) {
      console.warn("Falha ao sincronizar rede remota");
    }
  }
};

export const supabase = Object.assign(supabaseReal, {
  helpers: supabaseHelpers
});
