
import React, { useState, useEffect } from 'react';
import { Users, LayoutGrid, Bell, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MediaPost, Business } from '../types';
import FeedView from './FeedView';

interface FollowingViewProps {
  onProfileClick: (id: string) => void;
}

const FollowingView: React.FC<FollowingViewProps> = ({ onProfileClick }) => {
  const [followedPosts, setFollowedPosts] = useState<MediaPost[]>([]);
  const [followedBusinesses, setFollowedBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowingContent();
  }, []);

  const loadFollowingContent = async () => {
    setLoading(true);
    const followedIds = supabase.helpers.getFollowedIds();

    if (followedIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Buscar dados reais das empresas seguidas
      const { data: bizData } = await supabase
        .from('businesses')
        .select('*')
        .in('id', followedIds);

      if (bizData) setFollowedBusinesses(bizData as any);

      // Buscar posts das empresas seguidas com JOIN real
      const { data: postData } = await supabase
        .from('posts')
        .select('*, business:businesses(*)')
        .in('business_id', followedIds)
        .order('created_at', { ascending: false });

      if (postData) {
        const normalized = postData.map((p: any) => ({
          ...p,
          businessId: p.business_id,
          url: p.media_url,
          thumbnail: p.thumbnail_url,
        }));
        setFollowedPosts(normalized as any);
      }
    } catch (err) {
      console.error("Erro ao carregar rede:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-black gap-4">
      <Loader2 className="text-blue-600 animate-spin" size={32} />
      <p className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-600 tracking-widest">Sincronizando Rede...</p>
    </div>
  );

  if (followedBusinesses.length === 0) {
    return (
      <div className="h-full bg-white dark:bg-black flex flex-col items-center justify-center p-10 text-center space-y-6">
        <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-700">
          <Users size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-zinc-950 dark:text-white uppercase tracking-tight">Rede Vazia</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-xs font-medium leading-relaxed">
            Você ainda não segue nenhum profissional. Explore novos talentos na aba de busca para ver as novidades aqui.
          </p>
        </div>
        <button className="px-8 py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/10 active:scale-95 transition-all">
          Descobrir Profissionais
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-black transition-colors duration-500 overflow-hidden">
      {/* Novidades Bar - Redesenhada para economizar espaço */}
      <div className="bg-zinc-100 dark:bg-zinc-900/40 backdrop-blur-3xl pt-6 pb-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0 z-10">
        <div className="px-6 flex items-center justify-between mb-2">
          <h1 className="text-xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter italic">Rede</h1>
          <button onClick={loadFollowingContent} className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-950 dark:text-zinc-400 shadow-sm border border-zinc-200 dark:border-zinc-800">
            <Bell size={16} />
          </button>
        </div>
        <div className="flex overflow-x-auto gap-4 px-6 hide-scrollbar">
          {followedBusinesses.map(biz => (
            <div key={biz.id} className="flex flex-col items-center space-y-1.5 flex-shrink-0 cursor-pointer active:scale-95 transition-all group" onClick={() => onProfileClick(biz.id)}>
              <div className="w-12 h-12 rounded-[1.4rem] p-0.5 border-2 border-blue-600 bg-white dark:bg-black shadow-lg shadow-blue-500/5 group-active:scale-90 transition-transform">
                <img src={biz.logo || 'https://picsum.photos/200/200'} className="w-full h-full object-cover rounded-[1.2rem]" alt={biz.name} />
              </div>
              <span className="text-[7.5px] font-bold text-zinc-950 dark:text-zinc-400 uppercase tracking-tighter max-w-[48px] truncate">{biz.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feed da Rede - Forçando ocupação total do espaço restante */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {followedPosts.length > 0 ? (
          <FeedView posts={followedPosts} onProfileClick={onProfileClick} hideFollowButton={true} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 bg-white dark:bg-black">
            <div className="w-20 h-20 rounded-[2rem] bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
              <LayoutGrid size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase text-zinc-950 dark:text-white tracking-widest">Sem posts recentes</p>
              <p className="text-[9px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-tight">Os profissionais que você segue ainda não postaram novidades.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowingView;
