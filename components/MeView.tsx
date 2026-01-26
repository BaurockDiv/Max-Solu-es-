
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
  AlertCircle
} from 'lucide-react';
import { Business, Category } from '../types';

interface MeViewProps {
  session: any;
  business: Business | null;
  onUpdateBusiness: (updated: Business) => void;
}

type SettingsView = 'main' | 'edit-profile' | 'security' | 'support' | 'change-password';

const MeView: React.FC<MeViewProps> = ({ session, business: initialBusiness, onUpdateBusiness }) => {
  const [activeView, setActiveView] = useState<SettingsView>('main');
  const [showDocs, setShowDocs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Estados para formulários
  const [formData, setFormData] = useState<Partial<Business>>({
    name: initialBusiness?.name || '',
    bio: initialBusiness?.bio || '',
    category: initialBusiness?.category || Category.SERVICES,
    location: initialBusiness?.location || '',
    logo: initialBusiness?.logo || ''
  });

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    if (initialBusiness) {
      setFormData({
        name: initialBusiness.name,
        bio: initialBusiness.bio,
        category: initialBusiness.category,
        location: initialBusiness.location,
        logo: initialBusiness.logo
      });
    }
  }, [initialBusiness, activeView]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && initialBusiness) {
      const localUrl = URL.createObjectURL(file);
      const updated = { ...initialBusiness, ...formData, logo: localUrl } as Business;
      setFormData(prev => ({ ...prev, logo: localUrl }));
      
      // Persiste a logo no simulador
      await supabase.from('businesses').update({ logo: localUrl }).eq('id', initialBusiness.id);
      onUpdateBusiness(updated);
    }
  };

  const handleCategoryChange = async (val: Category) => {
    if (initialBusiness) {
      const updated = { ...initialBusiness, ...formData, category: val } as Business;
      setFormData(prev => ({ ...prev, category: val }));
      
      // Persiste a categoria no simulador imediatamente
      await supabase.from('businesses').update({ category: val }).eq('id', initialBusiness.id);
      onUpdateBusiness(updated);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialBusiness) return;
    setIsSaving(true);

    // Simula a chamada de atualização no Supabase
    try {
      const finalBusiness = { ...initialBusiness, ...formData } as Business;
      await supabase.from('businesses').update({
        name: formData.name,
        bio: formData.bio,
        location: formData.location,
        category: formData.category
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
          <div className="absolute inset-0 bg-white dark:bg-zinc-950 z-[60] animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md z-20">
              <button onClick={() => setActiveView('main')} className="text-zinc-500 p-2 -ml-2"><X size={24} /></button>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">Editar Perfil</h2>
              <div className="w-10" />
            </div>
            
            <div className="p-6 flex flex-col items-center">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <img 
                  src={formData.logo || 'https://picsum.photos/200/200'} 
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-blue-600/20 group-hover:opacity-75 transition-opacity" 
                  alt="Avatar"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Upload size={14} />
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-4">Logo do Negócio</p>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 pt-0 space-y-6">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome de Exibição (Público)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Minha Empresa"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none text-zinc-900 dark:text-zinc-100"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <p className="text-[9px] text-zinc-400 font-medium px-1">Este nome substitui qualquer identificação automática.</p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Categoria (Instantânea)</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent rounded-2xl p-4 text-sm font-bold appearance-none cursor-pointer focus:border-blue-500 outline-none text-zinc-900 dark:text-zinc-100"
                      value={formData.category}
                      onChange={(e) => handleCategoryChange(e.target.value as Category)}
                    >
                      {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Biografia Profissional</label>
                  <textarea 
                    placeholder="Conte o que seu negócio faz..."
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent rounded-2xl p-4 text-sm font-medium h-28 resize-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none text-zinc-900 dark:text-zinc-100"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Cidade / Estado</label>
                  <input 
                    type="text" 
                    placeholder="Ex: São Paulo, SP"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none text-zinc-900 dark:text-zinc-100"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSaving || saveSuccess}
                className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl ${saveSuccess ? 'bg-green-500 text-white' : 'bg-blue-600 text-white active:scale-95 shadow-blue-500/20'}`}
              >
                {isSaving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</> : saveSuccess ? <><CheckCircle2 size={18} /> Perfil Atualizado</> : <><Save size={18} /> Confirmar Dados</>}
              </button>
            </form>
          </div>
        );
      case 'security':
        return (
          <div className="absolute inset-0 bg-white dark:bg-zinc-950 z-[60] animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <button onClick={() => setActiveView('main')} className="text-zinc-500 p-2 -ml-2"><X size={24} /></button>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">Segurança</h2>
              <div className="w-10" />
            </div>
            <div className="p-6 space-y-8">
              <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl space-y-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><ShieldCheck size={20} /></div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Privacidade Garantida</h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-medium">Seus dados de e-mail nunca são exibidos publicamente nas publicações.</p>
              </div>
              <div className="space-y-4">
                <button 
                  onClick={() => setActiveView('change-password')}
                  className="w-full flex items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Lock size={18} className="text-zinc-400" />
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Alterar Senha</span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-300" />
                </button>
              </div>
            </div>
          </div>
        );
      case 'change-password':
        return (
          <div className="absolute inset-0 bg-white dark:bg-zinc-950 z-[70] animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <button onClick={() => setActiveView('security')} className="text-zinc-500 p-2 -ml-2"><X size={24} /></button>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">Nova Senha</h2>
              <div className="w-10" />
            </div>
            <form onSubmit={handlePasswordUpdate} className="p-6 space-y-6">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl flex gap-3 border border-amber-100 dark:border-amber-900/20">
                <AlertCircle size={18} className="text-amber-600 shrink-0" />
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase leading-tight">Mantenha sua conta segura alterando sua senha periodicamente.</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">Senha Atual</label>
                  <input 
                    type="password"
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:border-blue-500 outline-none text-zinc-900 dark:text-zinc-100"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm(p => ({...p, current: e.target.value}))}
                  />
                </div>
                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">Nova Senha</label>
                  <input 
                    type="password"
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:border-blue-500 outline-none text-zinc-900 dark:text-zinc-100"
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm(p => ({...p, new: e.target.value}))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">Confirmar Nova Senha</label>
                  <input 
                    type="password"
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:border-blue-500 outline-none text-zinc-900 dark:text-zinc-100"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm(p => ({...p, confirm: e.target.value}))}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSaving || saveSuccess}
                className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${saveSuccess ? 'bg-green-500 text-white' : 'bg-zinc-900 dark:bg-white text-white dark:text-black active:scale-95 shadow-xl'}`}
              >
                {isSaving ? <><div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Atualizando...</> : saveSuccess ? <><CheckCircle2 size={18} /> Senha Alterada</> : <><KeyRound size={18} /> Atualizar Senha</>}
              </button>
            </form>
          </div>
        );
      case 'support':
        return (
          <div className="absolute inset-0 bg-white dark:bg-zinc-950 z-[60] animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <button onClick={() => setActiveView('main')} className="text-zinc-500 p-2 -ml-2"><X size={24} /></button>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">Suporte</h2>
              <div className="w-10" />
            </div>
            <div className="p-6 space-y-6">
              <div className="text-center space-y-2 mb-8 mt-4">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto text-blue-600"><HelpCircle size={32} /></div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Central de Ajuda</h3>
                <p className="text-xs text-zinc-500 font-medium px-8 leading-relaxed">Nossa equipe técnica revisa todas as solicitações em tempo real.</p>
              </div>
              <textarea 
                placeholder="Como podemos ajudar você hoje?"
                className="w-full bg-zinc-50 dark:bg-zinc-900 border-none rounded-3xl p-6 text-sm font-medium h-40 resize-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
              />
              <button className="w-full py-4 bg-zinc-900 dark:bg-white dark:text-black text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg">
                ENVIAR MENSAGEM
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-zinc-50 dark:bg-zinc-950 pb-10 relative overflow-hidden">
      {renderSubView()}

      <div className="bg-white dark:bg-zinc-900 px-6 py-10 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img 
              src={initialBusiness?.logo || formData.logo || 'https://picsum.photos/200/200'} 
              className="w-20 h-20 rounded-3xl object-cover shadow-xl border-2 border-white dark:border-zinc-800" 
              alt="Profile"
            />
            <button 
              onClick={() => setActiveView('edit-profile')}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white border-2 border-white dark:border-zinc-900 shadow-md"
            >
              <Camera size={14} />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-zinc-900 dark:text-white truncate">
              {initialBusiness?.name || "Meu Negócio"}
            </h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest truncate">{session.user.email}</p>
            {initialBusiness && (
              <div className="mt-2 flex items-center gap-1.5 text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1.5 rounded-lg w-fit uppercase tracking-tighter">
                <Briefcase size={12} />
                {initialBusiness.category}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-2">Configurações do Negócio</h3>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <MenuButton icon={<Settings size={18} />} label="Editar Perfil & Identidade" onClick={() => setActiveView('edit-profile')} />
            <MenuButton icon={<ShieldCheck size={18} />} label="Segurança da Conta" onClick={() => setActiveView('security')} />
            <MenuButton icon={<HelpCircle size={18} />} label="Suporte Técnico" onClick={() => setActiveView('support')} />
          </div>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-2">Informações</h3>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <button 
              onClick={() => setShowDocs(!showDocs)}
              className="w-full flex items-center justify-between p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-50 dark:border-zinc-800"
            >
              <div className="flex items-center space-x-3">
                <div className="text-blue-500"><BookOpen size={18} /></div>
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">BizStream Privacy v1.2</span>
              </div>
              <ChevronRight size={16} className={`text-zinc-400 transition-transform ${showDocs ? 'rotate-90' : ''}`} />
            </button>
            
            {showDocs && (
              <div className="p-5 bg-zinc-50 dark:bg-zinc-950/50 text-sm space-y-4 animate-in fade-in slide-in-from-top-1">
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed italic text-xs">
                  "BizStream Privacy: Identidade visual 100% controlada pelo usuário. E-mails e dados sensíveis protegidos."
                </p>
                <div className="space-y-2">
                  <div className="font-bold flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300"><Info size={14} className="text-blue-500" /> Sincronização Dinâmica</div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Todas as suas publicações agora carregam as informações públicas do seu perfil profissional, nunca seus dados de login.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center justify-center space-x-2 p-5 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-[1.5rem] font-black text-xs active:scale-[0.98] transition-all"
        >
          <LogOut size={18} />
          <span>SAIR DA CONTA</span>
        </button>

        <p className="text-center text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-4">
          ID: {session.user.id.substring(0, 12)}... | v1.2.0-secure
        </p>
      </div>
    </div>
  );
};

const MenuButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-0"
  >
    <div className="flex items-center space-x-3">
      <div className="text-zinc-500 dark:text-zinc-400">{icon}</div>
      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{label}</span>
    </div>
    <ChevronRight size={16} className="text-zinc-300" />
  </button>
);

export default MeView;
