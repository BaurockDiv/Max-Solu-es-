
import React, { useState, useEffect } from 'react';
import { Users, LayoutGrid, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MediaPost, Business } from '../types';
import FeedView from './FeedView';
import { MOCK_BUSINESSES } from '../data';

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
    const followedIds = supabase.helpers.getFollowedIds();
    
    // Lista de empresas seguidas para o topo
    const bizList = followedIds.map((id: string) => MOCK_BUSINESSES[id]).filter(Boolean);
    setFollowedBusinesses(bizList);

    // Posts das empresas seguidas
    if (followedIds.length > 0) {
      const { data } = await supabase.from('posts').select('*').in('business_id', followedIds);
      if (data) {
        const normalized = data.map((p: any) => ({
          ...p,
          business: MOCK_BUSINESSES[p.businessId] || p.business
        }));
        setFollowedPosts(normalized);
      }
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-black">
      <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (followedBusinesses.length === 0) {
    return (
      <div className="h-full bg-black flex flex-col items-center justify-center p-10 text-center space-y-6">
        <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-900 flex items-center justify-center text-zinc-700">
           <Users size={48} />
        </div>
        <div className="space-y-2">
           <h2 className="text-xl font-black text-white uppercase tracking-tight">Rede Vazia</h2>
           <p className="text-zinc-500 text-xs font-medium leading-relaxed">
             Siga seus profissionais e empresas favoritos no explorar para ver as atualizações aqui.
           </p>
        </div>
        <button className="px-8 py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/10">
           Descobrir Profissionais
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Novidades Bar */}
      <div className="bg-black/80 backdrop-blur-xl pt-12 pb-4 border-b border-zinc-900">
        <div className="px-6 flex items-center justify-between mb-4">
           <h1 className="text-xl font-black text-white uppercase tracking-tighter">Sua Rede</h1>
           <Bell size={20} className="text-zinc-500" />
        </div>
        <div className="flex overflow-x-auto gap-4 px-6 hide-scrollbar">
           {followedBusinesses.map(biz => (
             <div key={biz.id} className="flex flex-col items-center space-y-1 flex-shrink-0" onClick={() => onProfileClick(biz.id)}>
                <div className="w-16 h-16 rounded-[1.8rem] p-1 border-2 border-blue-600 bg-black">
                   <img src={biz.logo} className="w-full h-full object-cover rounded-[1.4rem]" alt={biz.name} />
                </div>
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter max-w-[64px] truncate">{biz.name.split(' ')[0]}</span>
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
