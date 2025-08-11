import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/avatars/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user.userId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadAvatar = multer({ 
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload avatar endpoint
router.post('/upload-avatar', authenticateToken, uploadAvatar.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
    res.json({ avatarUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    const [rows] = await pool.execute(
      'SELECT id, username, email, avatar FROM users WHERE username LIKE ? AND id != ?',
      [`%${q}%`, req.user.userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send friend request
router.post('/friend-request', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.body;
    
    // Check if friendship already exists
    const [existing] = await pool.execute(
      'SELECT id FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [req.user.userId, friendId, friendId, req.user.userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Friendship request already exists' });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, "pending")',
      [req.user.userId, friendId]
    );

    // Get sender username for notification
    const [senderInfo] = await pool.execute(
      'SELECT username FROM users WHERE id = ?',
      [req.user.userId]
    );

    // Create notification
    const [notificationResult] = await pool.execute(
      'INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, "friend_request", ?, ?)',
      [friendId, `${senderInfo[0].username} sent you a friend request`, result.insertId]
    );

    // Send real-time notification
    if (req.io) {
      const notificationData = {
        id: notificationResult.insertId,
        user_id: friendId,
        type: 'friend_request',
        content: `${senderInfo[0].username} sent you a friend request`,
        related_id: result.insertId,
        friendship_id: result.insertId,
        sender_username: senderInfo[0].username,
        is_read: false,
        created_at: new Date()
      };
      req.io.to(`user-${friendId}`).emit('new-notification', notificationData);
    }

    res.json({ message: 'Friend request sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept friend request
router.post('/accept-friend', authenticateToken, async (req, res) => {
  try {
    const { friendshipId } = req.body;
    
    await pool.execute(
      'UPDATE friendships SET status = "accepted" WHERE id = ?',
      [friendshipId]
    );

    // Get friendship details for notification
    const [friendship] = await pool.execute(
      'SELECT f.user_id, u.username FROM friendships f JOIN users u ON f.user_id = u.id WHERE f.id = ?',
      [friendshipId]
    );

    if (friendship.length > 0) {
      const [notificationResult] = await pool.execute(
        'INSERT INTO notifications (user_id, type, content) VALUES (?, "friend_accepted", ?)',
        [friendship[0].user_id, `${req.user.username} accepted your friend request`]
      );

      // Send real-time notification
      if (req.io) {
        const notificationData = {
          id: notificationResult.insertId,
          user_id: friendship[0].user_id,
          type: 'friend_accepted',
          content: `${req.user.username} accepted your friend request`,
          is_read: false,
          created_at: new Date()
        };
        req.io.to(`user-${friendship[0].user_id}`).emit('new-notification', notificationData);
      }

      // Also update the original notification to mark it as processed
      await pool.execute(
        'UPDATE notifications SET is_read = TRUE WHERE type = "friend_request" AND related_id = ?',
        [friendshipId]
      );
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject friend request
router.post('/reject-friend', authenticateToken, async (req, res) => {
  try {
    const { friendshipId } = req.body;
    
    // Delete the friendship request
    await pool.execute(
      'DELETE FROM friendships WHERE id = ?',
      [friendshipId]
    );

    // Mark related notification as read/processed
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE type = "friend_request" AND related_id = ?',
      [friendshipId]
    );

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get friends
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT u.id, u.username, u.avatar, u.is_online, u.last_seen
      FROM users u
      INNER JOIN friendships f ON (f.user_id = u.id OR f.friend_id = u.id)
      WHERE (f.user_id = ? OR f.friend_id = ?) 
      AND f.status = 'accepted' 
      AND u.id != ?
    `, [req.user.userId, req.user.userId, req.user.userId]);
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT n.*, f.id as friendship_id, u.username as sender_username
      FROM notifications n
      LEFT JOIN friendships f ON n.related_id = f.id AND n.type = 'friend_request'
      LEFT JOIN users u ON f.user_id = u.id
      WHERE n.user_id = ? 
      ORDER BY n.created_at DESC 
      LIMIT 20
    `, [req.user.userId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.post('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email, avatar } = req.body;
    
    await pool.execute(
      'UPDATE users SET username = ?, email = ?, avatar = ? WHERE id = ?',
      [username, email, avatar, req.user.userId]
    );

    const [updatedUser] = await pool.execute(
      'SELECT id, username, email, avatar, is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );

    res.json({ message: 'Profile updated successfully', user: updatedUser[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/profile/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [user] = await pool.execute(
      'SELECT id, username, email, avatar, created_at FROM users WHERE id = ?',
      [id]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export default router;