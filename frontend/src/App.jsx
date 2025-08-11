import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Feed from './components/Feed';
import Chat from './components/Chat';
import Friends from './components/Friends';
import Games from './components/games'; 
import Profile from './components/Profile';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('feed');
  const [selectedFriendForChat, setSelectedFriendForChat] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleNavigateToChat = (friend) => {
    setSelectedFriendForChat(friend);
    setActiveTab('chat');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <Feed />;
      case 'chat':
        return <Chat selectedFriend={selectedFriendForChat} />;
      case 'friends':
        return <Friends onNavigateToChat={handleNavigateToChat} />;
      case 'games':
        return <Games />; 
      case 'profile':
        return <Profile />;
      default:
        return <Feed />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="pt-4">
        {renderContent()}
      </main>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;