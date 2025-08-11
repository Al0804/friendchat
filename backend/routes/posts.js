import express from 'express';
import multer from 'multer';
import path from 'path';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Create post
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const [result] = await pool.execute(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [req.user.userId, content, imageUrl]
    );

    res.json({ id: result.insertId, message: 'Post created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get posts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT p.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as likes_count,
      (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as user_liked,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [req.user.userId]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like post
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    
    // Check if already liked
    const [existing] = await pool.execute(
      'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?',
      [req.user.userId, postId]
    );

    if (existing.length > 0) {
      // Unlike
      await pool.execute(
        'DELETE FROM post_likes WHERE user_id = ? AND post_id = ?',
        [req.user.userId, postId]
      );
    } else {
      // Like
      await pool.execute(
        'INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)',
        [req.user.userId, postId]
      );

      // Create notification
      const [postData] = await pool.execute(
        'SELECT user_id FROM posts WHERE id = ?',
        [postId]
      );

      if (postData[0] && postData[0].user_id !== req.user.userId) {
        await pool.execute(
          'INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, "like", ?, ?)',
          [postData[0].user_id, `${req.user.username} liked your post`, postId]
        );
      }
    }

    res.json({ message: 'Success' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment
router.post('/:id/comment', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)',
      [req.user.userId, postId, content]
    );

    // Create notification
    const [postData] = await pool.execute(
      'SELECT user_id FROM posts WHERE id = ?',
      [postId]
    );

    if (postData[0] && postData[0].user_id !== req.user.userId) {
      await pool.execute(
        'INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, "comment", ?, ?)',
        [postData[0].user_id, `${req.user.username} commented on your post`, postId]
      );
    }

    res.json({ id: result.insertId, message: 'Comment added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments
router.get('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    
    const [rows] = await pool.execute(`
      SELECT c.*, u.username, u.avatar
      FROM comments c
      INNER JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;