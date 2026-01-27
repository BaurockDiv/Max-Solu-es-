
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, ArrowRight, Sparkles, X, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';

interface AuthViewProps {
  onBack?: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Conta criada! Verifique seu e-mail.' });
        setMode('login');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Link de recuperação enviado para seu e-mail.' });
        setTimeout(() => setMode('login'), 3000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-zinc-950 flex flex-col p-10 justify-center relative animate-in fade-in duration-500">
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-10 right-8 w-11 h-11 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-400 active:scale-90 transition-all border border-white/5"
        >
          <X size={20} />
        </button>
      )}

      <div className="mb-12 text-center space-y-4">
        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/20">
          {mode === 'forgot' ? <KeyRound className="text-white" size={36} /> : <Sparkles className="text-white" size={36} />}
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Max Company</h1>
          <p className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.3em] mt-1">
            {mode === 'login' && "Área do Profissional"}
            {mode === 'signup' && "Comece sua Jornada"}
            {mode === 'forgot' && "Recuperar Acesso"}
          </p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
          {message.type === 'success' ? <CheckCircle2 size={16}/> : <KeyRound size={16}/>}
          {message.text}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="email" 
            placeholder="E-mail Profissional" 
            className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-5 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:ring-2 focus:ring-blue-600 transition-all outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {mode !== 'forgot' && (
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="password" 
              placeholder="Sua Senha" 
              className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-5 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:ring-2 focus:ring-blue-600 transition-all outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        )}

        {mode === 'login' && (
          <div className="flex justify-end px-1">
             <button type="button" onClick={() => setMode('forgot')} className="text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-blue-500 transition-colors">Esqueceu a senha?</button>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-[1.5rem] flex items-center justify-center space-x-3 transition-all active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-blue-500/10"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : (
            <>
              <span>{mode === 'signup' ? 'Criar Perfil' : (mode === 'forgot' ? 'Enviar Link' : 'Entrar Agora')}</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-4">
        {mode !== 'forgot' ? (
          <button 
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
          >
            {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}
          </button>
        ) : (
          <button 
            onClick={() => setMode('login')}
            className="text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
          >
            Voltar para o Login
          </button>
        )}

        {onBack && (
          <button 
            onClick={onBack}
            className="text-zinc-700 text-[9px] font-black uppercase tracking-[0.3em] hover:text-blue-500 transition-colors pt-4"
          >
            Acessar como Visitante
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthView;
