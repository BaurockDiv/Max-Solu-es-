
import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { Eye, MousePointer2, MessageSquare, Share2, PlusCircle, TrendingUp, Sparkles, Loader2, PlayCircle } from 'lucide-react';
import { Business, MediaPost } from '../types';

interface DashboardViewProps {
  business: Business | null;
  userPosts: MediaPost[];
}

const viewData = [
  { name: 'Seg', val: 120 }, { name: 'Ter', val: 450 }, { name: 'Qua', val: 300 },
  { name: 'Qui', val: 278 }, { name: 'Sex', val: 589 }, { name: 'Sab', val: 839 }, { name: 'Dom', val: 949 },
];

const DashboardView: React.FC<DashboardViewProps> = ({ business, userPosts }) => {
  const [activeMetric, setActiveMetric] = useState<'views' | 'clicks'>('views');
  const [isBoosting, setIsBoosting] = useState<string | null>(null);

  const totalViews = userPosts.reduce((acc, p) => acc + (p.likes * 12), 0);

  return (
    <div className="p-5 space-y-6 bg-white dark:bg-zinc-950 min-h-full pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Business Hub</h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
            {business?.name || "Configurando Perfil..."}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
            <TrendingUp size={22} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          active={activeMetric === 'views'}
          onClick={() => setActiveMetric('views')}
          icon={<Eye className="text-blue-500" size={18} />} 
          label="Visualizações" 
          value={totalViews > 0 ? `${(totalViews/1000).toFixed(1)}k` : "0"} 
          change="+100%" 
        />
        <StatCard 
          active={activeMetric === 'clicks'}
          onClick={() => setActiveMetric('clicks')}
          icon={<MousePointer2 className="text-green-500" size={18} />} 
          label="Publicações" 
          value={userPosts.length.toString()} 
          change="Ativo" 
        />
      </div>

      <div className="p-5 bg-zinc-50 dark:bg-zinc-900 rounded-3xl space-y-5 border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">Desempenho Semanal</h3>
          <div className="bg-blue-600/10 text-blue-600 px-2 py-1 rounded-full text-[10px] font-black uppercase">Live</div>
        </div>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={viewData}>
              <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] px-1">Gerenciar Conteúdo</h3>
        <div className="space-y-3">
            {userPosts.length > 0 ? userPosts.map(post => (
                <div key={post.id} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden">
                      <img src={post.thumbnail} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20"><PlayCircle className="text-white/70" size={18} /></div>
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold line-clamp-1 text-zinc-800 dark:text-zinc-200">{post.caption}</p>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">Alcance: {post.likes * 5}</span>
                    </div>
                    <button 
                      onClick={() => { setIsBoosting(post.id); setTimeout(() => setIsBoosting(null), 2000); }}
                      className="text-[10px] font-black px-4 py-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                    >
                      {isBoosting === post.id ? '...' : 'IMPULSIONAR'}
                    </button>
                </div>
            )) : (
              <div className="text-center py-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Nenhuma publicação</p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; change: string; active?: boolean; onClick?: () => void }> = ({ icon, label, value, change, active, onClick }) => (
  <div onClick={onClick} className={`p-4 rounded-3xl space-y-1 transition-all cursor-pointer border-2 ${active ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-zinc-50 dark:bg-zinc-900 border-transparent'}`}>
    <div className="flex items-center justify-between">
      <div className="p-2 bg-white dark:bg-zinc-800 rounded-xl shadow-sm">{icon}</div>
      <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">{change}</span>
    </div>
    <div className="pt-3">
      <div className="text-xl font-black tracking-tight">{value}</div>
      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{label}</div>
    </div>
  </div>
);

export default DashboardView;
