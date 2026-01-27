
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

  clearSessionData: () => {
    followedBusinessIds = new Set();
    localStorage.removeItem('maxcompany_follows');
    localStorage.removeItem('maxcompany_likes'); // Reset general likes
  },

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
      } else {
        followedBusinessIds = new Set();
        localStorage.setItem('maxcompany_follows', '[]');
      }
    } catch (err) {
      console.warn("Falha ao sincronizar rede remota");
    }
  },

  toggleLike: async (postId: string, currentLikes: number, userId?: string) => {
    const storageKey = userId ? `maxcompany_likes_${userId}` : 'maxcompany_likes_guest';
    const likes = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const index = likes.indexOf(postId);
    const isLiked = index !== -1;

    // Garantir que currentLikes seja um número
    const safeLikes = Number(currentLikes) || 0;
    let newLikesCount = safeLikes;

    try {
      if (isLiked) {
        likes.splice(index, 1);
        newLikesCount = Math.max(0, safeLikes - 1);
      } else {
        likes.push(postId);
        newLikesCount = safeLikes + 1;
      }

      localStorage.setItem(storageKey, JSON.stringify(likes));

      // Atualiza no banco - Usando rpc seria melhor, mas tentaremos update simples primeiro
      const { error } = await supabaseReal.from('posts').update({ likes: newLikesCount }).eq('id', postId);
      if (error) console.error("Erro DB Like:", error);

    } catch (err) {
      console.error("Erro ao processar like:", err);
    }

    return { isLiked: !isLiked, count: newLikesCount };
  },

  isPostLiked: (postId: string, userId?: string) => {
    const storageKey = userId ? `maxcompany_likes_${userId}` : 'maxcompany_likes_guest';
    const likes = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return likes.includes(postId);
  }
};

export const supabase = Object.assign(supabaseReal, {
  helpers: supabaseHelpers
});
