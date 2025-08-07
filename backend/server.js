const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { initDatabase, query } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// Middleware untuk autentikasi
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    
    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    req.user = user[0];
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Middleware untuk admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await query(
      'INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, username, email, hashedPassword, 'user']
    );

    // Generate token
    const token = jwt.sign({ userId: result.insertId }, JWT_SECRET);
    
    // Get user data
    const user = await query('SELECT id, name, username, email, role, created_at FROM users WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      token,
      user: user[0]
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const posts = await query('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [req.user.id]);
    const friends = await query('SELECT COUNT(*) as count FROM friendships WHERE (user_id = ? OR friend_id = ?) AND status = "accepted"', [req.user.id, req.user.id]);
    
    res.json({
      ...req.user,
      posts_count: posts[0].count,
      friends_count: friends[0].count
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Posts Routes
app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    const posts = await query(`
      SELECT p.*, u.name as user_name, u.username,
             COUNT(DISTINCT l.id) as likes_count,
             COUNT(DISTINCT c.id) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    
    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    
    const result = await query(
      'INSERT INTO posts (user_id, content) VALUES (?, ?)',
      [req.user.id, content]
    );
    
    res.status(201).json({ id: result.insertId, message: 'Post created successfully' });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    
    // Check if already liked
    const existingLike = await query('SELECT * FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
    
    if (existingLike.length > 0) {
      // Unlike
      await query('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
      res.json({ message: 'Post unliked' });
    } else {
      // Like
      await query('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.user.id, postId]);
      res.json({ message: 'Post liked' });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Friends Routes
app.get('/api/friends', authenticateToken, async (req, res) => {
  try {
    const friends = await query(`
      SELECT u.id, u.name, u.username, u.email
      FROM users u
      JOIN friendships f ON (u.id = f.user_id OR u.id = f.friend_id)
      WHERE (f.user_id = ? OR f.friend_id = ?) AND u.id != ? AND f.status = 'accepted'
    `, [req.user.id, req.user.id, req.user.id]);
    
    res.json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/friends/add', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Check if friendship already exists
    const existing = await query(
      'SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [req.user.id, userId, userId, req.user.id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Friendship already exists' });
    }
    
    await query(
      'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, ?)',
      [req.user.id, userId, 'accepted']
    );
    
    res.json({ message: 'Friend added successfully' });
  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Chat Routes
app.get('/api/chat/:friendId', authenticateToken, async (req, res) => {
  try {
    const friendId = req.params.friendId;
    
    const messages = await query(`
      SELECT m.*, 
             CASE WHEN m.sender_id = ? THEN true ELSE false END as is_sender
      FROM messages m
      WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `, [req.user.id, req.user.id, friendId, friendId, req.user.id]);
    
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/chat/send', authenticateToken, async (req, res) => {
  try {
    const { friendId, message } = req.body;
    
    await query(
      'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [req.user.id, friendId, message]
    );
    
    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Routes
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users, posts, messages, likes] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM posts'),
      query('SELECT COUNT(*) as count FROM messages'),
      query('SELECT COUNT(*) as count FROM likes')
    ]);
    
    res.json({
      total_users: users[0].count,
      total_posts: posts[0].count,
      total_messages: messages[0].count,
      total_likes: likes[0].count
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await query('SELECT id, name, username, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});