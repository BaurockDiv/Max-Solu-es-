
import React, { useState, useMemo } from 'react';
import { Search, MapPin, TrendingUp, Grid, ChevronRight, X } from 'lucide-react';
import { Category } from '../types';
import { MOCK_BUSINESSES } from '../data';

interface DiscoveryViewProps {
  onBusinessClick: (id: string) => void;
}

const DiscoveryView: React.FC<DiscoveryViewProps> = ({ onBusinessClick }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const categories = Object.values(Category);
  
  const filteredBusinesses = useMemo(() => {
    return Object.values(MOCK_BUSINESSES).filter(biz => {
      const matchesSearch = biz.name.toLowerCase().includes(search.toLowerCase()) || 
                            biz.bio.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory ? biz.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-black p-6 space-y-8 transition-colors duration-500 overflow-y-auto pb-32">
      <div className="space-y-5">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Descoberta</h1>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar empresas, serviços, talentos..."
            className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-[1.5rem] py-5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border-none placeholder:text-zinc-400 text-zinc-900 dark:text-white shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Categorias</h2>
          {selectedCategory && (
            <button onClick={() => setSelectedCategory(null)} className="text-blue-600 text-[10px] font-black uppercase tracking-widest">Limpar</button>
          )}
        </div>
        <div className="flex overflow-x-auto gap-4 hide-scrollbar pb-2">
          {categories.map((cat) => (
            <div 
              key={cat} 
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`h-28 min-w-[140px] rounded-[2rem] p-4 flex flex-col justify-end relative overflow-hidden active:scale-95 transition-all cursor-pointer border-2 ${selectedCategory === cat ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-zinc-50 dark:border-transparent bg-zinc-50 dark:bg-zinc-900 shadow-sm'}`}
            >
              <Grid size={24} className={selectedCategory === cat ? 'text-blue-500' : 'text-zinc-300 dark:text-zinc-600'} />
              <span className={`text-[11px] font-black leading-tight mt-3 uppercase tracking-tighter ${selectedCategory === cat ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {cat}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
            <MapPin size={16} /> Próximo a você
          </h2>
          <button className="text-blue-600 text-[10px] font-black uppercase tracking-widest">São Paulo, BR</button>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {filteredBusinesses.length > 0 ? filteredBusinesses.map((biz) => (
            <div 
              key={biz.id} 
              onClick={() => onBusinessClick(biz.id)}
              className="flex items-center p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer active:scale-[0.98] bg-white dark:bg-zinc-900 shadow-sm"
            >
              <img src={biz.logo} className="w-16 h-16 rounded-[1.4rem] object-cover shadow-md" alt={biz.name} />
              <div className="ml-5 flex-1 overflow-hidden">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight truncate">{biz.name}</h3>
                <p className="text-[11px] text-zinc-500 font-medium line-clamp-1 mb-1">{biz.bio}</p>
                <div className="flex items-center text-[9px] text-zinc-400 font-black uppercase tracking-widest">
                  <span className="flex items-center gap-1 text-blue-500">
                    <TrendingUp size={12} /> {biz.rating}
                  </span>
                  <span className="mx-3 opacity-20 text-zinc-900 dark:text-white">|</span>
                  <span className="truncate">{biz.location.split(',')[0]}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <ChevronRight size={18} className="text-zinc-400" />
              </div>
            </div>
          )) : (
            <div className="text-center py-20 space-y-4">
              <p className="text-zinc-300 font-black uppercase text-xs tracking-widest">Sem resultados</p>
              <button onClick={() => {setSearch(''); setSelectedCategory(null);}} className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-blue-600">Resetar Filtros</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscoveryView;
