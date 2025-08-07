const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.vercel.app' 
  : 'http://localhost:5000';

// Create axios instance (if using axios in production)
const createApiClient = () => {
  if (typeof window !== 'undefined' && window.axios) {
    const api = window.axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor untuk menambahkan token
    api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return api;
  }
  return null;
};

// Fallback fetch implementation
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (config.data) {
    config.body = JSON.stringify(config.data);
    delete config.data;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
};

// Auth API
export const authAPI = {
  login: async (credentials) => {
    const api = createApiClient();
    if (api) {
      return api.post('/api/auth/login', credentials);
    }
    return { data: await apiRequest('/api/auth/login', { method: 'POST', data: credentials }) };
  },

  register: async (userData) => {
    const api = createApiClient();
    if (api) {
      return api.post('/api/auth/register', userData);
    }
    return { data: await apiRequest('/api/auth/register', { method: 'POST', data: userData }) };
  },

  getProfile: async () => {
    const api = createApiClient();
    if (api) {
      return api.get('/api/auth/profile');
    }
    return { data: await apiRequest('/api/auth/profile', { method: 'GET' }) };
  },

  updateProfile: async (profileData) => {
    const api = createApiClient();
    if (api) {
      return api.put('/api/auth/profile', profileData);
    }
    return { data: await apiRequest('/api/auth/profile', { method: 'PUT', data: profileData }) };
  }
};

// Posts API
export const postsAPI = {
  getPosts: async () => {
    const api = createApiClient();
    if (api) {
      return api.get('/api/posts');
    }
    return { data: await apiRequest('/api/posts', { method: 'GET' }) };
  },

  createPost: async (postData) => {
    const api = createApiClient();
    if (api) {
      return api.post('/api/posts', postData);
    }
    return { data: await apiRequest('/api/posts', { method: 'POST', data: postData }) };
  },

  likePost: async (postId) => {
    const api = createApiClient();
    if (api) {
      return api.post(`/api/posts/${postId}/like`);
    }
    return { data: await apiRequest(`/api/posts/${postId}/like`, { method: 'POST' }) };
  },

  addComment: async (postId, commentData) => {
    const api = createApiClient();
    if (api) {
      return api.post(`/api/posts/${postId}/comments`, commentData);
    }
    return { data: await apiRequest(`/api/posts/${postId}/comments`, { method: 'POST', data: commentData }) };
  }
};

// Friends API
export const friendsAPI = {
  getFriends: async () => {
    const api = createApiClient();
    if (api) {
      return api.get('/api/friends');
    }
    return { data: await apiRequest('/api/friends', { method: 'GET' }) };
  },

  addFriend: async (userId) => {
    const api = createApiClient();
    if (api) {
      return api.post('/api/friends/add', { userId });
    }
    return { data: await apiRequest('/api/friends/add', { method: 'POST', data: { userId } }) };
  },

  removeFriend: async (userId) => {
    const api = createApiClient();
    if (api) {
      return api.delete(`/api/friends/${userId}`);
    }
    return { data: await apiRequest(`/api/friends/${userId}`, { method: 'DELETE' }) };
  },

  searchUsers: async (query) => {
    const api = createApiClient();
    if (api) {
      return api.get(`/api/friends/search?q=${encodeURIComponent(query)}`);
    }
    return { data: await apiRequest(`/api/friends/search?q=${encodeURIComponent(query)}`, { method: 'GET' }) };
  }
};

// Chat API
export const chatAPI = {
  getMessages: async (friendId) => {
    const api = createApiClient();
    if (api) {
      return api.get(`/api/chat/${friendId}`);
    }
    return { data: await apiRequest(`/api/chat/${friendId}`, { method: 'GET' }) };
  },

  sendMessage: async (friendId, messageData) => {
    const api = createApiClient();
    if (api) {
      return api.post('/api/chat/send', { friendId, ...messageData });
    }
    return { data: await apiRequest('/api/chat/send', { method: 'POST', data: { friendId, ...messageData } }) };
  }
};

// Admin API
export const adminAPI = {
  getStats: async () => {
    const api = createApiClient();
    if (api) {
      return api.get('/api/admin/stats');
    }
    return { data: await apiRequest('/api/admin/stats', { method: 'GET' }) };
  },

  getUsers: async () => {
    const api = createApiClient();
    if (api) {
      return api.get('/api/admin/users');
    }
    return { data: await apiRequest('/api/admin/users', { method: 'GET' }) };
  },

  deleteUser: async (userId) => {
    const api = createApiClient();
    if (api) {
      return api.delete(`/api/admin/users/${userId}`);
    }
    return { data: await apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' }) };
  }
};

// File upload helper
export const uploadFile = async (file, type = 'image') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('File upload failed');
  }

  return response.json();
};

// Export default object for backward compatibility
const api = {
  auth: authAPI,
  posts: postsAPI,
  friends: friendsAPI,
  chat: chatAPI,
  admin: adminAPI,
  upload: uploadFile
};

export default api;