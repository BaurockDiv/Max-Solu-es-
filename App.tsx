
import React, { useState, useMemo } from 'react';
import { 
  Home, 
  Search, 
  LayoutDashboard, 
  FileText, 
  PlusSquare
} from 'lucide-react';
import { MOCK_POSTS, MOCK_BUSINESSES } from './data';
import { ViewState, Business, MediaPost } from './types';
import FeedView from './components/FeedView';
import DiscoveryView from './components/DiscoveryView';
import ProfileView from './components/ProfileView';
import DashboardView from './components/DashboardView';
import DocumentationView from './components/DocumentationView';
import RecordView from './components/RecordView';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewState>('feed');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [allPosts, setAllPosts] = useState<MediaPost[]>(MOCK_POSTS);

  const navigateToProfile = (businessId: string) => {
    setSelectedBusiness(MOCK_BUSINESSES[businessId]);
    setActiveTab('profile');
  };

  const handleNewPost = (mediaBlob: Blob, type: 'video' | 'image') => {
    // Cria uma URL para o arquivo (seja vindo da câmera ou galeria)
    const mediaUrl = URL.createObjectURL(mediaBlob);
    
    const newPost: MediaPost = {
      id: `p-${Date.now()}`,
      businessId: 'b1', // Artisan Brews
      type: type,
      url: mediaUrl,
      thumbnail: type === 'image' ? mediaUrl : 'https://picsum.photos/seed/vid-thumb/1080/1920',
      caption: `Novo conteúdo ${type === 'image' ? 'fotográfico' : 'em vídeo'} publicado via BizStudio! ✨`,
      ctaText: 'Ver Detalhes',
      ctaUrl: '#',
      tags: ['#bizstream', '#novidade'],
      likes: 0,
      isAffiliate: false
    };

    setAllPosts([newPost, ...allPosts]);
    setActiveTab('feed');
    alert(`Seu ${type === 'image' ? 'post' : 'vídeo'} foi publicado com sucesso!`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <FeedView posts={allPosts} onProfileClick={navigateToProfile} />;
      case 'discovery':
        return <DiscoveryView onBusinessClick={navigateToProfile} />;
      case 'profile':
        return <ProfileView business={selectedBusiness || MOCK_BUSINESSES['b1']} onBack={() => setActiveTab('feed')} />;
      case 'dashboard':
        return <DashboardView />;
      case 'docs':
        return <DocumentationView />;
      case 'record':
        return <RecordView onCancel={() => setActiveTab('feed')} onPost={handleNewPost} />;
      default:
        return <FeedView posts={allPosts} onProfileClick={navigateToProfile} />;
    }
  };

  return (
    <div className="mobile-frame bg-white dark:bg-zinc-950 flex flex-col h-screen overflow-hidden">
      <main className="flex-1 overflow-y-auto hide-scrollbar relative bg-zinc-50 dark:bg-zinc-950">
        {renderContent()}
      </main>

      {activeTab !== 'record' && (
        <nav className="h-16 border-t border-zinc-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md flex items-center justify-around px-2 z-50">
          <NavButton 
            active={activeTab === 'feed'} 
            icon={<Home size={22} />} 
            label="Feed" 
            onClick={() => setActiveTab('feed')} 
          />
          <NavButton 
            active={activeTab === 'discovery'} 
            icon={<Search size={22} />} 
            label="Explore" 
            onClick={() => setActiveTab('discovery')} 
          />
          <div className="flex flex-col items-center justify-center p-2">
              <div 
                onClick={() => setActiveTab('record')}
                className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-all cursor-pointer hover:bg-blue-500"
              >
                  <PlusSquare size={24} />
              </div>
          </div>
          <NavButton 
            active={activeTab === 'dashboard'} 
            icon={<LayoutDashboard size={22} />} 
            label="Painel" 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavButton 
            active={activeTab === 'docs'} 
            icon={<FileText size={22} />} 
            label="Specs" 
            onClick={() => setActiveTab('docs')} 
          />
        </nav>
      )}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; icon: React.ReactNode; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center space-y-0.5 w-16 transition-all ${active ? 'text-blue-600' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'scale-100'}`}>
      {icon}
    </div>
    <span className={`text-[10px] font-bold tracking-tight transition-opacity ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);

export default App;
