import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Calendar, Crown, Edit2, Save, X, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    avatar: user?.avatar || ''
  });
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      avatar: user?.avatar || ''
    });
    setAvatarPreview(user?.avatar);
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAvatarSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('File size must be less than 2MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setSelectedAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post('/users/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data.avatarUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setUploading(selectedAvatar ? true : false);
    setError('');

    try {
      let avatarUrl = formData.avatar;
      
      if (selectedAvatar) {
        avatarUrl = await uploadAvatar(selectedAvatar);
      }

      const updateData = {
        ...formData,
        avatar: avatarUrl
      };

      const response = await api.put('/users/profile', updateData);
      
      // Update user in context and localStorage
      const updatedUser = { ...user, ...response.data.user };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setIsEditing(false);
      setSelectedAvatar(null);
      alert('Profile updated successfully!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      avatar: user?.avatar || ''
    });
    setSelectedAvatar(null);
    setAvatarPreview(user?.avatar);
    setIsEditing(false);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAvatarDisplay = () => {
    if (avatarPreview) {
      return (
        <img
          src={avatarPreview}
          alt="Avatar"
          className="w-24 h-24 rounded-full object-cover border-4 border-purple-200"
        />
      );
    }
    return (
      <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-purple-200">
        {formData.username?.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="text-center mb-8">
          <div className="relative inline-block">
            {getAvatarDisplay()}
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors"
              >
                <Camera size={16} />
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
          </div>
          
          {isEditing ? (
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="text-2xl font-bold text-gray-800 text-center border-b-2 border-purple-600 bg-transparent focus:outline-none mt-4"
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-800 mt-4">{user?.username}</h1>
          )}
          
          {user?.isAdmin && (
            <div className="flex items-center justify-center space-x-2 mt-2">
              <Crown className="text-yellow-500" size={20} />
              <span className="text-yellow-600 font-semibold">Administrator</span>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {uploading && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            Uploading avatar...
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <User className="text-purple-600" size={24} />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Username</p>
              {isEditing ? (
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="font-semibold text-gray-800 bg-transparent border-b border-gray-300 focus:outline-none focus:border-purple-600"
                />
              ) : (
                <p className="font-semibold text-gray-800">{user?.username}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <Mail className="text-purple-600" size={24} />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Email</p>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="font-semibold text-gray-800 bg-transparent border-b border-gray-300 focus:outline-none focus:border-purple-600"
                />
              ) : (
                <p className="font-semibold text-gray-800">{user?.email}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <Calendar className="text-purple-600" size={24} />
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="font-semibold text-gray-800">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'January 2024'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          {isEditing ? (
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleSave}
                disabled={loading || uploading}
                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button
                onClick={handleCancel}
                disabled={loading || uploading}
                className="flex items-center space-x-2 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors mx-auto"
            >
              <Edit2 size={16} />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;