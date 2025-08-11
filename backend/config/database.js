import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'friends_chat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database tables
const initDB = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(255) DEFAULT NULL,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS friendships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requester_id INT,
        addressee_id INT,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_friendship (requester_id, addressee_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        content TEXT,
        image_url VARCHAR(255),
        likes_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        post_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        UNIQUE KEY unique_like (user_id, post_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        post_id INT,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT,
        receiver_id INT,
        content TEXT,
        image_url VARCHAR(255),
        is_sticker BOOLEAN DEFAULT FALSE,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        type ENUM('like', 'comment', 'friend_request', 'friend_accepted', 'game_invite', 'game_move') NOT NULL,
        content TEXT NOT NULL,
        related_id INT DEFAULT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_notifications (user_id, created_at DESC),
        INDEX idx_unread_notifications (user_id, is_read)
      )
    `);

    // Updated games table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player1_id INT,
        player2_id INT DEFAULT NULL,
        game_type ENUM('chess', 'sudoku') NOT NULL,
        game_mode ENUM('pvp', 'bot') DEFAULT 'bot',
        game_state JSON,
        current_turn ENUM('player1', 'player2') DEFAULT 'player1',
        game_status ENUM('waiting', 'playing', 'finished', 'cancelled') DEFAULT 'waiting',
        winner_id INT DEFAULT NULL,
        game_result ENUM('player1', 'player2', 'draw', 'timeout') DEFAULT NULL,
        invite_status ENUM('pending', 'accepted', 'declined') DEFAULT NULL,
        finished_at TIMESTAMP NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_games (player1_id, game_status),
        INDEX idx_game_mode (game_mode, game_status),
        INDEX idx_game_type (game_type, game_status)
      )
    `);

    // Enhanced game_stats table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS game_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE,
        chess_wins INT DEFAULT 0,
        chess_losses INT DEFAULT 0,
        chess_draws INT DEFAULT 0,
        chess_total_games INT DEFAULT 0,
        chess_bot_wins INT DEFAULT 0,
        chess_pvp_wins INT DEFAULT 0,
        sudoku_wins INT DEFAULT 0,
        sudoku_losses INT DEFAULT 0,
        sudoku_total_games INT DEFAULT 0,
        sudoku_bot_wins INT DEFAULT 0,
        sudoku_pvp_wins INT DEFAULT 0,
        total_points INT DEFAULT 0,
        rating INT DEFAULT 1200,
        highest_rating INT DEFAULT 1200,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_rating (rating DESC),
        INDEX idx_total_points (total_points DESC),
        INDEX idx_user_stats (user_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS game_moves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT,
        player_id INT,
        move_data JSON,
        move_number INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_game_moves (game_id, move_number)
      )
    `);

    // Initialize default stats for existing users
    await pool.execute(`
      INSERT IGNORE INTO game_stats (user_id)
      SELECT id FROM users 
      WHERE id NOT IN (SELECT user_id FROM game_stats WHERE user_id IS NOT NULL)
    `);

    // Use query() instead of execute() for trigger operations
    const connection = await pool.getConnection();
    
    try {
      await connection.query('DROP TRIGGER IF EXISTS update_game_points');
      
      await connection.query(`
        CREATE TRIGGER update_game_points 
        AFTER UPDATE ON game_stats
        FOR EACH ROW
        BEGIN
          UPDATE game_stats 
          SET total_points = (
            (NEW.chess_wins * 25) + 
            (NEW.chess_draws * 10) + 
            (NEW.sudoku_wins * 30) +
            (NEW.chess_pvp_wins * 15) +
            (NEW.sudoku_pvp_wins * 20) +
            GREATEST(0, (NEW.rating - 1200) / 10)
          )
          WHERE user_id = NEW.user_id;
        END
      `);

      // Create view using query() as well
      await connection.query(`
        CREATE OR REPLACE VIEW leaderboard_view AS
        SELECT 
          u.id,
          u.username,
          u.avatar,
          gs.chess_wins,
          gs.chess_losses,
          gs.chess_draws,
          gs.chess_total_games,
          gs.sudoku_wins,
          gs.sudoku_losses,
          gs.sudoku_total_games,
          gs.total_points,
          gs.rating,
          gs.highest_rating,
          (gs.chess_total_games + gs.sudoku_total_games) as total_games_played,
          (gs.chess_wins + gs.sudoku_wins) as total_wins,
          (gs.chess_losses + gs.sudoku_losses) as total_losses,
          CASE 
            WHEN (gs.chess_total_games + gs.sudoku_total_games) > 0 
            THEN ROUND(((gs.chess_wins + gs.sudoku_wins) * 100.0) / (gs.chess_total_games + gs.sudoku_total_games), 2)
            ELSE 0 
          END as win_percentage,
          gs.updated_at
        FROM users u
        LEFT JOIN game_stats gs ON u.id = gs.user_id
        WHERE (gs.chess_total_games + gs.sudoku_total_games) > 0
        ORDER BY gs.total_points DESC, gs.rating DESC
      `);
    } finally {
      connection.release();
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// Helper functions for game statistics
const updateGameStats = async (userId, gameType, result, isBot = true) => {
  try {
    const connection = await pool.getConnection();
    
    // Get current stats
    const [rows] = await connection.execute(
      'SELECT * FROM game_stats WHERE user_id = ?',
      [userId]
    );
    
    let stats = rows[0] || {
      chess_wins: 0, chess_losses: 0, chess_draws: 0, chess_total_games: 0,
      sudoku_wins: 0, sudoku_losses: 0, sudoku_total_games: 0,
      chess_bot_wins: 0, chess_pvp_wins: 0, sudoku_bot_wins: 0, sudoku_pvp_wins: 0,
      rating: 1200
    };

    // Update stats based on game result
    if (gameType === 'chess') {
      stats.chess_total_games++;
      if (result === 'win') {
        stats.chess_wins++;
        if (isBot) stats.chess_bot_wins++;
        else stats.chess_pvp_wins++;
        stats.rating += 25;
      } else if (result === 'loss') {
        stats.chess_losses++;
        stats.rating = Math.max(800, stats.rating - 15);
      } else if (result === 'draw') {
        stats.chess_draws++;
        stats.rating += 5;
      }
    } else if (gameType === 'sudoku') {
      stats.sudoku_total_games++;
      if (result === 'win') {
        stats.sudoku_wins++;
        if (isBot) stats.sudoku_bot_wins++;
        else stats.sudoku_pvp_wins++;
        stats.rating += 20;
      } else if (result === 'loss') {
        stats.sudoku_losses++;
        stats.rating = Math.max(800, stats.rating - 10);
      }
    }

    // Update highest rating
    const newHighestRating = Math.max(stats.rating, rows[0]?.highest_rating || 1200);

    if (rows.length === 0) {
      // Insert new stats
      await connection.execute(`
        INSERT INTO game_stats (
          user_id, chess_wins, chess_losses, chess_draws, chess_total_games,
          sudoku_wins, sudoku_losses, sudoku_total_games,
          chess_bot_wins, chess_pvp_wins, sudoku_bot_wins, sudoku_pvp_wins,
          rating, highest_rating
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, stats.chess_wins, stats.chess_losses, stats.chess_draws, stats.chess_total_games,
        stats.sudoku_wins, stats.sudoku_losses, stats.sudoku_total_games,
        stats.chess_bot_wins, stats.chess_pvp_wins, stats.sudoku_bot_wins, stats.sudoku_pvp_wins,
        stats.rating, newHighestRating
      ]);
    } else {
      // Update existing stats
      await connection.execute(`
        UPDATE game_stats SET
          chess_wins = ?, chess_losses = ?, chess_draws = ?, chess_total_games = ?,
          sudoku_wins = ?, sudoku_losses = ?, sudoku_total_games = ?,
          chess_bot_wins = ?, chess_pvp_wins = ?, sudoku_bot_wins = ?, sudoku_pvp_wins = ?,
          rating = ?, highest_rating = ?
        WHERE user_id = ?
      `, [
        stats.chess_wins, stats.chess_losses, stats.chess_draws, stats.chess_total_games,
        stats.sudoku_wins, stats.sudoku_losses, stats.sudoku_total_games,
        stats.chess_bot_wins, stats.chess_pvp_wins, stats.sudoku_bot_wins, stats.sudoku_pvp_wins,
        stats.rating, newHighestRating, userId
      ]);
    }
    
    connection.release();
  } catch (error) {
    console.error('Error updating game stats:', error);
  }
};

const getLeaderboard = async (gameType = 'all', limit = 50) => {
  try {
    let query;
    let params = [limit];
    
    if (gameType === 'chess') {
      query = `
        SELECT 
          u.id, u.username, u.avatar,
          gs.chess_wins as wins,
          gs.chess_total_games as total_games,
          gs.chess_losses as losses,
          gs.chess_draws as draws,
          gs.total_points,
          gs.rating,
          CASE 
            WHEN gs.chess_total_games > 0 
            THEN ROUND((gs.chess_wins * 100.0) / gs.chess_total_games, 2)
            ELSE 0 
          END as win_percentage
        FROM users u
        INNER JOIN game_stats gs ON u.id = gs.user_id
        WHERE gs.chess_total_games > 0
        ORDER BY gs.chess_wins DESC, gs.rating DESC
        LIMIT ?
      `;
    } else if (gameType === 'sudoku') {
      query = `
        SELECT 
          u.id, u.username, u.avatar,
          gs.sudoku_wins as wins,
          gs.sudoku_total_games as total_games,
          gs.sudoku_losses as losses,
          0 as draws,
          gs.total_points,
          gs.rating,
          CASE 
            WHEN gs.sudoku_total_games > 0 
            THEN ROUND((gs.sudoku_wins * 100.0) / gs.sudoku_total_games, 2)
            ELSE 0 
          END as win_percentage
        FROM users u
        INNER JOIN game_stats gs ON u.id = gs.user_id
        WHERE gs.sudoku_total_games > 0
        ORDER BY gs.sudoku_wins DESC, gs.rating DESC
        LIMIT ?
      `;
    } else {
      query = `
        SELECT 
          u.id, u.username, u.avatar,
          (gs.chess_wins + gs.sudoku_wins) as wins,
          (gs.chess_total_games + gs.sudoku_total_games) as total_games,
          (gs.chess_losses + gs.sudoku_losses) as losses,
          gs.chess_draws as draws,
          gs.total_points,
          gs.rating,
          CASE 
            WHEN (gs.chess_total_games + gs.sudoku_total_games) > 0 
            THEN ROUND(((gs.chess_wins + gs.sudoku_wins) * 100.0) / (gs.chess_total_games + gs.sudoku_total_games), 2)
            ELSE 0 
          END as win_percentage
        FROM users u
        INNER JOIN game_stats gs ON u.id = gs.user_id
        WHERE (gs.chess_total_games + gs.sudoku_total_games) > 0
        ORDER BY gs.total_points DESC, gs.rating DESC
        LIMIT ?
      `;
    }
    
    const [rows] = await pool.execute(query, params);
    
    // Add rank to each row
    return rows.map((row, index) => ({
      ...row,
      rank: index + 1
    }));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
};

const getUserGameStats = async (userId) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        gs.*,
        u.username,
        u.avatar,
        (gs.chess_total_games + gs.sudoku_total_games) as total_games_played,
        (gs.chess_wins + gs.sudoku_wins) as total_wins,
        (gs.chess_losses + gs.sudoku_losses) as total_losses,
        CASE 
          WHEN (gs.chess_total_games + gs.sudoku_total_games) > 0 
          THEN ROUND(((gs.chess_wins + gs.sudoku_wins) * 100.0) / (gs.chess_total_games + gs.sudoku_total_games), 2)
          ELSE 0 
        END as win_percentage
      FROM game_stats gs
      LEFT JOIN users u ON gs.user_id = u.id
      WHERE gs.user_id = ?
    `, [userId]);
    
    if (rows.length === 0) {
      // Create default stats for user
      await pool.execute(`
        INSERT INTO game_stats (user_id) VALUES (?)
      `, [userId]);
      
      return {
        user_id: userId,
        chess_wins: 0, chess_losses: 0, chess_draws: 0, chess_total_games: 0,
        sudoku_wins: 0, sudoku_losses: 0, sudoku_total_games: 0,
        total_points: 0, rating: 1200, highest_rating: 1200,
        total_games_played: 0, total_wins: 0, total_losses: 0, win_percentage: 0
      };
    }
    
    return rows[0];
  } catch (error) {
    console.error('Error fetching user game stats:', error);
    return null;
  }
};

export { pool, initDB, updateGameStats, getLeaderboard, getUserGameStats };