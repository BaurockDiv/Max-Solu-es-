
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
  Check,
  AlertCircle,
  ShieldCheck,
  KeyRound
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
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success'>('idle');

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
      const hoursStr = initialBusiness.hours || "Seg, Ter, Qua, Qui, Sex, 09:00 - 18:00";
      const parts = hoursStr.split(', ');
      const daysFound = parts.filter(p => DAYS_OF_WEEK.some(d => d.id === p));
      const timePart = parts[parts.length - 1] || "09:00 - 18:00";
      const [open = "09:00", close = "18:00"] = timePart.includes(' - ') ? timePart.split(' - ') : ["09:00", "18:00"];

      setFormData({
        name: initialBusiness.name || '',
        bio: initialBusiness.bio || '',
        category: initialBusiness.category || Category.SERVICES,
        location: initialBusiness.location || '',
        logo: initialBusiness.logo || '',
        openTime: open.trim(),
        closeTime: close.trim(),
        selectedDays: daysFound.length > 0 ? daysFound : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
        whatsapp: initialBusiness.whatsapp || '',
        phone: initialBusiness.phone || '',
        email: initialBusiness.email || ''
      });
    }
  }, [initialBusiness, activeView]);

  const handlePasswordReset = async () => {
    setResetStatus('loading');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setResetStatus('success');
      setTimeout(() => setResetStatus('idle'), 5000);
    } catch (err) {
      alert("Erro ao solicitar redefinição: " + (err as Error).message);
      setResetStatus('idle');
    }
  };

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
          .upload(fileName, arrayBuffer, { contentType: file.type || 'image/jpeg', upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);
        setFormData((prev: any) => ({ ...prev, logo: publicUrl }));
        
        if (initialBusiness) {
          await supabase.from('businesses').update({ logo: publicUrl }).eq('id', initialBusiness.id);
          const { data: updated } = await supabase.from('businesses').select('*').eq('id', initialBusiness.id).single();
          if (updated) onUpdateBusiness(updated as any);
        }
      } catch (err: any) {
        setError(err.message);
      } finally { setIsUploading(false); }
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) return setError("O nome do negócio é obrigatório.");

    setIsSaving(true);
    setError(null);

    const daysStr = formData.selectedDays.join(', ');
    const finalHours = `${daysStr}, ${formData.openTime} - ${formData.closeTime}`;
    
    const payload = {
      name: formData.name,
      bio: formData.bio,
      location: formData.location,
      category: formData.category,
      logo: formData.logo,
      hours: finalHours,
      owner_id: session.user.id,
      whatsapp: formData.whatsapp.toString().replace(/\D/g, ''),
      phone: formData.phone,
      email: formData.email
    };

    try {
      let result;
      if (initialBusiness) {
        result = await supabase.from('businesses').update(payload).eq('id', initialBusiness.id);
      } else {
        result = await supabase.from('businesses').insert(payload);
      }
      
      if (result.error) throw result.error;

      const { data: updated } = await supabase.from('businesses').select('*').eq('owner_id', session.user.id).single();
      if (updated) {
        onUpdateBusiness(updated as any);
        setSaveSuccess(true);
        setTimeout(() => { setSaveSuccess(false); setActiveView('main'); }, 1200);
      }
    } catch (err: any) {
      setError(err.message);
    } finally { setIsSaving(false); }
  };

  return (
    <div className="flex-1 flex flex-col relative bg-white dark:bg-black overflow-hidden animate-gpu">
      {/* VIEW PRINCIPAL */}
      <div className={`flex-1 flex flex-col overflow-y-auto hide-scrollbar transition-all duration-300 ${activeView === 'edit-profile' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <div className="px-6 py-14 flex flex-col items-center text-center space-y-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900 rounded-b-[4rem] flex-shrink-0">
          <div className="relative">
            <div className="w-24 h-24 rounded-[2.5rem] p-1 bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-2xl">
              <img src={initialBusiness?.logo || 'https://picsum.photos/200/200'} className="w-full h-full rounded-[2.3rem] object-cover border-[3px] border-white dark:border-black" alt="Profile" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white border-4 border-white dark:border-zinc-950">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter italic leading-tight">{initialBusiness?.name || "Biz Professional"}</h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.3em]">{session.user.email}</p>
          </div>
        </div>

        <div className="p-6 space-y-6 pb-28">
          {!initialBusiness ? (
            <div className="p-12 bg-blue-600/5 border-2 border-dashed border-blue-600/20 rounded-[2.5rem] text-center space-y-5">
               <PlusCircle className="mx-auto text-blue-600" size={44} />
               <p className="text-[11px] font-black uppercase text-zinc-500 tracking-[0.2em] leading-relaxed">Ative sua presença profissional na rede.</p>
               <button onClick={() => setActiveView('edit-profile')} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Começar Agora</button>
            </div>
          ) : (
            <div className="space-y-4">
              <button onClick={onOpenDashboard} className="w-full flex items-center justify-between p-6 bg-blue-600 text-white rounded-[2.4rem] shadow-xl shadow-blue-600/10 active:scale-[0.98] transition-all">
                <div className="flex items-center gap-4"><LayoutDashboard size={22} /><span className="text-[11px] font-black uppercase tracking-widest">Painel de Métricas</span></div>
                <TrendingUp size={18} />
              </button>
              
              <div className="bg-zinc-50 dark:bg-zinc-950 rounded-[2.4rem] border border-zinc-100 dark:border-zinc-900 overflow-hidden shadow-sm">
                 <button onClick={() => setActiveView('edit-profile')} className="w-full flex items-center justify-between p-6 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-900 transition-colors">
                    <div className="flex items-center gap-4"><Settings size={22} className="text-blue-500"/><span className="text-[11px] font-black uppercase text-black dark:text-white tracking-tight">Editar Negócio</span></div>
                    <ChevronRight size={20} className="text-zinc-300"/>
                 </button>
                 
                 {/* Nova Seção de Segurança */}
                 <div className="p-6 flex flex-col gap-4 border-b border-zinc-100 dark:border-zinc-900">
                    <div className="flex items-center gap-4"><ShieldCheck size={22} className="text-zinc-400"/><span className="text-[11px] font-black uppercase text-black dark:text-white tracking-tight">Segurança da Conta</span></div>
                    <button 
                      onClick={handlePasswordReset}
                      disabled={resetStatus !== 'idle'}
                      className={`w-full py-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-3 active:scale-95 ${resetStatus === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}
                    >
                      {resetStatus === 'loading' ? <Loader2 size={16} className="animate-spin"/> : resetStatus === 'success' ? <Check size={16}/> : <KeyRound size={16}/>}
                      {resetStatus === 'loading' ? 'Enviando...' : resetStatus === 'success' ? 'Link Enviado ao E-mail' : 'Redefinir Senha'}
                    </button>
                 </div>

                 <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">{theme === 'light' ? <Sun size={22} className="text-orange-500" /> : <Moon size={22} className="text-blue-500" />}<span className="text-[11px] font-black uppercase text-black dark:text-white">Tema Visual</span></div>
                    <button onClick={() => onToggleTheme(theme === 'light' ? 'dark' : 'light')} className={`w-12 h-7 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-zinc-200'}`}><div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${theme === 'dark' ? 'left-6' : 'left-1'}`} /></button>
                 </div>
              </div>

              <div className="p-6 bg-zinc-50 dark:bg-zinc-950 rounded-[2.4rem] border border-zinc-100 dark:border-zinc-900 space-y-5">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] ml-2">Visão Rápida</h3>
                <div className="grid grid-cols-3 gap-3">
                  <QuickContact icon={<MessageCircle size={18}/>} label="Whats" value={initialBusiness.whatsapp} />
                  <QuickContact icon={<Phone size={18}/>} label="Fone" value={initialBusiness.phone} />
                  <QuickContact icon={<Mail size={18}/>} label="Email" value={initialBusiness.email} />
                </div>
              </div>
            </div>
          )}
          <button onClick={() => supabase.auth.signOut()} className="w-full p-6 bg-zinc-50 dark:bg-zinc-900 text-red-600 rounded-[2.2rem] font-black text-[10px] uppercase tracking-widest border border-zinc-100 dark:border-zinc-800 active:bg-red-50 transition-colors flex items-center justify-center gap-3"><LogOut size={20} /> Encerrar Sessão</button>
        </div>
      </div>

      {/* VIEW DE EDIÇÃO */}
      {activeView === 'edit-profile' && (
        <div className="absolute inset-0 bg-white dark:bg-black z-[100] flex flex-col animate-in slide-in-from-bottom duration-400">
          <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-black shrink-0 relative z-10">
            <button onClick={() => setActiveView('main')} className="text-zinc-500 w-11 h-11 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center active:scale-90 transition-all"><X size={22} /></button>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white text-center flex-1 italic">Setup Profissional</h2>
            <div className="w-11" />
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-8 hide-scrollbar pb-32 smooth-scroll">
            <div className="space-y-10">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
                  <div className="w-28 h-28 rounded-[2.8rem] overflow-hidden border-2 border-blue-600/20 shadow-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                    {isUploading ? <Loader2 className="animate-spin text-blue-600" /> : <img src={formData.logo || 'https://picsum.photos/200/200'} className="w-full h-full object-cover" alt="Preview" />}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white border-4 border-white dark:border-black shadow-lg"><Camera size={18} /></div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
                </div>
                
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-[1.5rem] border border-red-500/20 flex gap-4 items-center animate-in shake duration-300">
                    <AlertCircle className="text-red-500 shrink-0" size={24} />
                    <p className="text-[10px] text-red-600 font-black uppercase leading-tight">{error}</p>
                  </div>
                )}
              </div>

              <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-8">
                <div className="space-y-5">
                  <SectionHeader icon={<User size={14}/>} title="Empresa" />
                  <InputGroup label="Nome Fantasia" value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder="Ex: Studio Criativo" />
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Segmento</label>
                    <select className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-[14px] font-bold text-black dark:text-white outline-none focus:ring-1 focus:ring-blue-500" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as Category})}>
                        {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-5">
                  <SectionHeader icon={<MessageCircle size={14}/>} title="Contatos" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputGroup 
                      icon={<MessageCircle size={14}/>} 
                      label="WhatsApp" 
                      value={formData.whatsapp} 
                      onChange={v => setFormData({...formData, whatsapp: v})} 
                      placeholder="Somente Números" 
                    />
                    <InputGroup 
                      icon={<Phone size={14}/>} 
                      label="Telefone" 
                      value={formData.phone} 
                      onChange={v => setFormData({...formData, phone: v})} 
                      placeholder="Fixo/Celular" 
                    />
                  </div>
                  <InputGroup icon={<Mail size={14}/>} label="E-mail" value={formData.email} onChange={v => setFormData({...formData, email: v})} placeholder="contato@empresa.com" />
                  <InputGroup icon={<MapPin size={14}/>} label="Endereço/Cidade" value={formData.location} onChange={v => setFormData({...formData, location: v})} placeholder="Sua localização" />
                </div>

                <div className="space-y-5">
                  <SectionHeader icon={<Clock size={14}/>} title="Expediente" />
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Dias de Operação</label>
                    <div className="flex justify-between gap-1.5">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          className={`flex-1 h-11 rounded-xl text-[11px] font-black transition-all flex items-center justify-center ${formData.selectedDays.includes(day.id) ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border border-zinc-100 dark:border-zinc-800'}`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <InputGroup label="Abre às" value={formData.openTime} onChange={v => setFormData({...formData, openTime: v})} type="time" />
                    <InputGroup label="Fecha às" value={formData.closeTime} onChange={v => setFormData({...formData, closeTime: v})} type="time" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Bio / Slogan</label>
                  <textarea className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-5 text-[14px] font-medium border border-zinc-100 dark:border-zinc-800 text-black dark:text-white h-32 resize-none outline-none focus:ring-1 focus:ring-blue-500" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                </div>
              </form>
            </div>
          </div>

          {/* Botão Flutuante Glass Pill */}
          <div className="absolute bottom-10 left-8 right-8 z-[110] pointer-events-none">
            <button 
              form="profile-form"
              type="submit" 
              disabled={isSaving || isUploading} 
              className={`w-full h-15 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 pointer-events-auto border border-white/20 backdrop-blur-xl ${saveSuccess ? 'bg-green-600/90 text-white' : 'bg-blue-600/90 text-white'}`}
            >
              {isSaving ? <Loader2 className="animate-spin" size={16}/> : saveSuccess ? <Check size={16}/> : null}
              {isSaving ? 'Salvando...' : saveSuccess ? 'Confirmado!' : 'Salvar Perfil'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-3 px-1 pb-2 border-b border-zinc-100 dark:border-zinc-900">
    <div className="text-blue-500">{icon}</div>
    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{title}</h3>
  </div>
);

const QuickContact: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => (
  <div className={`p-5 rounded-[1.8rem] flex flex-col items-center gap-2 border border-zinc-100 dark:border-zinc-800 transition-all ${value ? 'opacity-100 bg-white dark:bg-black shadow-sm' : 'opacity-20'}`}>
    <div className="text-blue-500">{icon}</div>
    <span className="text-[8px] font-black uppercase text-zinc-400 tracking-tighter">{label}</span>
  </div>
);

const InputGroup: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: React.ReactNode }> = ({ label, value, onChange, placeholder, type = "text", icon }) => (
  <div className="space-y-2 flex-1">
    <div className="flex items-center gap-2 ml-1">
      {icon && <div className="text-zinc-400">{icon}</div>}
      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{label}</label>
    </div>
    <input 
      type={type} 
      placeholder={placeholder}
      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-[14px] font-bold text-black dark:text-white outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);

export default MeView;
