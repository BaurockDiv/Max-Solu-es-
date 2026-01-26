
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
// Added Loader2 to the imports from lucide-react to fix the build error
import { Eye, MousePointer2, MessageSquare, Share2, PlusCircle, TrendingUp, Sparkles, Loader2 } from 'lucide-react';

const viewData = [
  { name: 'Seg', val: 400 }, { name: 'Ter', val: 300 }, { name: 'Qua', val: 200 },
  { name: 'Qui', val: 278 }, { name: 'Sex', val: 189 }, { name: 'Sab', val: 239 }, { name: 'Dom', val: 349 },
];

const clickData = [
  { name: 'Seg', val: 24 }, { name: 'Ter', val: 13 }, { name: 'Qua', val: 9 },
  { name: 'Qui', val: 39 }, { name: 'Sex', val: 48 }, { name: 'Sab', val: 38 }, { name: 'Dom', val: 43 },
];

const DashboardView: React.FC = () => {
  const [activeMetric, setActiveMetric] = useState<'views' | 'clicks'>('views');
  const [isBoosting, setIsBoosting] = useState<number | null>(null);

  const handleBoost = (id: number) => {
    setIsBoosting(id);
    setTimeout(() => {
      setIsBoosting(null);
      alert("Impulsionamento configurado com sucesso! Seus anúncios começarão em instantes.");
    }, 1500);
  };

  return (
    <div className="p-5 space-y-6 bg-white dark:bg-zinc-950 min-h-full pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Hub</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Artisan Brews Analytics</p>
        </div>
        <button className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 active:scale-90 transition-transform">
            <PlusCircle size={22} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          active={activeMetric === 'views'}
          onClick={() => setActiveMetric('views')}
          icon={<Eye className="text-blue-500" size={18} />} 
          label="Visualizações" 
          value="2.4k" 
          change="+12%" 
        />
        <StatCard 
          active={activeMetric === 'clicks'}
          onClick={() => setActiveMetric('clicks')}
          icon={<MousePointer2 className="text-green-500" size={18} />} 
          label="Cliques Link" 
          value="184" 
          change="+5%" 
        />
        <StatCard icon={<MessageSquare className="text-purple-500" size={18} />} label="Consultas" value="24" change="-2%" />
        <StatCard icon={<Share2 className="text-orange-500" size={18} />} label="Shares" value="56" change="+24%" />
      </div>

      <div className="p-5 bg-zinc-50 dark:bg-zinc-900 rounded-3xl space-y-5 border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            Tendência Semanal: <span className="text-blue-600 font-extrabold">{activeMetric === 'views' ? 'Alcance' : 'Conversão'}</span>
          </h3>
          <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded-full">
            <TrendingUp size={12} /> Em Alta
          </div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeMetric === 'views' ? viewData : clickData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#9ca3af', fontWeight: 600}} />
              <Tooltip 
                cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} 
                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#18181b', color: '#fff'}} 
              />
              <Bar dataKey="val" radius={[6, 6, 0, 0]}>
                {(activeMetric === 'views' ? viewData : clickData).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={activeMetric === 'views' ? '#3b82f6' : '#22c55e'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold px-1 flex items-center justify-between">
          Posts Ativos 
          <span className="text-[10px] text-zinc-400 font-normal">Últimos 7 dias</span>
        </h3>
        <div className="space-y-3">
            {[1, 2].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm hover:border-blue-500/50 transition-colors">
                    <img src={`https://picsum.photos/seed/${i+50}/100/100`} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1">
                        <p className="text-xs font-bold line-clamp-1">Estratégia matinal com grãos selecionados...</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-400 font-bold">
                            <span className="flex items-center gap-1"><Eye size={10} /> 1.2k</span>
                            <span className="flex items-center gap-1"><MessageSquare size={10} /> 45</span>
                        </div>
                    </div>
                    <button 
                      onClick={() => handleBoost(i)}
                      disabled={isBoosting === i}
                      className={`text-[10px] font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${isBoosting === i ? 'bg-zinc-100 text-zinc-400' : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 active:scale-95 hover:bg-blue-100'}`}
                    >
                        {isBoosting === i ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {isBoosting === i ? 'Processando' : 'Boost'}
                    </button>
                </div>
            ))}
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
      <div className={`p-2 rounded-xl ${active ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'bg-white dark:bg-zinc-800'}`}>{icon}</div>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${change.startsWith('+') ? 'text-green-600 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>{change}</span>
    </div>
    <div className="pt-3">
      <div className="text-xl font-extrabold tracking-tight">{value}</div>
      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{label}</div>
    </div>
  </div>
);

export default DashboardView;
