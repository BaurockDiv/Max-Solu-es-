
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MessageCircle, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Clock, 
  Star, 
  CheckCircle2, 
  ChevronRight,
  ExternalLink,
  Share2
} from 'lucide-react';
import { Business } from '../types';

interface ProfileViewProps {
  business: Business;
  onBack: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ business, onBack }) => {
  const [following, setFollowing] = useState(false);

  const handleContact = (type: string) => {
    alert(`Simulando abertura do App de ${type} para: ${business.name}`);
  };

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-zinc-950 pb-20">
      <div className="h-40 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 relative">
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-black/20 backdrop-blur-xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>
          <button className="w-10 h-10 rounded-xl bg-black/20 backdrop-blur-xl flex items-center justify-center text-white border border-white/10">
            <Share2 size={18} />
          </button>
        </div>
      </div>

      <div className="px-5 -mt-12 relative z-10">
        <div className="flex justify-between items-end">
          <div className="relative">
            <img 
              src={business.logo} 
              className="w-28 h-28 rounded-3xl border-4 border-white dark:border-zinc-950 bg-white object-cover shadow-2xl" 
              alt={business.name} 
            />
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white dark:border-zinc-950 shadow-sm" />
          </div>
          <div className="flex space-x-2 mb-2">
            <button 
              onClick={() => setFollowing(!following)}
              className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-all transform active:scale-95 shadow-lg ${following ? 'bg-zinc-100 text-zinc-800' : 'bg-blue-600 text-white shadow-blue-500/30'}`}
            >
              {following ? 'Seguindo' : 'Seguir'}
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-1">
          <div className="flex items-center space-x-1.5">
            <h1 className="text-2xl font-black tracking-tight">{business.name}</h1>
            {business.verified && <CheckCircle2 size={20} className="text-blue-500 fill-blue-500/10" />}
          </div>
          <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest">{business.category}</p>
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">
          {business.bio}
        </p>

        <div className="flex items-center space-x-8 mt-6 py-5 border-y border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col">
            <span className="text-lg font-black flex items-center gap-1">
              <Star size={18} className="text-yellow-500 fill-yellow-500" /> {business.rating}
            </span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-extrabold">{business.reviewCount} Avaliações</span>
          </div>
          <div className="h-10 w-px bg-zinc-100 dark:bg-zinc-800" />
          <div className="flex flex-col">
            <span className="text-lg font-black text-green-600 uppercase tracking-tight">Aberto</span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-extrabold">Fecha às 18:00</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {business.contact.whatsapp && (
            <ContactBtn onClick={() => handleContact('WhatsApp')} icon={<MessageCircle size={20} />} label="WhatsApp" color="bg-green-500" />
          )}
          {business.contact.phone && (
            <ContactBtn onClick={() => handleContact('Telefone')} icon={<Phone size={20} />} label="Ligar" color="bg-zinc-900" />
          )}
          {business.contact.email && (
            <ContactBtn onClick={() => handleContact('E-mail')} icon={<Mail size={20} />} label="E-mail" color="bg-blue-500" />
          )}
        </div>

        <div className="mt-10 space-y-4">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] px-1">Links Profissionais</h3>
          {business.links.map((link, idx) => (
            <a 
              key={idx} 
              href={link.url}
              onClick={(e) => { e.preventDefault(); alert(`Abrindo link externo: ${link.title}`); }}
              className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 group active:scale-[0.98] transition-all shadow-sm"
            >
              <div className="flex items-center space-x-4">
                <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Globe size={20} />
                </div>
                <span className="text-sm font-bold">{link.title}</span>
              </div>
              <ExternalLink size={18} className="text-zinc-300 group-hover:text-blue-500 transition-colors" />
            </a>
          ))}
        </div>

        <div className="mt-8 mb-10 p-6 bg-zinc-50 dark:bg-zinc-900 rounded-[2rem] space-y-5 shadow-inner">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-sm">
              <MapPin size={20} />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Endereço</span>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{business.location}</p>
            </div>
            <button className="text-xs text-blue-600 font-black hover:underline">MAPA</button>
          </div>
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-sm">
              <Clock size={20} />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Expediente</span>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{business.hours}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContactBtn: React.FC<{ icon: React.ReactNode; label: string; color: string; onClick: () => void }> = ({ icon, label, color, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-[1.5rem] ${color} text-white space-y-1.5 shadow-xl shadow-black/5 active:scale-95 transition-transform`}
  >
    {icon}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default ProfileView;
