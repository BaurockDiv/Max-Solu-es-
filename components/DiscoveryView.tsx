
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
    <div className="flex flex-col min-h-full bg-white dark:bg-zinc-950 p-4 space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Descoberta</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar empresas, serviços, produtos..."
            className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Categorias</h2>
          {selectedCategory && (
            <button onClick={() => setSelectedCategory(null)} className="text-blue-600 text-xs font-bold">Limpar</button>
          )}
        </div>
        <div className="flex overflow-x-auto gap-3 hide-scrollbar pb-2">
          {categories.map((cat) => (
            <div 
              key={cat} 
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`h-24 min-w-[120px] rounded-2xl p-3 flex flex-col justify-end relative overflow-hidden active:scale-95 transition-all cursor-pointer border-2 ${selectedCategory === cat ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent bg-zinc-100 dark:bg-zinc-900'}`}
            >
              <Grid size={20} className={selectedCategory === cat ? 'text-blue-500' : 'text-zinc-400'} />
              <span className={`text-[11px] font-bold leading-tight mt-2 ${selectedCategory === cat ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-600 dark:text-zinc-400'}`}>
                {cat}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <MapPin size={16} /> {selectedCategory ? `Resultados em ${selectedCategory}` : 'Próximo a você'}
          </h2>
          <button className="text-blue-600 text-sm font-medium">Asheville, NC</button>
        </div>
        
        <div className="space-y-3 pb-20">
          {filteredBusinesses.length > 0 ? filteredBusinesses.map((biz) => (
            <div 
              key={biz.id} 
              onClick={() => onBusinessClick(biz.id)}
              className="flex items-center p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer active:scale-[0.98] bg-white dark:bg-zinc-900/50 shadow-sm"
            >
              <img src={biz.logo} className="w-14 h-14 rounded-xl object-cover shadow-sm" alt={biz.name} />
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-bold">{biz.name}</h3>
                <p className="text-xs text-zinc-500 line-clamp-1 mb-1">{biz.bio}</p>
                <div className="flex items-center text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                  <span className="flex items-center gap-0.5 text-yellow-500">
                    <TrendingUp size={12} /> {biz.rating}
                  </span>
                  <span className="mx-2 opacity-30">|</span>
                  <span>{biz.location.split(',')[0]}</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                <ChevronRight size={18} className="text-zinc-400" />
              </div>
            </div>
          )) : (
            <div className="text-center py-10 space-y-2">
              <p className="text-zinc-400 text-sm">Nenhum resultado encontrado.</p>
              <button onClick={() => {setSearch(''); setSelectedCategory(null);}} className="text-blue-600 text-xs font-bold">Resetar Filtros</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscoveryView;
