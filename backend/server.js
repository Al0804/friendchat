import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initDB, pool } from './config/database.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import chatRoutes from './routes/chat.js';
import gameRoutes from './routes/games.js'; // Updated

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/games', gameRoutes); // Updated

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined room user-${userId}`);
  });

  socket.on('send-message', async (data) => {
    const { receiverId, senderId, content, imageUrl } = data;
    
    try {
      const [result] = await pool.execute(
        'INSERT INTO messages (sender_id, receiver_id, content, image_url) VALUES (?, ?, ?, ?)',
        [senderId, receiverId, content, imageUrl]
      );

      const messageData = {
        id: result.insertId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        image_url: imageUrl,
        created_at: new Date()
      };

      io.to(`user-${receiverId}`).emit('new-message', messageData);
      io.to(`user-${senderId}`).emit('new-message', messageData);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  // Game-related socket events
  socket.on('join-game', (gameId) => {
    socket.join(`game-${gameId}`);
    console.log(`Socket ${socket.id} joined game ${gameId}`);
  });

  socket.on('game-move', (data) => {
    socket.to(`game-${data.gameId}`).emit('opponent-move', data);
  });

  socket.on('game-invite', (data) => {
    io.to(`user-${data.receiverId}`).emit('game-invite-received', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Initialize database and start server
initDB().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

export { io };