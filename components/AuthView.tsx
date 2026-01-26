
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, ArrowRight, Sparkles, X } from 'lucide-react';

interface AuthViewProps {
  onBack?: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert('Conta criada com sucesso! Você já pode entrar.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="h-full bg-zinc-950 flex flex-col p-8 justify-center relative">
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-8 right-8 w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      )}

      <div className="mb-12 text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20 animate-pulse">
          <Sparkles className="text-white" size={32} />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">BizStream</h1>
        <p className="text-zinc-500 text-sm mt-2">Área restrita para parceiros e criadores.</p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="email" 
            placeholder="E-mail" 
            className="w-full bg-zinc-900 border-none rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-500 transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="password" 
            placeholder="Senha" 
            className="w-full bg-zinc-900 border-none rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-500 transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/10"
        >
          <span>{loading ? 'Processando...' : (isSignUp ? 'Cadastrar' : 'Entrar Agora')}</span>
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <button 
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-6 text-zinc-500 text-sm font-bold hover:text-white transition-colors"
      >
        {isSignUp ? 'Já tem conta? Faça Login' : 'Novo por aqui? Crie seu perfil'}
      </button>

      {onBack && (
        <button 
          onClick={onBack}
          className="mt-12 text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:text-blue-500 transition-colors"
        >
          Continuar como Visitante
        </button>
      )}
    </div>
  );
};

export default AuthView;
