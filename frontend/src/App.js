import React, { useState, useEffect, createContext, useContext } from 'react';
import { Heart, MessageCircle, Send, Users, Settings, Home, Search, PlusSquare, User, Shield, Menu, X, Camera, Image, Smile } from 'lucide-react';
import { authAPI, postsAPI, friendsAPI, chatAPI, adminAPI } from './api';

const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUserProfile();
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data);
      loadPosts();
      loadFriends();
    } catch (error) {
      console.error('Error loading profile:', error);
      localStorage.removeItem('token');
    }
  };

  const loadPosts = async () => {
    try {
      const response = await postsAPI.getPosts();
      setPosts(response.data);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await friendsAPI.getFriends();
      setFriends(response.data);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  return (
    <AppContext.Provider value={{
      user, setUser, posts, setPosts, friends, setFriends,
      currentView, setCurrentView, selectedChat, setSelectedChat,
      loading, setLoading, loadPosts, loadFriends
    }}>
      {children}
    </AppContext.Provider>
  );
};

const Layout = ({ children }) => {
  const { user, currentView, setCurrentView } = useContext(AppContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'create', icon: PlusSquare, label: 'Create' },
    { id: 'chat', icon: MessageCircle, label: 'Messages' },
    { id: 'profile', icon: User, label: 'Profile' },
    ...(user?.role === 'admin' ? [{ id: 'admin', icon: Shield, label: 'Admin Panel' }] : [])
  ];

  const logout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Friends Chat
        </h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out lg:static lg:inset-0`}>
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Friends Chat
              </h1>
            </div>
            
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setCurrentView(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                        currentView === item.id 
                          ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {user && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                    {user.name?.[0]}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">@{user.username}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Overlay untuk mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          {children}
        </div>
      </div>
    </div>
  );
};

const Auth = () => {
  const { setUser } = useContext(AppContext);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = isLogin 
        ? await authAPI.login({ email: formData.email, password: formData.password })
        : await authAPI.register(formData);
      
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Friends Chat
          </h1>
          <p className="text-gray-600">Connect with friends around the world</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required={!isLogin}
              />
              <input
                type="text"
                placeholder="Username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required={!isLogin}
              />
            </>
          )}
          
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Feed = () => {
  const { posts, setPosts, loadPosts } = useContext(AppContext);
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    try {
      await postsAPI.createPost({ content: newPost });
      setNewPost('');
      loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleLike = async (postId) => {
    try {
      await postsAPI.likePost(postId);
      loadPosts();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const PostCard = ({ post }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
      <div className="p-4 flex items-center">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
          {post.user_name?.[0]}
        </div>
        <div className="ml-3">
          <h3 className="font-semibold text-gray-900">{post.user_name}</h3>
          <p className="text-sm text-gray-500">@{post.username} • {new Date(post.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="px-4 pb-4">
        <p className="text-gray-800 mb-4">{post.content}</p>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => handleLike(post.id)}
            className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
          >
            <Heart className="w-5 h-5" />
            <span>{post.likes_count || 0}</span>
          </button>
          <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span>{post.comments_count || 0}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-8">
        <form onSubmit={handleCreatePost} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
              👤
            </div>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              className="flex-1 bg-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows="3"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <button type="button" className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors">
                <Camera className="w-5 h-5" />
                <span>Photo</span>
              </button>
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Post
            </button>
          </div>
        </form>
      </div>

      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};

const Chat = () => {
  const { friends, selectedChat, setSelectedChat } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    }
  }, [selectedChat]);

  const loadMessages = async () => {
    try {
      const response = await chatAPI.getMessages(selectedChat.id);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    try {
      await chatAPI.sendMessage(selectedChat.id, newMessage);
      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Friends List */}
      <div className="w-1/3 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Messages</h2>
        </div>
        <div className="overflow-y-auto">
          {friends.map(friend => (
            <div
              key={friend.id}
              onClick={() => setSelectedChat(friend)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedChat?.id === friend.id ? 'bg-purple-50' : ''
              }`}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                  {friend.name?.[0]}
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="font-semibold text-gray-900">{friend.name}</h3>
                  <p className="text-sm text-gray-500">@{friend.username}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 bg-white border-b border-gray-200 flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                {selectedChat.name?.[0]}
              </div>
              <div className="ml-3">
                <h3 className="font-semibold">{selectedChat.name}</h3>
                <p className="text-sm text-gray-500">@{selectedChat.username}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.is_sender ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      message.is_sender
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p>{message.message}</p>
                    <p className={`text-xs mt-1 ${message.is_sender ? 'text-purple-100' : 'text-gray-500'}`}>
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={sendMessage}
                  className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Select a friend to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Profile = () => {
  const { user } = useContext(AppContext);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500"></div>
        <div className="px-6 pb-6">
          <div className="flex items-end -mt-16 mb-6">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white text-4xl font-bold">
              {user?.name?.[0]}
            </div>
            <div className="ml-6 pb-2">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-gray-600">@{user?.username}</p>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Posts</h3>
              <p className="text-2xl font-bold text-purple-600">{user?.posts_count || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Friends</h3>
              <p className="text-2xl font-bold text-purple-600">{user?.friends_count || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Joined</h3>
              <p className="text-sm text-gray-600">{new Date(user?.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Admin = () => {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [statsResponse, usersResponse] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers()
      ]);
      setStats(statsResponse.data);
      setUsers(usersResponse.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_users || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <PlusSquare className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Posts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_posts || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <MessageCircle className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_messages || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Heart className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Likes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_likes || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Users</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                        {user.name?.[0]}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SearchUsers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleAddFriend = async (userId) => {
    try {
      await friendsAPI.addFriend(userId);
      alert('Friend request sent!');
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for friends..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {results.map(result => (
          <div key={result.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                  {result.name?.[0]}
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">{result.name}</h3>
                  <p className="text-sm text-gray-500">@{result.username}</p>
                </div>
              </div>
              <button 
                onClick={() => handleAddFriend(result.id)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Add Friend
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const App = () => {
  const { user, currentView } = useContext(AppContext);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <Feed />;
      case 'search':
        return <Search />;
      case 'chat':
        return <Chat />;
      case 'profile':
        return <Profile />;
      case 'admin':
        return <Admin />;
      default:
        return <Feed />;
    }
  };

  if (!user) {
    return <Auth />;
  }

  return (
    <Layout>
      {renderCurrentView()}
    </Layout>
  );
};

const FriendsChat = () => {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
};

export default FriendsChat;