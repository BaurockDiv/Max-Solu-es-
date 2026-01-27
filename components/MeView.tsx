
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronRight, 
  ShieldCheck, 
  X,
  Camera,
  Sun,
  Moon,
  LayoutDashboard,
  TrendingUp,
  Award,
  Loader2,
  EyeOff,
  MessageSquareOff,
  Database,
  Trash2,
  ShieldAlert,
  BellRing,
  Lock,
  KeyRound,
  PlusCircle
} from 'lucide-react';
import { Business, Category } from '../types';

interface MeViewProps {
  session: any;
  business: Business | null;
  onUpdateBusiness: (updated: Business) => void;
  theme: 'light' | 'dark';
  onToggleTheme: (theme: 'light' | 'dark') => void;
  onOpenDashboard: () => void;
}

type SettingsView = 'main' | 'edit-profile' | 'privacy';

const DAYS_OF_WEEK = [
  { label: 'D', value: 'Dom' }, { label: 'S', value: 'Seg' }, { label: 'T', value: 'Ter' },
  { label: 'Q', value: 'Qua' }, { label: 'Q', value: 'Qui' }, { label: 'S', value: 'Sex' }, { label: 'S', value: 'Sab' },
];

const MeView: React.FC<MeViewProps> = ({ session, business: initialBusiness, onUpdateBusiness, theme, onToggleTheme, onOpenDashboard }) => {
  const [activeView, setActiveView] = useState<SettingsView>('main');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formData, setFormData] = useState<any>({
    name: '',
    bio: '',
    category: Category.SERVICES,
    location: '',
    logo: '',
    openTime: '09:00',
    closeTime: '18:00',
    selectedDays: []
  });

  useEffect(() => {
    if (initialBusiness) {
      const hoursStr = initialBusiness.hours || "";
      const [daysPart = "Seg - Sex", timePart = "09:00 - 18:00"] = hoursStr.split(', ');
      const [open = "09:00", close = "18:00"] = timePart.split(' - ');

      let initialDays: string[] = [];
      if (daysPart === "Diariamente") {
        initialDays = DAYS_OF_WEEK.map(d => d.value);
      } else if (daysPart.includes(' - ')) {
        const [start, end] = daysPart.split(' - ');
        const startIndex = DAYS_OF_WEEK.findIndex(d => d.value === start);
        const endIndex = DAYS_OF_WEEK.findIndex(d => d.value === end);
        if (startIndex !== -1 && endIndex !== -1) initialDays = DAYS_OF_WEEK.slice(startIndex, endIndex + 1).map(d => d.value);
      } else if (daysPart.includes(' / ')) {
        initialDays = daysPart.split(' / ');
      }

      setFormData({
        name: initialBusiness.name || '',
        bio: initialBusiness.bio || '',
        category: initialBusiness.category || Category.SERVICES,
        location: initialBusiness.location || '',
        logo: initialBusiness.logo || '',
        openTime: open,
        closeTime: close,
        selectedDays: initialDays.filter(Boolean)
      });
    }
  }, [initialBusiness, activeView]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && session) {
      setIsUploading(true);
      try {
        const fileName = `${session.user.id}/${Date.now()}_logo.jpg`;
        const { data, error } = await supabase.storage.from('logos').upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(data.path);
        setFormData((prev: any) => ({ ...prev, logo: publicUrl }));
        if (initialBusiness) {
          await supabase.from('businesses').update({ logo: publicUrl }).eq('id', initialBusiness.id);
          onUpdateBusiness({ ...initialBusiness, logo: publicUrl });
        }
      } catch (err: any) {
        alert("Erro no upload: " + err.message);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("O nome do negócio é obrigatório.");
    
    setIsSaving(true);
    let daysStr = formData.selectedDays.length === 7 ? "Diariamente" : 
                 formData.selectedDays.length === 0 ? "Dias a Combinar" : 
                 formData.selectedDays.join(' / ');
    
    const finalHours = `${daysStr}, ${formData.openTime} - ${formData.closeTime}`;
    const payload = {
      name: formData.name,
      bio: formData.bio,
      location: formData.location,
      category: formData.category,
      logo: formData.logo,
      hours: finalHours,
      owner_id: session.user.id
    };

    try {
      let error;
      if (initialBusiness) {
        ({ error } = await supabase.from('businesses').update(payload).eq('id', initialBusiness.id));
      } else {
        ({ error } = await supabase.from('businesses').insert(payload));
      }
      
      if (error) {
        if (error.code === '23505') throw new Error("Você já possui um perfil profissional cadastrado.");
        throw error;
      }

      const { data: updated } = await supabase.from('businesses').select('*').eq('owner_id', session.user.id).single();
      if (updated) onUpdateBusiness(updated as any);

      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setActiveView('main'); }, 1500);
    } catch (err: any) {
      alert(err.message || "Erro ao salvar perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditProfile = () => (
    <div className="absolute inset-0 bg-white dark:bg-black z-[60] animate-in slide-in-from-right duration-300 overflow-y-auto pb-32">
      <div className="flex items-center justify-between p-5 sticky top-0 bg-white dark:bg-black z-20 border-b border-zinc-100 dark:border-zinc-900">
        <button onClick={() => setActiveView('main')} className="text-zinc-500 w-9 h-9 rounded-lg flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"><X size={18} /></button>
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-black dark:text-white">Configurar Negócio</h2>
        <div className="w-9" />
      </div>
      
      <div className="p-6 flex flex-col items-center">
        <div className="relative group cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
          <div className="w-28 h-28 rounded-[2.2rem] overflow-hidden border-4 border-blue-600/10 shadow-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
            {isUploading ? <Loader2 className="animate-spin text-blue-600" size={32} /> : <img src={formData.logo || 'https://picsum.photos/200/200'} className="w-full h-full object-cover" alt="Logo" />}
          </div>
          <div className="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white border-4 border-white dark:border-black shadow-lg"><Camera size={16} /></div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="px-5 space-y-5">
        <InputGroup label="Nome Fantasia" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-2">Área de Atuação</label>
            <select className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 text-xs font-black text-black dark:text-white outline-none" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as Category})}>
              {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <InputGroup label="Cidade / Base" value={formData.location} onChange={v => setFormData({...formData, location: v})} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-2">Apresentação Estratégica</label>
          <textarea placeholder="Ex: Especialista em branding para startups com 10 anos de mercado..." className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-xl p-3 text-xs font-bold h-24 resize-none border border-zinc-100 dark:border-zinc-800 text-black dark:text-white" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
        </div>
        <button type="submit" disabled={isSaving} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${saveSuccess ? 'bg-green-600' : 'bg-blue-600 text-white'} shadow-lg active:scale-95`}>
          {isSaving ? 'Salvando Dados...' : saveSuccess ? 'Perfil Atualizado!' : initialBusiness ? 'Salvar Mudanças' : 'Publicar Perfil Profissional'}
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-black pb-24 relative overflow-hidden transition-colors duration-500">
      {activeView === 'edit-profile' && renderEditProfile()}
      
      <div className="px-6 py-8 flex flex-col items-center text-center space-y-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900 rounded-b-[3rem]">
        <img src={initialBusiness?.logo || 'https://picsum.photos/200/200'} className="w-24 h-24 rounded-[2.5rem] object-cover shadow-xl border-4 border-white dark:border-black" alt="Avatar" />
        <div className="space-y-0.5">
          <h1 className="text-2xl font-black text-black dark:text-white tracking-tighter uppercase">{initialBusiness?.name || "Membro BizStream"}</h1>
          <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.3em]">{session.user.email}</p>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {!initialBusiness ? (
          <div className="p-6 bg-blue-600/5 border-2 border-dashed border-blue-600/20 rounded-[2rem] text-center space-y-4">
             <PlusCircle className="mx-auto text-blue-600" size={32} />
             <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest leading-relaxed">Sua jornada profissional começa com um perfil de impacto.</p>
             <button onClick={() => setActiveView('edit-profile')} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20">Criar Portfólio Digital</button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.4em] px-2">Gestão Estratégica</h3>
            <button onClick={onOpenDashboard} className="w-full flex items-center justify-between p-5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/10 active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                 <LayoutDashboard size={20} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-left">Dashboard de Performance</span>
              </div>
              <TrendingUp size={16} />
            </button>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.4em] px-2">Preferências</h3>
          <div className="bg-zinc-50 dark:bg-zinc-950 rounded-[1.8rem] overflow-hidden border border-zinc-100 dark:border-zinc-900 shadow-sm">
            <MenuButton icon={<Settings size={20} />} label="Ajustes do Perfil" onClick={() => setActiveView('edit-profile')} />
            <div className="p-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900">
               <div className="flex items-center gap-4">
                  <div className="text-zinc-400">{theme === 'light' ? <Sun size={18}/> : <Moon size={18}/>}</div>
                  <span className="text-[10px] font-black uppercase text-black dark:text-white tracking-tight">Dark Mode</span>
               </div>
               <button onClick={() => onToggleTheme(theme === 'light' ? 'dark' : 'light')} className={`w-10 h-6 rounded-full relative transition-all ${theme === 'dark' ? 'bg-blue-600' : 'bg-zinc-200'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${theme === 'dark' ? 'left-5' : 'left-1'}`} />
               </button>
            </div>
          </div>
        </div>

        <button onClick={() => supabase.auth.signOut()} className="w-full p-5 bg-zinc-50 dark:bg-zinc-900 text-red-600 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] border border-zinc-100 dark:border-zinc-800 transition-colors hover:bg-red-50 dark:hover:bg-red-900/10">
          <LogOut size={18} className="inline mr-2" /> Encerrar Sessão
        </button>
      </div>
    </div>
  );
};

const InputGroup: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-1.5 flex-1">
    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-2">{label}</label>
    <input type="text" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 text-xs font-black text-black dark:text-white outline-none focus:ring-1 focus:ring-blue-500 transition-all" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

const MenuButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors border-b border-zinc-100 dark:border-zinc-900 last:border-0">
    <div className="flex items-center gap-4">
      <div className="text-blue-500">{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-tight text-black dark:text-white">{label}</span>
    </div>
    <ChevronRight size={16} className="text-zinc-300" />
  </button>
);

export default MeView;
