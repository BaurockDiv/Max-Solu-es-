
import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  ResponsiveContainer
} from 'recharts';
import { Eye, MousePointer2, TrendingUp, PlayCircle, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Business, MediaPost } from '../types';
import { supabase } from '../lib/supabase';

interface DashboardViewProps {
  business: Business | null;
  userPosts: MediaPost[];
}

const viewData = [
  { name: 'Seg', val: 120 }, { name: 'Ter', val: 450 }, { name: 'Qua', val: 300 },
  { name: 'Qui', val: 278 }, { name: 'Sex', val: 589 }, { name: 'Sab', val: 839 }, { name: 'Dom', val: 949 },
];

const DashboardView: React.FC<DashboardViewProps> = ({ business, userPosts: initialPosts }) => {
  const [activeMetric, setActiveMetric] = useState<'views' | 'clicks'>('views');
  const [isBoosting, setIsBoosting] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [posts, setPosts] = useState<MediaPost[]>(initialPosts);

  const totalLikes = posts.reduce((acc, p) => acc + (p.likes || 0), 0);
  const totalViews = totalLikes * 15 + (posts.length * 120);
  const avgEngagement = posts.length > 0 ? (totalLikes / posts.length).toFixed(1) : "0";

  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja remover esta publicação permanentemente?")) return;

    setDeletingId(id);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert("Erro ao deletar: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 space-y-10 bg-white dark:bg-black transition-colors duration-500 pb-32">
      <div className="flex justify-between items-center px-2">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-950 dark:text-white uppercase italic">Painel</h1>
          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-black uppercase tracking-[0.3em]">Gestão: {business?.name || "Global"}</p>
        </div>
        <div className="w-16 h-16 rounded-[2rem] bg-blue-600 flex items-center justify-center text-white shadow-2xl">
          <TrendingUp size={30} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StatCard
          active={activeMetric === 'views'}
          onClick={() => setActiveMetric('views')}
          icon={<Eye className="text-blue-600" size={24} />}
          label="Alcance Total"
          value={totalViews > 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews.toString()}
          change="+15%"
        />
        <StatCard
          active={activeMetric === 'clicks'}
          onClick={() => setActiveMetric('clicks')}
          icon={<TrendingUp className="text-green-600" size={24} />}
          label="Engajamento Médio"
          value={avgEngagement}
          change="Sincronizado"
        />
      </div>

      <div className="p-8 bg-zinc-100 dark:bg-zinc-900 rounded-[3rem] space-y-8 border border-zinc-300 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-400">Fluxo de Engajamento</h3>
          <div className="bg-blue-600/10 text-blue-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Tempo Real</div>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={viewData}>
              <Bar dataKey="val" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-[11px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.5em]">Gerenciar Mídia</h3>
          <span className="text-[9px] font-black text-zinc-400 uppercase">{posts.length} Itens</span>
        </div>

        <div className="space-y-5">
          {posts.length > 0 ? posts.map(post => (
            <div key={post.id} className="flex items-center gap-6 p-6 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-[2.5rem] shadow-sm group">
              <div className="relative w-20 h-20 rounded-[1.8rem] overflow-hidden shadow-lg border-2 border-white dark:border-black flex-shrink-0 bg-zinc-800">
                {post.type === 'video' ? (
                  post.thumbnail_url ? (
                    <img src={post.thumbnail_url} className="w-full h-full object-cover" />
                  ) : (
                    <video src={`${post.url}#t=0.5`} className="w-full h-full object-cover" preload="metadata" muted />
                  )
                ) : (
                  <img src={post.url} className="w-full h-full object-cover" />
                )}
                {post.type === 'video' && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><PlayCircle className="text-white" size={24} /></div>}
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-tight line-clamp-1">{post.caption || "Sem Legenda"}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[9px] text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-widest">{post.likes || 0} Curtidas • Impacto: {(post.likes || 0) * 12} pts</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeletePost(post.id)}
                  disabled={deletingId === post.id}
                  className="p-4 rounded-2xl bg-white dark:bg-red-900/10 text-red-600 border border-zinc-200 dark:border-none hover:bg-red-600 hover:text-white transition-all active:scale-90 shadow-sm"
                >
                  {deletingId === post.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                </button>
                <button
                  onClick={() => { setIsBoosting(post.id); setTimeout(() => setIsBoosting(null), 2000); }}
                  className="text-[9px] font-black px-5 py-4 rounded-2xl bg-blue-600 text-white active:scale-[0.98] transition-all uppercase tracking-widest shadow-lg shadow-blue-500/10"
                >
                  {isBoosting === post.id ? '...' : 'Impuls.'}
                </button>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
              <AlertCircle size={40} className="mx-auto text-zinc-300 dark:text-zinc-800 mb-4" />
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Nenhuma mídia ativa no momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; change: string; active?: boolean; onClick?: () => void }> = ({ icon, label, value, change, active, onClick }) => (
  <div onClick={onClick} className={`p-8 rounded-[3rem] space-y-3 transition-all cursor-pointer border-2 ${active ? 'border-blue-600 bg-white dark:bg-zinc-900 shadow-2xl scale-[1.02]' : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 shadow-sm'}`}>
    <div className="flex items-center justify-between">
      <div className={`p-3 rounded-2xl shadow-sm bg-white dark:bg-zinc-800 border ${active ? 'border-blue-100' : 'border-zinc-300'} dark:border-zinc-700`}>{icon}</div>
      <span className="text-[10px] font-black text-green-700 dark:text-green-500 bg-green-500/10 px-3 py-1.5 rounded-full uppercase tracking-tighter">{change}</span>
    </div>
    <div className="pt-2">
      <div className="text-4xl font-black tracking-tighter text-zinc-950 dark:text-white leading-none">{value}</div>
      <div className="text-[10px] text-zinc-600 dark:text-zinc-400 font-black uppercase tracking-[0.3em] mt-1">{label}</div>
    </div>
  </div>
);

export default DashboardView;
