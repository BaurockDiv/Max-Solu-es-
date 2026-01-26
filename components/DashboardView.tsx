
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
import { Eye, MousePointer2, MessageSquare, Share2, PlusCircle, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { Business, MediaPost } from '../types';

interface DashboardViewProps {
  business: Business | null;
  userPosts: MediaPost[];
}

const viewData = [
  { name: 'Seg', val: 120 }, { name: 'Ter', val: 450 }, { name: 'Qua', val: 300 },
  { name: 'Qui', val: 278 }, { name: 'Sex', val: 589 }, { name: 'Sab', val: 839 }, { name: 'Dom', val: 949 },
];

const clickData = [
  { name: 'Seg', val: 5 }, { name: 'Ter', val: 18 }, { name: 'Qua', val: 12 },
  { name: 'Qui', val: 15 }, { name: 'Sex', val: 28 }, { name: 'Sab', val: 42 }, { name: 'Dom', val: 55 },
];

const DashboardView: React.FC<DashboardViewProps> = ({ business, userPosts }) => {
  const [activeMetric, setActiveMetric] = useState<'views' | 'clicks'>('views');
  const [isBoosting, setIsBoosting] = useState<string | null>(null);

  const handleBoost = (id: string) => {
    setIsBoosting(id);
    setTimeout(() => {
      setIsBoosting(null);
      alert("Impulsionamento ativado para esta publicação!");
    }, 1500);
  };

  return (
    <div className="p-5 space-y-6 bg-white dark:bg-zinc-950 min-h-full pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Business Hub</h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
            {business?.name || "Carregando Perfil..."}
          </p>
        </div>
        <button className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 active:scale-90 transition-transform">
            <PlusCircle size={22} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          active={activeMetric === 'views'}
          onClick={() => setActiveMetric('views')}
          icon={<Eye className="text-blue-500" size={18} />} 
          label="Visualizações" 
          value={activeMetric === 'views' ? "3.5k" : "3.5k"} 
          change="+18%" 
        />
        <StatCard 
          active={activeMetric === 'clicks'}
          onClick={() => setActiveMetric('clicks')}
          icon={<MousePointer2 className="text-green-500" size={18} />} 
          label="Cliques CTA" 
          value="176" 
          change="+12%" 
        />
      </div>

      <div className="p-5 bg-zinc-50 dark:bg-zinc-900 rounded-3xl space-y-5 border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            Desempenho: <span className="text-blue-600 font-extrabold">{activeMetric === 'views' ? 'Alcance' : 'Engajamento'}</span>
          </h3>
          <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded-full">
            <TrendingUp size={12} /> Live
          </div>
        </div>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeMetric === 'views' ? viewData : clickData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#9ca3af', fontWeight: 600}} />
              <Tooltip 
                cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} 
                contentStyle={{borderRadius: '16px', border: 'none', background: '#18181b', color: '#fff'}} 
              />
              <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                {(activeMetric === 'views' ? viewData : clickData).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={activeMetric === 'views' ? '#3b82f6' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] px-1">Minhas Publicações</h3>
        <div className="space-y-3">
            {userPosts.length > 0 ? userPosts.map(post => (
                <div key={post.id} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm hover:border-blue-500/30 transition-colors">
                    <img src={post.thumbnail} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1">
                        <p className="text-xs font-bold line-clamp-1 text-zinc-800 dark:text-zinc-200">{post.caption}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-400 font-bold">
                            <span className="flex items-center gap-1 uppercase tracking-tighter"><Eye size={10} /> {Math.floor(Math.random()*500)} views</span>
                        </div>
                    </div>
                    <button 
                      onClick={() => handleBoost(post.id)}
                      disabled={isBoosting === post.id}
                      className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${isBoosting === post.id ? 'bg-zinc-100 text-zinc-400' : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 active:scale-95'}`}
                    >
                        {isBoosting === post.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {isBoosting === post.id ? 'ATIVANDO' : 'BOOST'}
                    </button>
                </div>
            )) : (
              <div className="text-center py-8 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Nenhuma publicação ainda</p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; change: string; active?: boolean; onClick?: () => void }> = ({ icon, label, value, change, active, onClick }) => (
  <div 
    onClick={onClick}
    className={`p-4 rounded-3xl space-y-1 transition-all cursor-pointer border-2 ${active ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg' : 'bg-zinc-50 dark:bg-zinc-900 border-transparent active:scale-95'}`}
  >
    <div className="flex items-center justify-between">
      <div className="p-2 bg-white dark:bg-zinc-800 rounded-xl shadow-sm">{icon}</div>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${change.startsWith('+') ? 'text-green-600 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>{change}</span>
    </div>
    <div className="pt-3">
      <div className="text-xl font-black tracking-tight">{value}</div>
      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{label}</div>
    </div>
  </div>
);

export default DashboardView;
