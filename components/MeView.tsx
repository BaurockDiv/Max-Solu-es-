
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronRight, 
  ShieldCheck, 
  HelpCircle, 
  Info,
  BookOpen,
  Briefcase,
  X,
  Save,
  Lock,
  MessageSquare,
  CheckCircle2,
  Camera,
  Upload,
  KeyRound,
  AlertCircle,
  Clock,
  CalendarDays,
  Sun,
  Moon,
  Palette
} from 'lucide-react';
import { Business, Category } from '../types';

interface MeViewProps {
  session: any;
  business: Business | null;
  onUpdateBusiness: (updated: Business) => void;
  theme: 'light' | 'dark';
  onToggleTheme: (theme: 'light' | 'dark') => void;
}

type SettingsView = 'main' | 'edit-profile' | 'security' | 'support' | 'change-password';

const DAYS_OF_WEEK = [
  { label: 'Dom', value: 'Dom' },
  { label: 'Seg', value: 'Seg' },
  { label: 'Ter', value: 'Ter' },
  { label: 'Qua', value: 'Qua' },
  { label: 'Qui', value: 'Qui' },
  { label: 'Sex', value: 'Sex' },
  { label: 'Sab', value: 'Sab' },
];

const MeView: React.FC<MeViewProps> = ({ session, business: initialBusiness, onUpdateBusiness, theme, onToggleTheme }) => {
  const [activeView, setActiveView] = useState<SettingsView>('main');
  const [showDocs, setShowDocs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Business> & { openTime: string; closeTime: string; selectedDays: string[] }>({
    name: initialBusiness?.name || '',
    bio: initialBusiness?.bio || '',
    category: initialBusiness?.category || Category.SERVICES,
    location: initialBusiness?.location || '',
    logo: initialBusiness?.logo || '',
    hours: initialBusiness?.hours || '09:00 - 18:00',
    openTime: initialBusiness?.hours?.split(' - ')[0]?.split(', ').pop() || '09:00',
    closeTime: initialBusiness?.hours?.split(' - ')[1] || '18:00',
    selectedDays: initialBusiness?.hours?.split(', ')[0]?.split('-') || ['Seg', 'Sex']
  });

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    if (initialBusiness) {
      const hoursParts = initialBusiness.hours?.split(', ');
      const daysPart = hoursParts?.[0] || 'Seg-Sex';
      const timePart = hoursParts?.[1] || '09:00 - 18:00';
      const [open, close] = timePart.split(' - ');

      setFormData({
        name: initialBusiness.name,
        bio: initialBusiness.bio,
        category: initialBusiness.category,
        location: initialBusiness.location,
        logo: initialBusiness.logo,
        hours: initialBusiness.hours,
        openTime: open || '09:00',
        closeTime: close || '18:00',
        selectedDays: daysPart.includes('-') ? daysPart.split('-') : [daysPart]
      });
    }
  }, [initialBusiness, activeView]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleDay = (day: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedDays.includes(day);
      const newDays = isSelected 
        ? prev.selectedDays.filter(d => d !== day)
        : [...prev.selectedDays].sort((a,b) => 
            DAYS_OF_WEEK.findIndex(d => d.value === a) - DAYS_OF_WEEK.findIndex(d => d.value === b)
          );
      if (!isSelected) {
        newDays.push(day);
        newDays.sort((a,b) => 
          DAYS_OF_WEEK.findIndex(d => d.value === a) - DAYS_OF_WEEK.findIndex(d => d.value === b)
        );
      }
      return { ...prev, selectedDays: newDays };
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialBusiness) return;
    setIsSaving(true);
    const daysStr = formData.selectedDays.length > 1 
      ? `${formData.selectedDays[0]}-${formData.selectedDays[formData.selectedDays.length - 1]}`
      : formData.selectedDays[0] || 'Diariamente';
    const finalHours = `${daysStr}, ${formData.openTime} - ${formData.closeTime}`;
    try {
      const finalBusiness = { ...initialBusiness, ...formData, hours: finalHours } as Business;
      await supabase.from('businesses').update({
        name: formData.name,
        bio: formData.bio,
        location: formData.location,
        category: formData.category,
        hours: finalHours
      }).eq('id', initialBusiness.id);
      onUpdateBusiness(finalBusiness);
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveView('main');
      }, 1500);
    } catch (err) {
      alert("Erro ao salvar perfil");
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      alert("As novas senhas não coincidem!");
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setPasswordForm({ current: '', new: '', confirm: '' });
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveView('security');
      }, 1500);
    }, 1200);
  };

  const renderSubView = () => {
    switch (activeView) {
      case 'edit-profile':
        return (
          <div className="absolute inset-0 bg-white dark:bg-zinc-950 z-[60] animate-in slide-in-from-right duration-500 overflow-y-auto">
            <div className="flex items-center justify-between p-6 sticky top-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl z-20">
              <button onClick={() => setActiveView('main')} className="text-zinc-500 w-10 h-10 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-900"><X size={20} /></button>
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">Editar Perfil</h2>
              <div className="w-10" />
            </div>
            
            <div className="p-8 flex flex-col items-center">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <img 
                  src={formData.logo || 'https://picsum.photos/200/200'} 
                  className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-blue-600/20 group-hover:opacity-75 transition-all shadow-2xl shadow-blue-500/10" 
                  alt="Avatar"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
                </div>
                <div className="absolute bottom-1 right-1 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white border-4 border-white dark:border-zinc-950 shadow-lg">
                  <Upload size={16} />
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                   const file = e.target.files?.[0];
                   if (file) {
                     const url = URL.createObjectURL(file);
                     setFormData(p => ({...p, logo: url}));
                   }
                }} />
              </div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-6">Logo Profissional</p>
            </div>

            <form onSubmit={handleSaveProfile} className="p-8 pt-0 space-y-8 pb-32">
              <div className="space-y-6">
                <InputGroup label="Nome do Negócio" value={formData.name || ''} onChange={v => setFormData(p => ({...p, name: v}))} />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Categoria</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border-none rounded-[1.5rem] p-5 text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none text-zinc-900 dark:text-zinc-100 shadow-sm"
                      value={formData.category}
                      onChange={(e) => setFormData(p => ({...p, category: e.target.value as Category}))}
                    >
                      {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronRight size={18} className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Dias de Funcionamento</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`flex-1 min-w-[50px] py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${formData.selectedDays.includes(day.value) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'}`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Abre</label>
                    <input type="time" className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-[1.5rem] p-5 text-sm font-bold border-none" value={formData.openTime} onChange={e => setFormData(p => ({...p, openTime: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Fecha</label>
                    <input type="time" className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-[1.5rem] p-5 text-sm font-bold border-none" value={formData.closeTime} onChange={e => setFormData(p => ({...p, closeTime: e.target.value}))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Bio</label>
                  <textarea className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-[1.5rem] p-5 text-sm font-medium h-32 resize-none border-none" value={formData.bio} onChange={e => setFormData(p => ({...p, bio: e.target.value}))} />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSaving}
                className={`w-full py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${saveSuccess ? 'bg-green-500 text-white' : 'bg-blue-600 text-white shadow-[0_10px_30px_rgb(37,99,235,0.3)]'}`}
              >
                {isSaving ? 'Salvando...' : saveSuccess ? 'Atualizado!' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-zinc-50 dark:bg-zinc-950 pb-20 relative overflow-hidden transition-colors duration-500">
      {renderSubView()}

      <div className="bg-white dark:bg-zinc-900 px-8 py-12 rounded-b-[3rem] shadow-sm">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <img 
              src={initialBusiness?.logo || formData.logo || 'https://picsum.photos/200/200'} 
              className="w-28 h-28 rounded-[2.5rem] object-cover shadow-2xl border-4 border-white dark:border-zinc-800" 
              alt="Profile"
            />
            <button 
              onClick={() => setActiveView('edit-profile')}
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white border-4 border-white dark:border-zinc-900 shadow-xl"
            >
              <Camera size={16} />
            </button>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {initialBusiness?.name || "Meu Negócio"}
            </h1>
            <p className="text-[11px] text-zinc-400 font-black uppercase tracking-[0.15em]">{session.user.email}</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={12} /> Verificado
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">
              ID: {session.user.id.substring(0,6)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Aparência do App */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em] px-4">Aparência do App</h3>
          <div className="bg-white dark:bg-zinc-900 p-2 rounded-[2rem] flex items-center shadow-sm border border-zinc-100 dark:border-zinc-800">
            <button 
              onClick={() => onToggleTheme('light')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${theme === 'light' ? 'bg-zinc-100 text-zinc-900 shadow-inner' : 'text-zinc-400'}`}
            >
              <Sun size={14} /> Modo Claro
            </button>
            <button 
              onClick={() => onToggleTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${theme === 'dark' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400'}`}
            >
              <Moon size={14} /> Modo Escuro
            </button>
          </div>
        </div>

        {/* Menu Principal */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em] px-4">Menu Profissional</h3>
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <MenuButton icon={<Settings size={20} />} label="Identidade da Marca" onClick={() => setActiveView('edit-profile')} />
            <MenuButton icon={<ShieldCheck size={20} />} label="Segurança & Privacidade" onClick={() => {}} />
            <MenuButton icon={<HelpCircle size={20} />} label="Suporte Premium" onClick={() => {}} />
          </div>
        </div>

        <button 
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center justify-center space-x-3 p-6 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-[2rem] font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-sm"
        >
          <LogOut size={20} />
          <span>Encerrar Sessão</span>
        </button>

        <p className="text-center text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-4">
          BIZSTREAM • v1.3.0 PLATINUM
        </p>
      </div>
    </div>
  );
};

const InputGroup: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">{label}</label>
    <input 
      type="text" 
      className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-[1.5rem] p-5 text-sm font-bold border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const MenuButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-0"
  >
    <div className="flex items-center space-x-4">
      <div className="text-blue-500">{icon}</div>
      <span className="text-xs font-black uppercase tracking-tighter text-zinc-700 dark:text-zinc-200">{label}</span>
    </div>
    <ChevronRight size={18} className="text-zinc-300" />
  </button>
);

export default MeView;
