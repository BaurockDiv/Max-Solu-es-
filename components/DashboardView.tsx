
import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  ResponsiveContainer,
  XAxis,
  Tooltip
} from 'recharts';
import { Eye, MousePointer2, TrendingUp, PlayCircle } from 'lucide-react';
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
    <div className="p-6 space-y-8 bg-white dark:bg-black transition-colors duration-500 pb-32 overflow-y-auto h-full">
      <div className="space-y-1 px-2">
        <h1 className="text-3xl font-black tracking-tighter text-zinc-950 dark:text-white uppercase">Painel</h1>
        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.3em]">Gestão de Negócio</p>
      </div>

      <div className="space-y-4">
        <StatCard 
          active={activeMetric === 'views'}
          onClick={() => setActiveMetric('views')}
          icon={<Eye className="text-blue-500" size={24} />} 
          label="Alcance Total" 
          value={totalViews > 0 ? `${(totalViews/1000).toFixed(1)}k` : "0"} 
          change="+12%" 
        />
        <StatCard 
          active={activeMetric === 'clicks'}
          onClick={() => setActiveMetric('clicks')}
          icon={<MousePointer2 className="text-green-500" size={24} />} 
          label="Posts Ativos" 
          value={userPosts.length.toString()} 
          change="Ativo" 
        />
      </div>

      <div className="p-8 bg-zinc-50 dark:bg-zinc-950 rounded-[3rem] space-y-6 border border-zinc-100 dark:border-zinc-900">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 px-2">Atividade Semanal</h3>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={viewData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none', fontWeight: 'bold', fontSize: '10px'}} />
              <Bar dataKey="val" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em] px-4">Minhas Mídias</h3>
        <div className="space-y-3">
            {userPosts.map(post => (
                <div key={post.id} className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-[2rem]">
                    <div className="relative w-16 h-16 rounded-[1.4rem] overflow-hidden flex-shrink-0">
                      <img src={post.thumbnail} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20"><PlayCircle className="text-white" size={20} /></div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-black text-zinc-950 dark:text-white uppercase tracking-tight truncate">{post.caption}</p>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Vistas: {post.likes * 5}</span>
                    </div>
                    <button 
                      onClick={() => { setIsBoosting(post.id); setTimeout(() => setIsBoosting(null), 2000); }}
                      className="text-[9px] font-black px-5 py-3 rounded-xl bg-blue-600 text-white active:scale-90 transition-all uppercase tracking-widest"
                    >
                      {isBoosting === post.id ? '...' : 'Boost'}
                    </button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; change: string; active?: boolean; onClick?: () => void }> = ({ icon, label, value, change, active, onClick }) => (
  <div onClick={onClick} className={`p-6 rounded-[2.5rem] space-y-2 transition-all cursor-pointer border-2 ${active ? 'border-blue-600 bg-white dark:bg-black shadow-xl' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-900 shadow-sm'}`}>
    <div className="flex items-center justify-between">
      <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">{icon}</div>
      <span className="text-[9px] font-black text-green-600 uppercase tracking-tighter">{change}</span>
    </div>
    <div className="pt-1">
      <div className="text-3xl font-black tracking-tighter text-zinc-950 dark:text-white">{value}</div>
      <div className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.3em]">{label}</div>
    </div>
  </div>
);

export default DashboardView;
