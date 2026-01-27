
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
      <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-600 tracking-widest">Sincronizando Rede...</p>
    </div>
  );

  if (followedBusinesses.length === 0) {
    return (
      <div className="h-full bg-white dark:bg-black flex flex-col items-center justify-center p-10 text-center space-y-6">
        <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-700">
          <Users size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Rede Vazia</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium leading-relaxed">
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
    <div className="h-full flex flex-col bg-white dark:bg-black transition-colors duration-500">
      {/* Novidades Bar */}
      <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl pt-12 pb-4 border-b border-zinc-100 dark:border-zinc-900">
        <div className="px-6 flex items-center justify-between mb-4">
          <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">Seguindo</h1>
          <div className="flex items-center gap-3">
            <button onClick={loadFollowingContent} className="text-zinc-400 hover:text-blue-500 transition-colors">
              <Bell size={20} />
            </button>
          </div>
        </div>
        <div className="flex overflow-x-auto gap-4 px-6 hide-scrollbar">
          {followedBusinesses.map(biz => (
            <div key={biz.id} className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer active:scale-90 transition-all" onClick={() => onProfileClick(biz.id)}>
              <div className="w-16 h-16 rounded-[1.8rem] p-1 border-2 border-blue-600 bg-white dark:bg-black">
                <img src={biz.logo || 'https://picsum.photos/200/200'} className="w-full h-full object-cover rounded-[1.4rem]" alt={biz.name} />
              </div>
              <span className="text-[8px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter max-w-[64px] truncate">{biz.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feed da Rede */}
      <div className="flex-1">
        <FeedView posts={followedPosts} onProfileClick={onProfileClick} hideFollowButton={true} />
      </div>
    </div>
  );
};

export default FollowingView;
