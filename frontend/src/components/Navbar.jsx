import React, { useState, useEffect } from 'react';
import { Home, MessageCircle, Users, GamepadIcon, User, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { io } from 'socket.io-client';

const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [processingRequests, setProcessingRequests] = useState(new Set());

  const navItems = [
    { id: 'feed', icon: Home, label: 'Feed' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'friends', icon: Users, label: 'Friends' },
    { id: 'games', icon: GamepadIcon, label: 'Games' },
  ];

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Initialize socket connection
      const newSocket = io('http://localhost:5000');
      setSocket(newSocket);
      
      // Join user room for real-time notifications
      newSocket.emit('join-room', user.id);
      
      // Listen for new notifications
      newSocket.on('new-notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification('New Notification', {
            body: notification.content,
            icon: '/favicon.ico'
          });
        }
      });
      
      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/users/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read
      if (!notification.is_read) {
        await api.post(`/users/notifications/${notification.id}/read`);
        
        // Update local state immediately
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id 
              ? { ...n, is_read: true }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Handle different notification types
      if (notification.type === 'friend_request') {
        setActiveTab('friends');
      } else if (notification.type === 'comment' || notification.type === 'like') {
        setActiveTab('feed');
      } else if (notification.type === 'friend_accepted') {
        setActiveTab('friends');
      }
      
      setShowNotifications(false);
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  const handleFriendRequest = async (friendshipId, action, notificationId) => {
    // Prevent multiple clicks
    if (processingRequests.has(notificationId)) {
      return;
    }

    try {
      // Add to processing set
      setProcessingRequests(prev => new Set([...prev, notificationId]));

      // Update notification immediately in UI to show processing state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, processing: true }
            : n
        )
      );

      if (action === 'accept') {
        await api.post('/users/accept-friend', { friendshipId });
      } else {
        await api.post('/users/reject-friend', { friendshipId });
      }
      
      // Mark notification as read
      await api.post(`/users/notifications/${notificationId}/read`);
      
      // Update notification to show completed state
      const actionText = action === 'accept' ? 'accepted' : 'declined';
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { 
                ...n, 
                is_read: true,
                processing: false,
                actionCompleted: action,
                content: `Friend request ${actionText}`
              }
            : n
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Remove from processing set
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });

      // Auto-hide the processed notification after 2 seconds
      setTimeout(() => {
        setNotifications(prev => 
          prev.filter(n => n.id !== notificationId)
        );
      }, 2000);

    } catch (error) {
      console.error('Error handling friend request:', error);
      
      // Reset processing state on error
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, processing: false, error: true }
            : n
        )
      );
      
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const formatNotificationTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return notificationTime.toLocaleDateString();
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-2 rounded-lg">
              <MessageCircle size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Friends Chat</h1>
          </div>

          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-purple-100 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon size={20} />
                <span className="hidden md:block">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                    {unreadCount > 0 && (
                      <p className="text-sm text-gray-600">{unreadCount} unread</p>
                    )}
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-gray-500">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                            !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          } ${
                            notification.actionCompleted ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm text-gray-800 font-medium">
                                {notification.content}
                              </p>
                              {notification.actionCompleted && (
                                <p className="text-xs text-green-600 font-medium mt-1">
                                  ✓ Request {notification.actionCompleted}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {formatNotificationTime(notification.created_at)}
                              </p>
                            </div>
                            {!notification.is_read && !notification.actionCompleted && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                            )}
                            {notification.actionCompleted && (
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                          
                          {notification.type === 'friend_request' && 
                           notification.friendship_id && 
                           !notification.actionCompleted && 
                           !notification.processing && (
                            <div className="flex space-x-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFriendRequest(notification.friendship_id, 'accept', notification.id);
                                }}
                                className="bg-green-600 text-white px-3 py-1 rounded-md text-xs hover:bg-green-700 transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFriendRequest(notification.friendship_id, 'reject', notification.id);
                                }}
                                className="bg-red-600 text-white px-3 py-1 rounded-md text-xs hover:bg-red-700 transition-colors"
                              >
                                Decline
                              </button>
                            </div>
                          )}

                          {notification.processing && (
                            <div className="flex items-center space-x-2 mt-3">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                              <span className="text-xs text-gray-600">Processing...</span>
                            </div>
                          )}

                          {notification.error && (
                            <div className="mt-3">
                              <p className="text-xs text-red-600">Error processing request. Please try again.</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={() => {
                          setShowNotifications(false);
                          // You can add a "view all notifications" page here
                        }}
                        className="w-full text-center text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        View all notifications
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden md:block text-gray-700 font-medium">{user?.username}</span>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setShowDropdown(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors"
                  >
                    <User size={16} />
                    <span>Profile</span>
                  </button>
                  <hr className="border-gray-200" />
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 w-full px-4 py-3 text-left hover:bg-gray-100 text-red-600 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;