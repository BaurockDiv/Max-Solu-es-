
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MessageCircle, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  Share2,
  LayoutGrid,
  X,
  Play
} from 'lucide-react';
import { Business, MediaPost } from '../types';

interface ProfileViewProps {
  business: Business;
  posts: MediaPost[];
  onBack: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ business, posts, onBack }) => {
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'info'>('posts');
  const [selectedPost, setSelectedPost] = useState<MediaPost | null>(null);

  const handleContact = (type: 'whatsapp' | 'email' | 'phone') => {
    const contacts = business.contact;
    if (type === 'whatsapp' && contacts.whatsapp) {
      window.open(`https://wa.me/${contacts.whatsapp.replace(/\D/g, '')}`, '_blank');
    } else if (type === 'email' && contacts.email) {
      window.location.href = `mailto:${contacts.email}`;
    } else if (type === 'phone' && contacts.phone) {
      window.location.href = `tel:${contacts.phone.replace(/\D/g, '')}`;
    } else {
      alert("Informação de contato não disponível para esta empresa.");
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-zinc-950 pb-24 relative">
      {/* Visualização de Post Selecionado (Modal) */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-200">
          <div className="absolute top-6 left-6 right-6 flex justify-between z-10">
            <button 
              onClick={() => setSelectedPost(null)}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {selectedPost.type === 'video' ? (
              <video src={selectedPost.url} autoPlay loop controls className="max-h-full w-full object-contain" />
            ) : (
              <img src={selectedPost.url} className="max-h-full w-full object-contain" alt="Preview" />
            )}
          </div>
          <div className="p-8 bg-gradient-to-t from-black to-transparent text-white">
            <p className="text-sm font-medium leading-relaxed">{selectedPost.caption}</p>
          </div>
        </div>
      )}

      {/* Header com Cover */}
      <div className="h-44 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 relative">
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-black/20 backdrop-blur-xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>
          <button 
            onClick={() => {
              navigator.share?.({ title: business.name, url: window.location.href }).catch(() => alert("Link copiado!"));
            }}
            className="w-10 h-10 rounded-xl bg-black/20 backdrop-blur-xl flex items-center justify-center text-white border border-white/10"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Info Principal */}
      <div className="px-5 -mt-12 relative z-10">
        <div className="flex justify-between items-end">
          <div className="relative">
            <img 
              src={business.logo || 'https://picsum.photos/200/200'} 
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
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{business.category}</p>
        </div>

        <p className="mt-4 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">
          {business.bio}
        </p>

        {/* Seleção de Abas (Corrigida) */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 mt-8 relative">
          <button 
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative z-10 ${activeTab === 'posts' ? 'text-blue-600' : 'text-zinc-400'}`}
          >
            Publicações ({posts.length})
            {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-in slide-in-from-left-full duration-300" />}
          </button>
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative z-10 ${activeTab === 'info' ? 'text-blue-600' : 'text-zinc-400'}`}
          >
            Sobre & Contato
            {activeTab === 'info' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-in slide-in-from-right-full duration-300" />}
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="mt-4">
          {activeTab === 'posts' ? (
            <div className="grid grid-cols-3 gap-1 animate-in fade-in duration-300">
              {posts.length > 0 ? posts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => setSelectedPost(post)}
                  className="aspect-[3/4] bg-zinc-100 dark:bg-zinc-900 overflow-hidden rounded-lg group relative cursor-pointer active:scale-95 transition-transform"
                >
                  <img src={post.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  {post.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <Play size={20} className="text-white fill-white/20" />
                    </div>
                  )}
                </div>
              )) : (
                <div className="col-span-3 py-20 text-center space-y-2">
                  <LayoutGrid size={40} className="mx-auto text-zinc-200" />
                  <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Nenhuma publicação ainda</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
              <div className="grid grid-cols-3 gap-3">
                <ContactBtn onClick={() => handleContact('whatsapp')} icon={<MessageCircle size={20} />} label="WhatsApp" color="bg-green-500" />
                <ContactBtn onClick={() => handleContact('phone')} icon={<Phone size={20} />} label="Ligar" color="bg-zinc-900" />
                <ContactBtn onClick={() => handleContact('email')} icon={<Mail size={20} />} label="E-mail" color="bg-blue-500" />
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-1">Links Oficiais</h3>
                {business.links && business.links.length > 0 ? business.links.map((link, idx) => (
                  <a 
                    key={idx} 
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
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
                )) : (
                  <p className="text-xs text-zinc-400 font-medium px-1">Nenhum link adicional disponível.</p>
                )}
              </div>

              <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-[2rem] space-y-5 shadow-inner border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-sm">
                    <MapPin size={20} />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Localização</span>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{business.location}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-sm">
                    <Clock size={20} />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Horário</span>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{business.hours}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
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
