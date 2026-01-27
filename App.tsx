
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Home, Search, Users, User, PlusSquare, LogIn, AlertTriangle, X, Database } from 'lucide-react';
import { ViewState, Business, MediaPost } from './types';
import FeedView from './components/FeedView';
import DiscoveryView from './components/DiscoveryView';
import ProfileView from './components/ProfileView';
import DashboardView from './components/DashboardView';
import MeView from './components/MeView';
import RecordView from './components/RecordView';
import AuthView from './components/AuthView';
import FollowingView from './components/FollowingView';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userBusiness, setUserBusiness] = useState<Business | null>(null);
  const [activeTab, setActiveTab] = useState<ViewState>('feed');
  const [lastTab, setLastTab] = useState<ViewState>('feed');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [allPosts, setAllPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState<{ title: string, msg: string, isSql?: boolean } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('maxcompany-theme') as 'light' | 'dark') || 'dark');

  useEffect(() => {
    localStorage.setItem('maxcompany-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const init = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      if (currentSession) {
        fetchUserBusiness(currentSession.user.id);
        supabase.helpers.syncFollows(currentSession.user.id);
      }
      await fetchData();
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserBusiness(session.user.id);
        supabase.helpers.syncFollows(session.user.id);
      } else {
        setUserBusiness(null);
        setActiveTab('feed');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserBusiness = async (userId: string) => {
    const { data, error } = await supabase.from('businesses').select('*').eq('owner_id', userId).single();
    if (error && error.message.includes('column')) {
      setErrorModal({
        title: "Banco de Dados Incompleto",
        msg: "As colunas de contato (email, whatsapp, phone) não existem no seu Supabase. Execute o script SQL para corrigir.",
        isSql: true
      });
    }
    if (data) setUserBusiness(data as any);
  };

  const fetchData = async () => {
    const { data, error } = await supabase.from('posts').select('*, business:businesses(*)').order('created_at', { ascending: false }).limit(20);
    if (!error && data) {
      setAllPosts(data.map((p: any) => ({ ...p, businessId: p.business_id, url: p.media_url, thumbnail: p.thumbnail_url, business: p.business })) as any);
    }
  };

  const handleUpdateBusiness = (updated: Business) => {
    setUserBusiness(updated);
    fetchData();
  };

  const handleNewPost = async (blob: Blob, type: 'video' | 'image', caption: string, onProgress: (p: number, s: string) => void, thumbnailBlob?: Blob) => {
    if (!session || !userBusiness) throw new Error("Crie um perfil profissional antes de postar.");

    try {
      onProgress(10, 'Otimizando...');
      const fileExt = type === 'video' ? 'mp4' : 'jpg';
      const mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';
      const fileName = `posts/${session.user.id}-${Date.now()}.${fileExt}`;
      const arrayBuffer = await blob.arrayBuffer();

      onProgress(30, 'Enviando arquivo...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: true });

      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(uploadData.path);

      // Upload Thumbnail if exists (for videos)
      let thumbUrl = null;
      if (thumbnailBlob) {
        onProgress(50, 'Enviando miniatura...');
        const thumbName = `thumbs/${session.user.id}-${Date.now()}.jpg`;
        const thumbBuffer = await thumbnailBlob.arrayBuffer();
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from('media')
          .upload(thumbName, thumbBuffer, { contentType: 'image/jpeg', upsert: true });

        if (!thumbError) {
          const { data: { publicUrl: tUrl } } = supabase.storage.from('media').getPublicUrl(thumbData.path);
          thumbUrl = tUrl;
        }
      }

      onProgress(80, 'Finalizando...');

      const { error: dbError } = await supabase.from('posts').insert({
        business_id: userBusiness.id,
        type: type,
        media_url: publicUrl,
        caption: caption || "",
        thumbnail_url: type === 'image' ? publicUrl : thumbUrl
      });

      if (dbError) throw dbError;

      await fetchData();
      setActiveTab('feed');
    } catch (err: any) {
      console.error("Falha no Post:", err);
      throw err;
    }
  };

  const openProfile = async (id: string, fromTab: ViewState) => {
    setLoading(true);
    // Tenta encontrar nos posts carregados primeiro (cache)
    let biz = allPosts.find(p => p.businessId === id || p.business?.id === id)?.business;

    if (!biz) {
      // Se não estiver nos posts, busca direto no banco
      const { data, error } = await supabase.from('businesses').select('*').eq('id', id).single();
      if (data) biz = data as any;
    }

    if (biz) {
      setSelectedBusiness(biz as any);
      setLastTab(fromTab);
      setActiveTab('profile');
    }
    setLoading(false);
  };

  const renderContent = () => {
    if (!session && ['me', 'following', 'dashboard'].includes(activeTab)) {
      return <AuthView onBack={() => setActiveTab('feed')} />;
    }
    switch (activeTab) {
      case 'feed': return <FeedView posts={allPosts} onProfileClick={(id) => openProfile(id, 'feed')} />;
      case 'discovery': return <DiscoveryView onBusinessClick={(id) => openProfile(id, 'discovery')} />;
      case 'following': return <FollowingView onProfileClick={(id) => openProfile(id, 'following')} />;
      case 'profile': return <ProfileView session={session} business={selectedBusiness!} posts={allPosts.filter(p => p.businessId === selectedBusiness?.id)} onBack={() => setActiveTab(lastTab)} />;
      case 'dashboard': return <DashboardView business={userBusiness} userPosts={allPosts.filter(p => p.businessId === userBusiness?.id)} />;
      case 'me': return <MeView session={session} business={userBusiness} userPosts={allPosts.filter(p => p.businessId === userBusiness?.id)} onUpdateBusiness={handleUpdateBusiness} theme={theme} onToggleTheme={setTheme} onOpenDashboard={() => setActiveTab('dashboard')} onPreviewProfile={(id) => openProfile(id, 'me')} />;
      case 'record': return <RecordView onCancel={() => { setActiveTab(lastTab); setLastTab('feed'); }} onPost={handleNewPost} />;
      default: return null;
    }
  };

  if (loading) return <div className="h-[100dvh] flex items-center justify-center bg-black text-blue-500 font-black tracking-[0.5em] animate-pulse">MAX COMPANY</div>;

  if (activeTab === 'record') {
    return (
      <div className={`mobile-frame bg-black ${theme === 'dark' ? 'dark' : ''}`}>
        <RecordView
          onCancel={() => {
            setActiveTab(lastTab);
            setLastTab('feed');
          }}
          onPost={async (blob, type, caption, onProgress, thumb) => {
            if (!session) {
              alert("Você precisa estar logado para publicar!");
              setActiveTab('me');
              return;
            }
            if (!userBusiness) {
              alert("Crie um perfil profissional primeiro!");
              setActiveTab('me');
              return;
            }
            await handleNewPost(blob, type, caption, onProgress, thumb);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`mobile-frame animate-gpu bg-white dark:bg-black text-zinc-950 dark:text-white transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      <main className="flex-1 overflow-hidden relative z-0 flex flex-col">
        {renderContent()}
      </main>

      {errorModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[340px] rounded-[2.5rem] p-8 shadow-2xl border border-red-500/20 animate-in zoom-in duration-300">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${errorModal.isSql ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              {errorModal.isSql ? <Database size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h3 className="text-xl font-black uppercase mb-2 tracking-tight">{errorModal.title}</h3>
            <p className="text-zinc-500 text-[11px] leading-relaxed mb-8 font-medium">{errorModal.msg}</p>
            <button onClick={() => setErrorModal(null)} className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
              <X size={16} /> Entendi
            </button>
          </div>
        </div>
      )}

      <nav className={`h-[84px] min-h-[84px] max-h-[84px] border-t shrink-0 ${theme === 'dark' ? 'border-zinc-900 bg-black/95' : 'border-zinc-100 bg-white/95'} backdrop-blur-md grid grid-cols-5 items-start pt-3 w-full z-[150] safe-area-bottom relative`}>
        <div className="flex justify-center items-center w-full">
          <NavButton active={activeTab === 'feed'} icon={<Home size={22} />} label="Início" onClick={() => { if (activeTab === 'feed') { fetchData(); } else { setActiveTab('feed'); } }} theme={theme} />
        </div>
        <div className="flex justify-center items-center w-full">
          <NavButton active={activeTab === 'discovery'} icon={<Search size={22} />} label="Busca" onClick={() => setActiveTab('discovery')} theme={theme} />
        </div>
        <div className="flex justify-center items-center w-full h-14 relative">
          <div onClick={() => setActiveTab('record')} className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all cursor-pointer absolute -top-5"><PlusSquare size={24} /></div>
        </div>
        <div className="flex justify-center items-center w-full">
          <NavButton active={activeTab === 'following'} icon={<Users size={22} />} label="Seguindo" onClick={() => setActiveTab('following')} theme={theme} />
        </div>
        <div className="flex justify-center items-center w-full">
          <NavButton active={activeTab === 'me'} icon={session ? <User size={22} /> : <LogIn size={22} />} label="Perfil" onClick={() => setActiveTab('me')} theme={theme} />
        </div>
      </nav>
    </div>
  );
};

const NavButton = ({ active, icon, label, onClick, theme }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 w-14 h-14 transition-all duration-300 ${active ? 'text-blue-600' : theme === 'dark' ? 'text-zinc-600' : 'text-zinc-500'}`}>
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
  </button>
);

export default App;
