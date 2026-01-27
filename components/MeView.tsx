
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronRight, 
  X,
  Camera,
  Sun,
  Moon,
  LayoutDashboard,
  TrendingUp,
  Loader2,
  PlusCircle,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  Check
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

const DAYS_OF_WEEK = [
  { id: 'Dom', label: 'D' },
  { id: 'Seg', label: 'S' },
  { id: 'Ter', label: 'T' },
  { id: 'Qua', label: 'Q' },
  { id: 'Qui', label: 'Q' },
  { id: 'Sex', label: 'S' },
  { id: 'Sab', label: 'S' },
];

const MeView: React.FC<MeViewProps> = ({ session, business: initialBusiness, onUpdateBusiness, theme, onToggleTheme, onOpenDashboard }) => {
  const [activeView, setActiveView] = useState<'main' | 'edit-profile'>('main');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({
    name: '',
    bio: '',
    category: Category.SERVICES,
    location: '',
    logo: '',
    openTime: '09:00',
    closeTime: '18:00',
    selectedDays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
    whatsapp: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (initialBusiness) {
      const hoursStr = initialBusiness.hours || "Seg - Sex, 09:00 - 18:00";
      const parts = hoursStr.split(', ');
      const daysPart = parts[0] || "";
      
      let initialDays: string[] = [];
      if (daysPart.includes('-')) {
        const [start, end] = daysPart.split(' - ');
        const startIdx = DAYS_OF_WEEK.findIndex(d => d.id === start);
        const endIdx = DAYS_OF_WEEK.findIndex(d => d.id === end);
        if (startIdx !== -1 && endIdx !== -1) {
          for (let i = startIdx; i <= endIdx; i++) initialDays.push(DAYS_OF_WEEK[i].id);
        }
      } else {
        initialDays = daysPart.split(', ').filter(d => d.length > 0);
      }

      const timePart = parts.length > 1 ? parts[1] : "09:00 - 18:00";
      const [open = "09:00", close = "18:00"] = timePart.split(' - ');

      setFormData({
        name: initialBusiness.name || '',
        bio: initialBusiness.bio || '',
        category: initialBusiness.category || Category.SERVICES,
        location: initialBusiness.location || '',
        logo: initialBusiness.logo || '',
        openTime: open,
        closeTime: close,
        selectedDays: initialDays.length > 0 ? initialDays : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
        whatsapp: initialBusiness.contact?.whatsapp || '',
        phone: initialBusiness.contact?.phone || '',
        email: initialBusiness.contact?.email || ''
      });
    }
  }, [initialBusiness, activeView]);

  const toggleDay = (dayId: string) => {
    setFormData((prev: any) => {
      const isSelected = prev.selectedDays.includes(dayId);
      const newDays = isSelected 
        ? prev.selectedDays.filter((d: string) => d !== dayId)
        : [...prev.selectedDays, dayId];
      return { ...prev, selectedDays: newDays.sort((a: string, b: string) => 
        DAYS_OF_WEEK.findIndex(d => d.id === a) - DAYS_OF_WEEK.findIndex(d => d.id === b)
      )};
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && session) {
      setIsUploading(true);
      setError(null);
      try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `logos/${session.user.id}-${Date.now()}.${fileExt}`;
        const arrayBuffer = await file.arrayBuffer();
        
        const { data, error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, arrayBuffer, {
            contentType: file.type || 'image/jpeg',
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);
        setFormData((prev: any) => ({ ...prev, logo: publicUrl }));
        
        if (initialBusiness) {
          await supabase.from('businesses').update({ logo: publicUrl }).eq('id', initialBusiness.id);
          onUpdateBusiness({ ...initialBusiness, logo: publicUrl });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSaving(true);
    setError(null);

    let daysStr = formData.selectedDays.join(', ');
    const finalHours = `${daysStr}, ${formData.openTime} - ${formData.closeTime}`;
    
    const payload = {
      name: formData.name,
      bio: formData.bio,
      location: formData.location,
      category: formData.category,
      logo: formData.logo,
      hours: finalHours,
      owner_id: session.user.id,
      contact: {
        whatsapp: formData.whatsapp.replace(/\D/g, ''),
        phone: formData.phone,
        email: formData.email
      }
    };

    try {
      let error;
      if (initialBusiness) {
        ({ error } = await supabase.from('businesses').update(payload).eq('id', initialBusiness.id));
      } else {
        ({ error } = await supabase.from('businesses').insert(payload));
      }
      
      if (error) throw error;

      const { data: updated } = await supabase.from('businesses').select('*').eq('owner_id', session.user.id).single();
      if (updated) onUpdateBusiness(updated as any);
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setActiveView('main'); }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally { setIsSaving(false); }
  };

  return (
    <div className="h-full w-full relative bg-white dark:bg-black overflow-hidden flex flex-col">
      {/* VIEW PRINCIPAL */}
      <div className={`flex-1 flex flex-col overflow-y-auto hide-scrollbar transition-all duration-300 ${activeView === 'edit-profile' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <div className="px-6 py-10 flex flex-col items-center text-center space-y-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900 rounded-b-[3rem]">
          <div className="relative">
            <img src={initialBusiness?.logo || 'https://picsum.photos/200/200'} className="w-24 h-24 rounded-[2.5rem] object-cover shadow-2xl border-4 border-white dark:border-black" alt="Profile" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white border-4 border-white dark:border-zinc-950">
              <TrendingUp size={12} />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter leading-tight">{initialBusiness?.name || "Membro BizStream"}</h1>
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.3em]">{session.user.email}</p>
          </div>
        </div>

        <div className="p-6 space-y-6 pb-32">
          {!initialBusiness ? (
            <div className="p-8 bg-blue-600/5 border-2 border-dashed border-blue-600/20 rounded-[2.5rem] text-center space-y-4">
               <PlusCircle className="mx-auto text-blue-600" size={32} />
               <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest leading-relaxed">Crie seu perfil profissional para começar a publicar.</p>
               <button onClick={() => setActiveView('edit-profile')} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20">Configurar Agora</button>
            </div>
          ) : (
            <div className="space-y-4">
              <button onClick={onOpenDashboard} className="w-full flex items-center justify-between p-6 bg-blue-600 text-white rounded-[2rem] shadow-xl shadow-blue-600/10 active:scale-95 transition-all">
                <div className="flex items-center gap-4"><LayoutDashboard size={20} /><span className="text-[10px] font-black uppercase tracking-widest">Painel de Métricas</span></div>
                <TrendingUp size={16} />
              </button>
              
              <div className="bg-zinc-50 dark:bg-zinc-950 rounded-[2rem] border border-zinc-100 dark:border-zinc-900 overflow-hidden shadow-sm">
                 <button onClick={() => setActiveView('edit-profile')} className="w-full flex items-center justify-between p-5 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-900 transition-colors">
                    <div className="flex items-center gap-4"><Settings size={20} className="text-blue-500"/><span className="text-[10px] font-black uppercase text-black dark:text-white tracking-tight">Ajustes Profissionais</span></div>
                    <ChevronRight size={16} className="text-zinc-300"/>
                 </button>
                 <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">{theme === 'light' ? <Sun size={18} className="text-orange-500" /> : <Moon size={18} className="text-blue-500" />}<span className="text-[10px] font-black uppercase text-black dark:text-white">Modo Dark</span></div>
                    <button onClick={() => onToggleTheme(theme === 'light' ? 'dark' : 'light')} className={`w-10 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-zinc-200'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${theme === 'dark' ? 'left-5' : 'left-1'}`} /></button>
                 </div>
              </div>

              <div className="p-6 bg-zinc-50 dark:bg-zinc-950 rounded-[2rem] border border-zinc-100 dark:border-zinc-900 space-y-4">
                <h3 className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] ml-2">Atalhos de Contato</h3>
                <div className="grid grid-cols-3 gap-2">
                  <QuickContact icon={<MessageCircle size={16}/>} label="Whats" value={initialBusiness.contact?.whatsapp} />
                  <QuickContact icon={<Phone size={16}/>} label="Fone" value={initialBusiness.contact?.phone} />
                  <QuickContact icon={<Mail size={16}/>} label="Email" value={initialBusiness.contact?.email} />
                </div>
              </div>
            </div>
          )}
          <button onClick={() => supabase.auth.signOut()} className="w-full p-5 bg-zinc-50 dark:bg-zinc-900 text-red-600 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-zinc-100 dark:border-zinc-800 active:bg-red-50 transition-colors"><LogOut size={18} className="inline mr-2" /> Encerrar Sessão</button>
        </div>
      </div>

      {/* VIEW DE EDIÇÃO (OVERLAY) */}
      {activeView === 'edit-profile' && (
        <div className="absolute inset-0 bg-white dark:bg-black z-[100] flex flex-col animate-in slide-in-from-bottom duration-300">
          {/* Header Compacto */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-black shrink-0 relative z-10">
            <button onClick={() => setActiveView('main')} className="text-zinc-500 w-9 h-9 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center active:scale-90 transition-all"><X size={18} /></button>
            <h2 className="text-[9px] font-black uppercase tracking-widest text-black dark:text-white">Editar Perfil</h2>
            <div className="w-9" />
          </div>
          
          {/* Conteúdo com Scroll - Padding inferior aumentado para não esconder campos sob o botão fixo */}
          <div className="flex-1 overflow-y-auto px-5 py-6 hide-scrollbar pb-24">
            <div className="space-y-8">
              {/* Logo Circle */}
              <div className="flex flex-col items-center space-y-3">
                <div className="relative cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-[2.2rem] overflow-hidden border-2 border-blue-600/10 shadow-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                    {isUploading ? <Loader2 className="animate-spin text-blue-600" /> : <img src={formData.logo || 'https://picsum.photos/200/200'} className="w-full h-full object-cover" alt="Preview" />}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white border-2 border-white dark:border-black shadow-lg"><Camera size={14} /></div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
                </div>
              </div>

              <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-8">
                {/* Info Básica */}
                <div className="space-y-4">
                  <SectionHeader icon={<User size={12}/>} title="Identidade" />
                  <InputGroup label="Nome do Negócio" value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder="Ex: Studio Biz" />
                  
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-1">Categoria</label>
                    <select className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3.5 text-xs font-black text-black dark:text-white outline-none" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as Category})}>
                        {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                {/* Canais de Contato */}
                <div className="space-y-4">
                  <SectionHeader icon={<MessageCircle size={12}/>} title="Canais Diretos" />
                  <div className="grid grid-cols-2 gap-3">
                    <InputGroup 
                      icon={<MessageCircle size={12}/>} 
                      label="WhatsApp" 
                      value={formData.whatsapp} 
                      onChange={v => setFormData({...formData, whatsapp: v})} 
                      placeholder="DDD + Número" 
                    />
                    <InputGroup 
                      icon={<Phone size={12}/>} 
                      label="Telefone" 
                      value={formData.phone} 
                      onChange={v => setFormData({...formData, phone: v})} 
                      placeholder="Fixo/Celular" 
                    />
                  </div>
                  <InputGroup icon={<Mail size={12}/>} label="E-mail" value={formData.email} onChange={v => setFormData({...formData, email: v})} placeholder="contato@voce.com" />
                  <InputGroup icon={<MapPin size={12}/>} label="Cidade / Localização" value={formData.location} onChange={v => setFormData({...formData, location: v})} placeholder="Ex: São Paulo, SP" />
                </div>

                {/* Horários e Dias */}
                <div className="space-y-4">
                  <SectionHeader icon={<Clock size={12}/>} title="Dias e Horários" />
                  
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-1">Selecione os Dias</label>
                    <div className="flex justify-between gap-1">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          className={`flex-1 h-9 rounded-lg text-[10px] font-black transition-all flex items-center justify-center ${formData.selectedDays.includes(day.id) ? 'bg-blue-600 text-white' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border border-zinc-100 dark:border-zinc-800'}`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <InputGroup label="Abre às" value={formData.openTime} onChange={v => setFormData({...formData, openTime: v})} type="time" />
                    <InputGroup label="Fecha às" value={formData.closeTime} onChange={v => setFormData({...formData, closeTime: v})} type="time" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-1">Bio Profissional</label>
                  <textarea className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 text-xs font-bold border border-zinc-100 dark:border-zinc-800 text-black dark:text-white h-20 resize-none outline-none" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                </div>
              </form>
            </div>
          </div>

          {/* Botão Floating Slim Fixo - Sem aba preta em volta */}
          <div className="absolute bottom-6 left-6 right-6 z-[110] pointer-events-none">
            <button 
              form="profile-form"
              type="submit" 
              disabled={isSaving || isUploading} 
              className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-2 pointer-events-auto ${saveSuccess ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}
            >
              {isSaving ? <Loader2 className="animate-spin" size={12}/> : saveSuccess ? <Check size={12}/> : null}
              {isSaving ? 'Salvando...' : saveSuccess ? 'Sucesso!' : 'Confirmar Ajustes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 px-1 pb-1.5 border-b border-zinc-50 dark:border-zinc-900">
    <div className="text-blue-500">{icon}</div>
    <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">{title}</h3>
  </div>
);

const QuickContact: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => (
  <div className={`p-4 rounded-2xl flex flex-col items-center gap-1 border border-zinc-100 dark:border-zinc-800 transition-opacity ${value ? 'opacity-100' : 'opacity-30'}`}>
    <div className="text-blue-500">{icon}</div>
    <span className="text-[7px] font-black uppercase text-zinc-400">{label}</span>
  </div>
);

const InputGroup: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: React.ReactNode }> = ({ label, value, onChange, placeholder, type = "text", icon }) => (
  <div className="space-y-1.5 flex-1">
    <div className="flex items-center gap-1.5 ml-1">
      {icon && <div className="text-zinc-400">{icon}</div>}
      <label className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">{label}</label>
    </div>
    <input 
      type={type} 
      placeholder={placeholder}
      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 text-xs font-black text-black dark:text-white outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);

export default MeView;
