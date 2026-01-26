
import React, { useState } from 'react';
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
  Briefcase
} from 'lucide-react';
import { Business } from '../types';

interface MeViewProps {
  session: any;
  business: Business | null;
}

const MeView: React.FC<MeViewProps> = ({ session, business }) => {
  const [showDocs, setShowDocs] = useState(false);

  return (
    <div className="flex flex-col min-h-full bg-zinc-50 dark:bg-zinc-950 pb-10">
      {/* Header do Perfil */}
      <div className="bg-white dark:bg-zinc-900 px-6 py-10 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <User size={40} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black text-zinc-900 dark:text-white truncate">
              {session.user.email.split('@')[0]}
            </h1>
            <p className="text-xs text-zinc-500 font-medium mb-2">{session.user.email}</p>
            {business && (
              <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg w-fit">
                <Briefcase size={12} />
                {business.name.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Seção de Ajustes */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-2">Configurações</h3>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <MenuButton icon={<Settings size={18} />} label="Editar Perfil" />
            <MenuButton icon={<ShieldCheck size={18} />} label="Segurança da Conta" />
            <MenuButton icon={<HelpCircle size={18} />} label="Suporte Técnico" />
          </div>
        </div>

        {/* Seção de Documentação */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-2">Plataforma</h3>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <button 
              onClick={() => setShowDocs(!showDocs)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-50 dark:border-zinc-800"
            >
              <div className="flex items-center space-x-3">
                <div className="text-blue-500"><BookOpen size={18} /></div>
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">BizStream Specs v1.0</span>
              </div>
              <ChevronRight size={16} className={`text-zinc-400 transition-transform ${showDocs ? 'rotate-90' : ''}`} />
            </button>
            
            {showDocs && (
              <div className="p-5 bg-zinc-50 dark:bg-zinc-950/50 text-sm space-y-4 animate-in fade-in slide-in-from-top-1">
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed italic">
                  "BizStream é o ecossistema discovery mobile-first para converter conteúdo criativo em intenção de negócio real."
                </p>
                <div className="space-y-2">
                  <div className="font-bold flex items-center gap-2 text-xs"><Info size={14} className="text-blue-500" /> Vínculo Empresarial</div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Todas as suas publicações são vinculadas ao ID de Proprietário da sua conta, garantindo segurança e exclusividade nos dados de analytics.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botão de Logout */}
        <button 
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center justify-center space-x-2 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-2xl font-black text-sm active:scale-[0.98] transition-all"
        >
          <LogOut size={18} />
          <span>SAIR DA CONTA</span>
        </button>

        <p className="text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-4">
          ID: {session.user.id} | v1.0.42
        </p>
      </div>
    </div>
  );
};

const MenuButton: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-0">
    <div className="flex items-center space-x-3">
      <div className="text-zinc-500 dark:text-zinc-400">{icon}</div>
      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{label}</span>
    </div>
    <ChevronRight size={16} className="text-zinc-300" />
  </button>
);

export default MeView;
