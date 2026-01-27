
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Home, Search, Users, User, PlusSquare, LogIn } from 'lucide-react';
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('bizstream-theme') as 'light' | 'dark') || 'dark');

  useEffect(() => {
    localStorage.setItem('bizstream-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        fetchUserBusiness(session.user.id);
        supabase.helpers.syncFollows(session.user.id);
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
    const { data } = await supabase.from('businesses').select('*').eq('owner_id', userId).single();
    if (data) setUserBusiness(data as any);
  };

  const fetchData = async () => {
    const { data, error } = await supabase.from('posts').select('*, business:businesses(*)').order('created_at', { ascending: false }).limit(20);
    if (!error && data) {
      setAllPosts(data.map((p: any) => ({ ...p, businessId: p.business_id, url: p.media_url, thumbnail: p.thumbnail_url, business: p.business })) as any);
    }
  };

  const handleNewPost = async (blob: Blob, type: 'video' | 'image', caption: string, onProgress: (p: number, s: string) => void) => {
    if (!session || !userBusiness) return;
    
    try {
      onProgress(10, 'Preparando Arquivo...');
      const fileName = `${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`;
      const filePath = `${session.user.id}/${fileName}`;
      
      onProgress(30, 'Enviando para Nuvem...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, blob, { cacheControl: '3600', upsert: false });
        
      if (uploadError) throw uploadError;
      
      onProgress(70, 'Gerando Links...');
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(uploadData.path);
      
      onProgress(90, 'Finalizando...');
      const { error: dbError } = await supabase.from('posts').insert({
        business_id: userBusiness.id,
        type: type,
        media_url: publicUrl,
        caption: caption || "Publicação BizStream",
        thumbnail_url: type === 'image' ? publicUrl : null
      });
      
      if (dbError) throw dbError;
      
      await fetchData();
      setActiveTab('feed');
    } catch (err: any) {
      throw new Error("Falha no upload: " + err.message);
    }
  };

  const navigateToProfile = (businessId: string) => {
    const biz = allPosts.find(p => p.businessId === businessId || p.business?.id === businessId)?.business;
    if (biz) {
      setSelectedBusiness(biz as any);
      setLastTab(activeTab);
      setActiveTab('profile');
    }
  };

  const renderContent = () => {
    if (!session && ['me', 'following', 'record', 'dashboard'].includes(activeTab)) {
      return <AuthView onBack={() => setActiveTab('feed')} />;
    }
    switch (activeTab) {
      case 'feed': return <FeedView posts={allPosts} onProfileClick={navigateToProfile} />;
      case 'discovery': return <DiscoveryView onBusinessClick={navigateToProfile} />;
      case 'following': return <FollowingView onProfileClick={navigateToProfile} />;
      case 'profile': return <ProfileView business={selectedBusiness!} posts={allPosts.filter(p => p.businessId === selectedBusiness?.id)} onBack={() => setActiveTab(lastTab)} />;
      case 'dashboard': return <DashboardView business={userBusiness} userPosts={allPosts.filter(p => p.businessId === userBusiness?.id)} />;
      case 'me': return <MeView session={session} business={userBusiness} onUpdateBusiness={setUserBusiness} theme={theme} onToggleTheme={setTheme} onOpenDashboard={() => setActiveTab('dashboard')} />;
      case 'record': return <RecordView onCancel={() => setActiveTab('feed')} onPost={handleNewPost} />;
      default: return null;
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-black text-blue-500 font-black tracking-[0.5em] animate-pulse">BIZSTREAM</div>;

  return (
    <div className={`mobile-frame transition-colors duration-500 ${theme === 'dark' ? 'dark bg-black text-white' : 'bg-white text-zinc-950'} flex flex-col h-screen overflow-hidden`}>
      <main className="flex-1 overflow-y-auto hide-scrollbar relative">{renderContent()}</main>
      {activeTab !== 'record' && (
        <nav className={`h-[84px] border-t ${theme === 'dark' ? 'border-zinc-900 bg-black' : 'border-zinc-100 bg-white'} flex items-center justify-around px-6 z-50 safe-area-bottom`}>
          <NavButton active={activeTab === 'feed'} icon={<Home size={24} />} label="Início" onClick={() => setActiveTab('feed')} theme={theme} />
          <NavButton active={activeTab === 'discovery'} icon={<Search size={24} />} label="Busca" onClick={() => setActiveTab('discovery')} theme={theme} />
          <div onClick={() => setActiveTab('record')} className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all cursor-pointer"><PlusSquare size={26} /></div>
          <NavButton active={activeTab === 'following'} icon={<Users size={24} />} label="Rede" onClick={() => setActiveTab('following')} theme={theme} />
          <NavButton active={activeTab === 'me'} icon={session ? <User size={24} /> : <LogIn size={24} />} label="Perfil" onClick={() => setActiveTab('me')} theme={theme} />
        </nav>
      )}
    </div>
  );
};

const NavButton = ({ active, icon, label, onClick, theme }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 w-12 transition-all ${active ? 'text-blue-600' : theme === 'dark' ? 'text-zinc-700' : 'text-zinc-400'}`}>
    {icon}
    <span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
