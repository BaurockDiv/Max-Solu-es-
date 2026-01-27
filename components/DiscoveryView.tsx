
import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, TrendingUp, Grid, ChevronRight, X, Loader2, Filter, CheckCircle2, SlidersHorizontal, SortAsc, Star } from 'lucide-react';
import { Category, Business } from '../types';
import { supabase } from '../lib/supabase';

interface DiscoveryViewProps {
  onBusinessClick: (id: string) => void;
}

const DiscoveryView: React.FC<DiscoveryViewProps> = ({ onBusinessClick }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Novos estados de filtro
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'verified'>('verified');
  // Novo estado para raio de busca
  const [radius, setRadius] = useState(10);

  const categories = Object.values(Category);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('name');

      if (error) throw error;
      if (data) setBusinesses(data as any);
    } catch (err) {
      console.error("Erro ao buscar empresas:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBusinesses = useMemo(() => {
    let result = businesses.filter(biz => {
      const matchesSearch = biz.name.toLowerCase().includes(search.toLowerCase()) ||
        (biz.bio && biz.bio.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategory ? biz.category === selectedCategory : true;
      const matchesVerified = onlyVerified ? biz.verified : true;
      const matchesLocation = locationFilter ? biz.location?.toLowerCase().includes(locationFilter.toLowerCase()) : true;

      return matchesSearch && matchesCategory && matchesVerified && matchesLocation;
    });

    // Lógica de Ordenação
    return result.sort((a, b) => {
      if (sortBy === 'verified') {
        if (a.verified === b.verified) return a.name.localeCompare(b.name);
        return a.verified ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [search, selectedCategory, businesses, onlyVerified, locationFilter, sortBy]);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory(null);
    setOnlyVerified(false);
    setLocationFilter('');
    setSortBy('verified');
    setRadius(10);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-black transition-colors duration-500 overflow-hidden">
      {/* Header Fixo com Busca */}
      <div className="p-6 pb-4 space-y-4 shrink-0 bg-white dark:bg-black z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white italic">Descobrir</h1>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${showAdvancedFilters ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'}`}
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-600 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Empresa, serviço ou talento..."
            className="w-full bg-zinc-200 dark:bg-zinc-900 rounded-[1.5rem] py-5 pl-12 pr-12 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all border-none placeholder:text-zinc-500 text-zinc-950 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Painel de Filtros Avançados Expansível */}
        {showAdvancedFilters && (
          <div className="p-5 bg-zinc-100 dark:bg-zinc-950 rounded-[2rem] border border-zinc-300 dark:border-zinc-900 animate-in slide-in-from-top-2 duration-300 space-y-5 shadow-lg">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOnlyVerified(!onlyVerified)}
                className={`py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${onlyVerified ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white dark:bg-black border-zinc-300 dark:border-zinc-800 text-zinc-600'}`}
              >
                <CheckCircle2 size={14} /> Verificados
              </button>
              <button
                onClick={() => setSortBy(sortBy === 'name' ? 'verified' : 'name')}
                className={`py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all bg-white dark:bg-black border-zinc-300 dark:border-zinc-800 text-zinc-600`}
              >
                {sortBy === 'name' ? <SortAsc size={14} /> : <Star size={14} />}
                {sortBy === 'name' ? 'A-Z' : 'Relevância'}
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-1">Localização e Raio ({radius}km)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                <input
                  type="text"
                  placeholder="Cidade ou Bairro..."
                  className="w-full bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 rounded-xl py-3 pl-9 pr-4 text-[11px] font-bold text-zinc-950 dark:text-white outline-none focus:ring-1 focus:ring-blue-600"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <button onClick={clearFilters} className="w-full text-[9px] font-black text-blue-700 uppercase tracking-widest pt-1">Redefinir Filtros</button>
          </div>
        )}
      </div>

      {/* Area de Conteúdo Scrollable */}
      <div className="flex-1 overflow-y-auto hide-scrollbar smooth-scroll animate-gpu touch-pan-y">
        <div className="p-6 pt-0 space-y-8 pb-32">
          {/* Categorias - Estilo Mini & Expansível */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Segmentos ({categories.length})</h2>
              {selectedCategory && (
                <button onClick={() => setSelectedCategory(null)} className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Ver Todos</button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-[0.95] ${selectedCategory === cat ? 'border-blue-600 bg-blue-600 text-white shadow-lg' : 'border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900 shadow-sm'}`}
                >
                  <Grid size={selectedCategory === cat ? 18 : 14} className={selectedCategory === cat ? 'text-white' : 'text-zinc-400'} />
                  <span className={`text-[8px] font-black uppercase tracking-tighter text-center mt-1.5 line-clamp-1 ${selectedCategory === cat ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {cat.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Listagem de Empresas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <Filter size={14} /> Resultados ({filteredBusinesses.length})
              </h2>
              {loading && <Loader2 className="animate-spin text-blue-600" size={14} />}
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center py-20 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-600" size={24} />
                  </div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 tracking-[0.3em]">Escaneando Rede...</p>
                </div>
              ) : filteredBusinesses.length > 0 ? filteredBusinesses.map((biz) => (
                <div
                  key={biz.id}
                  onClick={() => onBusinessClick(biz.id)}
                  className="flex items-center p-4 rounded-[2.2rem] border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/20 active:scale-[0.98] transition-all bg-white dark:bg-zinc-900 shadow-sm group"
                >
                  <div className="relative">
                    <img src={biz.logo || 'https://picsum.photos/200/200'} className="w-16 h-16 rounded-[1.6rem] object-cover shadow-lg border border-zinc-200 dark:border-zinc-800" alt={biz.name} />
                    {biz.verified && (
                      <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-1 border-2 border-white dark:border-zinc-900">
                        <CheckCircle2 size={10} className="text-white fill-white/20" />
                      </div>
                    )}
                  </div>

                  <div className="ml-5 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-black text-zinc-950 dark:text-white uppercase tracking-tight">{biz.name}</h3>
                    </div>
                    <p className="text-[10px] text-zinc-700 dark:text-zinc-400 font-bold line-clamp-1 opacity-80">{biz.bio || 'Profissional Certificado Max Company'}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">{biz.category.split('&')[0]}</span>
                      <div className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                      <div className="flex items-center gap-1 text-[8px] text-zinc-600 dark:text-zinc-400 font-black uppercase tracking-widest">
                        <MapPin size={10} className="text-zinc-400" />
                        <span>{biz.location?.split(',')[0] || 'Remoto'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <ChevronRight size={18} className="text-zinc-400 group-hover:text-white" />
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 px-10 bg-zinc-50 dark:bg-zinc-900/30 rounded-[3rem] border-2 border-dashed border-zinc-100 dark:border-zinc-900 space-y-6">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto text-zinc-300">
                    <Search size={32} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-zinc-900 dark:text-zinc-400 font-black uppercase text-xs tracking-widest">Nenhum resultado</p>
                    <p className="text-zinc-400 text-[10px] leading-relaxed uppercase font-medium">Não encontramos profissionais para estes filtros na sua região atual.</p>
                  </div>
                  <button onClick={clearFilters} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/10 active:scale-95 transition-all">Limpar Tudo</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoveryView;
