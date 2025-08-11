import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Image, X } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await api.get('/posts');
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const createPost = async () => {
    if (!newPost.trim() && !selectedImage) return;

    try {
      const formData = new FormData();
      formData.append('content', newPost);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      await api.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setNewPost('');
      setSelectedImage(null);
      setImagePreview(null);
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const likePost = async (postId) => {
    try {
      await api.post(`/posts/${postId}/like`);
      fetchPosts();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const toggleComments = async (postId) => {
    if (!showComments[postId]) {
      try {
        const response = await api.get(`/posts/${postId}/comments`);
        setComments(prev => ({
          ...prev,
          [postId]: response.data
        }));
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    }
    
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const addComment = async (postId) => {
    const content = newComment[postId];
    if (!content?.trim()) return;

    try {
      await api.post(`/posts/${postId}/comment`, { content });
      setNewComment(prev => ({
        ...prev,
        [postId]: ''
      }));
      
      // Refresh comments
      const response = await api.get(`/posts/${postId}/comments`);
      setComments(prev => ({
        ...prev,
        [postId]: response.data
      }));
      
      fetchPosts(); // Refresh posts to update comment count
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Create Post */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows="3"
            />
            
            {imagePreview && (
              <div className="relative mt-3">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full max-h-64 object-cover rounded-lg"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            <div className="flex justify-between items-center mt-3">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-gray-500 hover:text-purple-600 cursor-pointer">
                  <Image size={20} />
                  <span>Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </div>
              <button
                onClick={createPost}
                disabled={!newPost.trim() && !selectedImage}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      {posts.map((post) => (
        <div key={post.id} className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {post.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{post.username}</h3>
              <p className="text-sm text-gray-500">
                {new Date(post.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {post.content && <p className="text-gray-800 mb-4">{post.content}</p>}

          {post.image_url && (
            <img
              src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${post.image_url}`}
              alt="Post"
              className="w-full rounded-lg mb-4 max-h-96 object-cover"
            />
          )}

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <button
              onClick={() => likePost(post.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                post.user_liked > 0
                  ? 'text-red-600 bg-red-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Heart size={20} fill={post.user_liked > 0 ? 'currentColor' : 'none'} />
              <span>{post.likes_count || 0}</span>
            </button>

            <button 
              onClick={() => toggleComments(post.id)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <MessageCircle size={20} />
              <span>{post.comments_count || 0}</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
              <Send size={20} />
              <span>Share</span>
            </button>
          </div>

          {/* Comments Section */}
          {showComments[post.id] && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              {comments[post.id]?.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-3 mb-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {comment.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <h4 className="font-semibold text-sm text-gray-900">{comment.username}</h4>
                      <p className="text-gray-800">{comment.content}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Add Comment */}
              <div className="flex items-center space-x-3 mt-4">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 flex space-x-2">
                  <input
                    type="text"
                    value={newComment[post.id] || ''}
                    onChange={(e) => setNewComment(prev => ({
                      ...prev,
                      [post.id]: e.target.value
                    }))}
                    placeholder="Write a comment..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && addComment(post.id)}
                  />
                  <button
                    onClick={() => addComment(post.id)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No posts yet. Be the first to share something!</p>
        </div>
      )}
    </div>
  );
};

export default Feed;