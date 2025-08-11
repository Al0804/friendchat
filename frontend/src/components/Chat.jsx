import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, Smile, X, Upload } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Chat = ({ selectedFriend: propSelectedFriend }) => {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(propSelectedFriend || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [showStickers, setShowStickers] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sticker collection
  const stickers = [
    '😀', '😂', '🥰', '😍', '🤩', '😊', '😉', '😎', '🤔', '😴',
    '🥳', '😭', '😱', '🤯', '🙄', '😤', '🤗', '🤭', '🤫', '🤐',
    '👍', '👎', '👏', '🙌', '👌', '✌️', '🤞', '👋', '🤚', '✋',
    '❤️', '💕', '💖', '💗', '💙', '💚', '💛', '🧡', '💜', '🖤',
    '🔥', '⭐', '✨', '💫', '⚡', '💥', '💯', '✅', '❌', '❓'
  ];

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
    setSocket(newSocket);

    if (user) {
      newSocket.emit('join-room', user.id);
    }

    newSocket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    fetchFriends();

    return () => newSocket.close();
  }, [user]);

  // Update selected friend when prop changes
  useEffect(() => {
    if (propSelectedFriend) {
      setSelectedFriend(propSelectedFriend);
      fetchMessages(propSelectedFriend.id);
    }
  }, [propSelectedFriend]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchFriends = async () => {
    try {
      const response = await api.get('/users/friends');
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchMessages = async (friendId) => {
    try {
      const response = await api.get(`/chat/${friendId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setSelectedImage(file);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/chat/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const sendMessage = async (content = null, imageFile = null, isSticker = false) => {
    if ((!content?.trim() && !imageFile) || !selectedFriend) return;

    setUploading(true);
    try {
      let imageUrl = null;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const messageData = {
        receiverId: selectedFriend.id,
        senderId: user.id,
        content: content || '',
        imageUrl: imageUrl,
        isSticker: isSticker
      };

      socket.emit('send-message', messageData);
      
      if (!isSticker) {
        setNewMessage('');
      }
      setSelectedImage(null);
      setShowStickers(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      alert('Failed to send message. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSendText = () => {
    sendMessage(newMessage);
  };

  const handleSendImage = () => {
    if (selectedImage) {
      sendMessage(null, selectedImage);
    }
  };

  const handleSendSticker = (sticker) => {
    sendMessage(sticker, null, true);
  };

  const selectFriend = (friend) => {
    setSelectedFriend(friend);
    fetchMessages(friend.id);
    setShowStickers(false);
    setSelectedImage(null);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Friends List */}
      <div className="w-1/3 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
        </div>
        <div className="overflow-y-auto h-full">
          {friends.map((friend) => (
            <div
              key={friend.id}
              onClick={() => selectFriend(friend)}
              className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                selectedFriend?.id === friend.id ? 'bg-purple-50 border-r-4 border-purple-600' : ''
              }`}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {friend.username?.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  friend.is_online ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="font-semibold text-gray-900">{friend.username}</h3>
                <p className="text-sm text-gray-500">
                  {friend.is_online ? 'Online' : `Last seen ${new Date(friend.last_seen).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className="bg-white p-4 border-b border-gray-200 flex items-center">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                {selectedFriend.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedFriend.username}</h3>
                <p className="text-sm text-gray-500">
                  {selectedFriend.is_online ? 'Online' : `Last seen ${new Date(selectedFriend.last_seen).toLocaleDateString()}`}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_id === user.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    {message.is_sticker ? (
                      <div className="text-4xl">{message.content}</div>
                    ) : (
                      <>
                        {message.content && <p>{message.content}</p>}
                        {message.image_url && (
                          <img
                            src={message.image_url}
                            alt="Shared"
                            className="mt-2 rounded-lg max-w-full cursor-pointer hover:opacity-90"
                            onClick={() => window.open(message.image_url, '_blank')}
                          />
                        )}
                      </>
                    )}
                    <p className={`text-xs mt-1 ${
                      message.sender_id === user.id ? 'text-purple-200' : 'text-gray-500'
                    }`}>
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview */}
            {selectedImage && (
              <div className="bg-white p-4 border-t border-gray-200">
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded"
                    />
                    <span className="text-sm text-gray-600">{selectedImage.name}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSendImage}
                      disabled={uploading}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {uploading ? 'Sending...' : 'Send'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stickers Panel */}
            {showStickers && (
              <div className="bg-white p-4 border-t border-gray-200">
                <div className="grid grid-cols-10 gap-2 max-h-40 overflow-y-auto">
                  {stickers.map((sticker, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendSticker(sticker)}
                      className="text-2xl p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {sticker}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="bg-white p-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-purple-600 rounded-lg transition-colors"
                  disabled={uploading}
                >
                  <Image size={20} />
                </button>
                <button
                  onClick={() => setShowStickers(!showStickers)}
                  className={`p-2 rounded-lg transition-colors ${
                    showStickers ? 'text-purple-600 bg-purple-50' : 'text-gray-500 hover:text-purple-600'
                  }`}
                >
                  <Smile size={20} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !uploading && handleSendText()}
                  placeholder="Type a message..."
                  disabled={uploading}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  onClick={handleSendText}
                  disabled={uploading || (!newMessage.trim())}
                  className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a friend to start chatting</h3>
              <p className="text-gray-500">Choose a conversation from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;