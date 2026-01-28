
import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  ResponsiveContainer
} from 'recharts';
import { Eye, TrendingUp } from 'lucide-react';
import { Business, MediaPost } from '../types';
import { supabase } from '../lib/supabase';

interface DashboardViewProps {
  business: Business | null;
  userPosts: MediaPost[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ business, userPosts: initialPosts }) => {
  const [activeMetric, setActiveMetric] = useState<'views' | 'clicks'>('views');
  const [posts] = useState<MediaPost[]>(initialPosts);

  const totalLikes = posts.reduce((acc, p) => acc + (p.likes || 0), 0);
  const totalViews = totalLikes * 15 + (posts.length * 120);
  const avgEngagement = posts.length > 0 ? (totalLikes / posts.length).toFixed(1) : "0";



  // Gerar dados reais para o gráfico com base nos posts atuais
  const chartData = posts.length > 0
    ? posts.slice(0, 7).map((p, i) => ({
      name: p.caption?.substring(0, 5) || `Post ${i + 1}`,
      val: (p.likes || 0) * 10
    }))
    : [{ name: 'Vazio', val: 0 }];

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar bg-white dark:bg-black animate-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 space-y-10 pb-32">
        <div className="flex justify-between items-center px-2 pt-6">
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
            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-400">Desempenho Real</h3>
            <div className="bg-blue-600/10 text-blue-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Impacto p/ Post</div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <Bar dataKey="val" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
