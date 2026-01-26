
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
      alert("Informação de contato não disponível.");
    }
  };

  const hoursData = business.hours || "Seg - Sex, 09:00 - 18:00";
  const [daysPart, timePart] = hoursData.split(', ');

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-black pb-28 relative transition-colors duration-500">
      {/* Modal de Post */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
          <div className="absolute top-8 left-8 right-8 flex justify-between z-10">
            <button 
              onClick={() => setSelectedPost(null)}
              className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-white border border-white/10"
            >
              <X size={20} />
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
            <p className="text-sm font-medium leading-relaxed opacity-90">{selectedPost.caption}</p>
          </div>
        </div>
      )}

      {/* Header com Cover */}
      <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-900 relative">
        <div className="absolute top-5 left-5 right-5 flex justify-between z-10">
          <button 
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
          <button 
            onClick={() => {
              navigator.share?.({ title: business.name, url: window.location.href }).catch(() => alert("Link copiado!"));
            }}
            className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white border border-white/10"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Info Principal */}
      <div className="px-5 -mt-10 relative z-10">
        <div className="flex justify-between items-end">
          <div className="relative">
            <img 
              src={business.logo || 'https://picsum.photos/200/200'} 
              className="w-24 h-24 rounded-[2.2rem] border-[4px] border-white dark:border-black bg-white object-cover shadow-xl" 
              alt={business.name} 
            />
            <div className="absolute bottom-0 right-0 bg-green-500 w-5 h-5 rounded-full border-[3px] border-white dark:border-black shadow-lg" />
          </div>
          <div className="flex space-x-2 mb-2">
            <button 
              onClick={() => setFollowing(!following)}
              className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all transform active:scale-95 shadow-md ${following ? 'bg-zinc-100 dark:bg-zinc-900 text-black dark:text-zinc-400' : 'bg-blue-600 text-white shadow-blue-500/10'}`}
            >
              {following ? 'Seguindo' : 'Seguir'}
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-0.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-black dark:text-white uppercase leading-none">{business.name}</h1>
            {business.verified && <CheckCircle2 size={16} className="text-blue-500" />}
          </div>
          <p className="text-[8px] text-zinc-400 font-black uppercase tracking-[0.2em]">{business.category}</p>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium line-clamp-2">
          {business.bio}
        </p>

        {/* Abas */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-900 mt-6 relative">
          <button 
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-[8px] font-black uppercase tracking-[0.2em] transition-all relative z-10 ${activeTab === 'posts' ? 'text-blue-600' : 'text-zinc-400'}`}
          >
            Posts ({posts.length})
            {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-[8px] font-black uppercase tracking-[0.2em] transition-all relative z-10 ${activeTab === 'info' ? 'text-blue-600' : 'text-zinc-400'}`}
          >
            Sobre & Contato
            {activeTab === 'info' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 rounded-full" />}
          </button>
        </div>

        {/* Conteúdo */}
        <div className="mt-5">
          {activeTab === 'posts' ? (
            <div className="grid grid-cols-3 gap-1 animate-in fade-in duration-300">
              {posts.length > 0 ? posts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => setSelectedPost(post)}
                  className="aspect-[3/4] bg-zinc-50 dark:bg-zinc-950 overflow-hidden rounded-xl group relative cursor-pointer active:scale-95 transition-all shadow-sm"
                >
                  <img src={post.thumbnail} className="w-full h-full object-cover" />
                  {post.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                      <Play size={18} className="text-white fill-white/10" />
                    </div>
                  )}
                </div>
              )) : (
                <div className="col-span-3 py-12 text-center">
                  <LayoutGrid size={32} className="mx-auto text-zinc-100 dark:text-zinc-900 mb-2" />
                  <p className="text-[8px] text-zinc-300 font-black uppercase tracking-widest">Aguardando mídias</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-3 gap-2">
                <ContactBtn onClick={() => handleContact('whatsapp')} icon={<MessageCircle size={16} />} label="Whats" color="bg-green-600" />
                <ContactBtn onClick={() => handleContact('phone')} icon={<Phone size={16} />} label="Ligar" color="bg-black dark:bg-zinc-900" />
                <ContactBtn onClick={() => handleContact('email')} icon={<Mail size={16} />} label="E-mail" color="bg-blue-600" />
              </div>

              <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-[1.8rem] space-y-4 border border-zinc-100 dark:border-zinc-900">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-white dark:bg-black flex items-center justify-center text-zinc-400 border border-zinc-100 dark:border-zinc-800">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Localização</span>
                    <p className="text-[10px] font-black text-black dark:text-white uppercase mt-0.5">{business.location}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-white dark:bg-black flex items-center justify-center text-zinc-400 border border-zinc-100 dark:border-zinc-800">
                    <Clock size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Funcionamento</span>
                    <div className="mt-0.5">
                       <p className="text-[10px] font-black text-black dark:text-white uppercase leading-tight">{daysPart || "Dias a Combinar"}</p>
                       <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mt-0.5">{timePart || "09:00 - 18:00"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] px-2">Links Externos</h3>
                {business.links && business.links.length > 0 ? business.links.map((link, idx) => (
                  <a 
                    key={idx} 
                    href={link.url}
                    className="flex items-center justify-between p-3.5 bg-white dark:bg-black rounded-xl border border-zinc-100 dark:border-zinc-900 group shadow-sm active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-blue-600">
                        <Globe size={16} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tight text-black dark:text-white">{link.title}</span>
                    </div>
                    <ExternalLink size={14} className="text-zinc-300" />
                  </a>
                )) : (
                  <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest px-2">Sem links anexados</p>
                )}
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
    className={`flex flex-col items-center justify-center p-3 rounded-xl ${color} text-white space-y-1 shadow-md active:scale-95 transition-all`}
  >
    {icon}
    <span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default ProfileView;
