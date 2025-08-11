import express from 'express';
import { pool } from '../config/database.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Initialize chess board
const initializeChessBoard = () => {
  return [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  ];
};

// Generate multiple different Sudoku puzzles
const generateSudokuPuzzle = (difficulty = 'medium') => {
  const puzzles = [
    {
      puzzle: [
        [5,3,0,0,7,0,0,0,0],
        [6,0,0,1,9,5,0,0,0],
        [0,9,8,0,0,0,0,6,0],
        [8,0,0,0,6,0,0,0,3],
        [4,0,0,8,0,3,0,0,1],
        [7,0,0,0,2,0,0,0,6],
        [0,6,0,0,0,0,2,8,0],
        [0,0,0,4,1,9,0,0,5],
        [0,0,0,0,8,0,0,7,9]
      ],
      solution: [
        [5,3,4,6,7,8,9,1,2],
        [6,7,2,1,9,5,3,4,8],
        [1,9,8,3,4,2,5,6,7],
        [8,5,9,7,6,1,4,2,3],
        [4,2,6,8,5,3,7,9,1],
        [7,1,3,9,2,4,8,5,6],
        [9,6,1,5,3,7,2,8,4],
        [2,8,7,4,1,9,6,3,5],
        [3,4,5,2,8,6,1,7,9]
      ]
    },
    {
      puzzle: [
        [0,2,0,6,0,8,0,0,0],
        [5,8,0,0,0,9,7,0,0],
        [0,0,0,0,4,0,0,0,0],
        [3,7,0,0,0,0,5,0,0],
        [6,0,0,0,0,0,0,0,4],
        [0,0,8,0,0,0,0,1,3],
        [0,0,0,0,2,0,0,0,0],
        [0,0,9,8,0,0,0,3,6],
        [0,0,0,3,0,6,0,9,0]
      ],
      solution: [
        [1,2,3,6,7,8,9,4,5],
        [5,8,4,2,3,9,7,6,1],
        [9,6,7,1,4,5,3,2,8],
        [3,7,2,4,6,1,5,8,9],
        [6,1,5,9,8,3,2,7,4],
        [4,9,8,5,2,7,6,1,3],
        [8,3,6,7,2,4,1,5,9],
        [2,4,9,8,1,5,4,3,6],
        [7,5,1,3,9,6,8,9,2]
      ]
    },
    {
      puzzle: [
        [0,0,0,0,0,0,6,8,0],
        [0,0,0,0,0,3,0,0,0],
        [7,0,0,0,9,0,5,0,0],
        [5,7,0,0,0,0,0,0,0],
        [0,0,0,0,8,5,0,0,0],
        [0,0,0,0,0,0,0,1,9],
        [0,0,4,0,0,0,0,0,2],
        [0,0,0,0,3,0,0,0,0],
        [0,9,0,0,0,0,0,0,0]
      ],
      solution: [
        [1,5,9,7,4,2,6,8,3],
        [8,6,2,1,5,3,9,4,7],
        [7,3,4,6,9,8,5,2,1],
        [5,7,1,3,2,9,4,6,8],
        [9,4,3,5,8,5,7,3,6],
        [6,2,8,4,7,6,3,1,9],
        [3,8,4,9,6,7,1,5,2],
        [4,1,7,2,3,5,8,9,6],
        [2,9,6,8,1,4,3,7,5]
      ]
    }
  ];

  // Select random puzzle
  const selectedPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
  return selectedPuzzle;
};

// Create game vs bot only
router.post('/create', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { gameType } = req.body;
    const userId = req.user.id;

    if (!['chess', 'sudoku'].includes(gameType)) {
      return res.status(400).json({ success: false, error: 'Invalid game type' });
    }

    // Ensure user has stats
    await ensureStatsExist(userId, connection);

    // Initialize game state
    let gameState;
    if (gameType === 'chess') {
      gameState = { 
        board: initializeChessBoard(), 
        currentPlayer: 'white',
        moveHistory: [],
        capturedPieces: { white: [], black: [] },
        inCheck: false,
        isGameOver: false,
        winner: null
      };
    } else {
      const sudoku = generateSudokuPuzzle('medium');
      gameState = { 
        puzzle: sudoku.puzzle, 
        solution: sudoku.solution,
        userInput: sudoku.puzzle.map(row => [...row]),
        isCompleted: false,
        errors: [],
        hints: 3,
        startTime: Date.now()
      };
    }

    const [result] = await connection.execute(
      `INSERT INTO games (player1_id, game_type, game_mode, game_state, game_status, created_at) 
       VALUES (?, ?, 'bot', ?, 'playing', NOW())`,
      [userId, gameType, JSON.stringify(gameState)]
    );

    await connection.commit();

    res.json({
      success: true,
      gameId: result.insertId,
      gameState: gameState,
      gameType: gameType
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating game:', error);
    res.status(500).json({ success: false, error: 'Failed to create game' });
  } finally {
    connection.release();
  }
});

// Make move - bot only games
router.post('/:gameId/move', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { gameId } = req.params;
    const { moveData } = req.body;
    const userId = req.user.id;

    // Get game
    const [game] = await connection.execute(
      'SELECT * FROM games WHERE id = ? AND game_status = "playing" AND player1_id = ?',
      [gameId, userId]
    );

    if (game.length === 0) {
      return res.status(404).json({ success: false, error: 'Game not found or not yours' });
    }

    const gameData = game[0];
    
    // Parse current game state
    const currentGameState = JSON.parse(gameData.game_state);
    
    // Save move to history
    const [moveResult] = await connection.execute(
      `INSERT INTO game_moves (game_id, player_id, move_data, move_number, created_at)
       VALUES (?, ?, ?, 
       (SELECT COALESCE(MAX(move_number), 0) + 1 FROM game_moves m WHERE m.game_id = ?),
       NOW())`,
      [gameId, userId, JSON.stringify(moveData), gameId]
    );

    // Update game state based on game type
    let newGameState = { ...currentGameState };
    
    if (gameData.game_type === 'chess') {
      // Apply chess move
      const { from, to, piece, captured } = moveData;
      
      // Update board
      if (moveData.board) {
        newGameState.board = moveData.board;
      }
      
      // Add to move history
      if (!newGameState.moveHistory) newGameState.moveHistory = [];
      newGameState.moveHistory.push({
        from,
        to,
        piece,
        captured,
        timestamp: Date.now()
      });
      
      // Handle captured pieces
      if (captured && !newGameState.capturedPieces) {
        newGameState.capturedPieces = { white: [], black: [] };
      }
      if (captured) {
        const isWhitePiece = captured.charCodeAt(0) >= 65 && captured.charCodeAt(0) <= 90;
        if (isWhitePiece) {
          newGameState.capturedPieces.black.push(captured);
        } else {
          newGameState.capturedPieces.white.push(captured);
        }
      }
      
      // Switch players
      newGameState.currentPlayer = newGameState.currentPlayer === 'white' ? 'black' : 'white';
      
    } else if (gameData.game_type === 'sudoku') {
      // Apply sudoku move
      const { row, col, value } = moveData;
      
      if (!newGameState.userInput) {
        newGameState.userInput = newGameState.puzzle.map(r => [...r]);
      }
      
      // Update the cell
      newGameState.userInput[row][col] = value;
      
      // Check for errors
      if (!newGameState.errors) newGameState.errors = [];
      
      // Simple validation - check if value conflicts with solution
      if (value !== 0 && newGameState.solution && newGameState.solution[row][col] !== value) {
        const errorKey = `${row}-${col}`;
        if (!newGameState.errors.includes(errorKey)) {
          newGameState.errors.push(errorKey);
        }
      } else {
        // Remove error if corrected
        const errorKey = `${row}-${col}`;
        newGameState.errors = newGameState.errors.filter(e => e !== errorKey);
      }
    }

    // Check for game end
    const gameEndCheck = checkGameEnd(newGameState, gameData.game_type);
    
    let gameStatus = 'playing';
    let winnerId = null;
    let gameResult = null;

    if (gameEndCheck.isEnd) {
      gameStatus = 'finished';
      gameResult = gameEndCheck.result;
      newGameState.isGameOver = true;
      newGameState.winner = gameEndCheck.result;
      
      if (gameEndCheck.result === 'player1' || gameEndCheck.result === 'win') {
        winnerId = gameData.player1_id;
        if (gameData.game_type === 'sudoku') {
          newGameState.isCompleted = true;
        }
      }
      
      // Update game as finished
      await connection.execute(
        'UPDATE games SET game_state = ?, game_status = ?, winner_id = ?, game_result = ?, finished_at = NOW() WHERE id = ?',
        [JSON.stringify(newGameState), gameStatus, winnerId, gameResult, gameId]
      );

      // Update player stats
      await updateGameStats(connection, gameData, gameEndCheck, userId);
      
    } else {
      // Game continues
      await connection.execute(
        'UPDATE games SET game_state = ?, updated_at = NOW() WHERE id = ?',
        [JSON.stringify(newGameState), gameId]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      gameState: newGameState,
      gameEnded: gameEndCheck,
      moveId: moveResult.insertId
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error making move:', error);
    res.status(500).json({ success: false, error: 'Failed to make move' });
  } finally {
    connection.release();
  }
});

// Get user stats
router.get('/stats', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.id;

    // Ensure stats exist
    await ensureStatsExist(userId, connection);

    const [rows] = await connection.execute(
      `SELECT 
        chess_wins,
        chess_losses, 
        chess_draws,
        chess_total_games,
        sudoku_wins,
        sudoku_losses,
        sudoku_total_games,
        total_points,
        rating,
        highest_rating,
        (chess_wins + sudoku_wins) as total_wins,
        (chess_total_games + sudoku_total_games) as total_games_played,
        CASE 
          WHEN (chess_total_games + sudoku_total_games) > 0 
          THEN ROUND(((chess_wins + sudoku_wins) * 100.0 / (chess_total_games + sudoku_total_games)), 2)
          ELSE 0 
        END as win_percentage
       FROM game_stats WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Stats not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  } finally {
    connection.release();
  }
});

// Get leaderboard - PERBAIKAN: Hanya user yang pernah bermain
router.get('/leaderboard/:gameType?', async (req, res) => {
  try {
    const { gameType } = req.params;
    
    let query = `
      SELECT 
        u.id,
        u.username, 
        u.avatar, 
        COALESCE(gs.total_points, 0) as total_points,
        COALESCE(gs.rating, 1200) as rating, 
        COALESCE(gs.highest_rating, 1200) as highest_rating
    `;

    if (gameType === 'chess') {
      query += `, 
        COALESCE(gs.chess_wins, 0) as wins, 
        COALESCE(gs.chess_losses, 0) as losses, 
        COALESCE(gs.chess_draws, 0) as draws, 
        COALESCE(gs.chess_total_games, 0) as total_games
      `;
    } else if (gameType === 'sudoku') {
      query += `, 
        COALESCE(gs.sudoku_wins, 0) as wins, 
        COALESCE(gs.sudoku_losses, 0) as losses, 
        0 as draws, 
        COALESCE(gs.sudoku_total_games, 0) as total_games
      `;
    } else {
      query += `, 
        COALESCE(gs.chess_wins + gs.sudoku_wins, 0) as wins, 
        COALESCE(gs.chess_losses + gs.sudoku_losses, 0) as losses, 
        COALESCE(gs.chess_draws, 0) as draws, 
        COALESCE(gs.chess_total_games + gs.sudoku_total_games, 0) as total_games
      `;
    }

    // PERBAIKAN: Filter hanya user yang pernah bermain game dan memiliki poin > 0
    query += `
       FROM users u
       INNER JOIN game_stats gs ON gs.user_id = u.id
       WHERE (gs.chess_total_games > 0 OR gs.sudoku_total_games > 0) 
       AND gs.total_points > 0
       AND u.user_type != 'bot'
    `;

    // Filter berdasarkan game type jika diperlukan
    if (gameType === 'chess') {
      query += ' AND gs.chess_total_games > 0';
    } else if (gameType === 'sudoku') {
      query += ' AND gs.sudoku_total_games > 0';
    }

    query += `
       ORDER BY gs.total_points DESC, gs.rating DESC, gs.highest_rating DESC
       LIMIT 50
    `;

    const [rows] = await pool.execute(query);

    // Calculate win percentage and add rank
    const leaderboard = rows.map((player, index) => ({
      ...player,
      rank: index + 1,
      win_percentage: player.total_games > 0 ? 
        Math.round((player.wins / player.total_games) * 100 * 100) / 100 : 0
    }));

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// Get specific game details
router.get('/:gameId', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.id;

    const [game] = await pool.execute(
      `SELECT g.*, 
       u1.username as player1_name, u1.avatar as player1_avatar
       FROM games g
       LEFT JOIN users u1 ON g.player1_id = u1.id
       WHERE g.id = ? AND g.player1_id = ?`,
      [gameId, userId]
    );

    if (game.length === 0) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const gameData = game[0];
    gameData.game_state = JSON.parse(gameData.game_state);

    res.json({ success: true, data: gameData });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch game' });
  }
});

// Get game history
router.get('/:gameId/history', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this game
    const [game] = await pool.execute(
      'SELECT id FROM games WHERE id = ? AND player1_id = ?',
      [gameId, userId]
    );

    if (game.length === 0) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const [moves] = await pool.execute(
      `SELECT gm.*, u.username 
       FROM game_moves gm
       LEFT JOIN users u ON gm.player_id = u.id
       WHERE gm.game_id = ? 
       ORDER BY gm.move_number ASC`,
      [gameId]
    );

    const parsedMoves = moves.map(move => ({
      ...move,
      move_data: JSON.parse(move.move_data)
    }));

    res.json({ success: true, data: parsedMoves });
  } catch (error) {
    console.error('Error fetching game history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch game history' });
  }
});

// Get user's active games
router.get('/user/active', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [games] = await pool.execute(
      `SELECT g.*, 
       u1.username as player1_name, u1.avatar as player1_avatar
       FROM games g
       LEFT JOIN users u1 ON g.player1_id = u1.id
       WHERE g.player1_id = ? 
       AND g.game_status = 'playing'
       ORDER BY g.updated_at DESC
       LIMIT 10`,
      [userId]
    );

    const processedGames = games.map(game => ({
      ...game,
      game_state: JSON.parse(game.game_state)
    }));

    res.json({ success: true, data: processedGames });
  } catch (error) {
    console.error('Error fetching active games:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch active games' });
  }
});

// Get user's game history
router.get('/user/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, gameType } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'g.player1_id = ? AND g.game_status = "finished"';
    let queryParams = [userId];
    
    if (gameType && ['chess', 'sudoku'].includes(gameType)) {
      whereClause += ' AND g.game_type = ?';
      queryParams.push(gameType);
    }
    
    const [games] = await pool.execute(
      `SELECT g.*, 
       u1.username as player1_name, u1.avatar as player1_avatar,
       CASE 
         WHEN g.winner_id = ? THEN 'win'
         WHEN g.winner_id IS NULL THEN 'draw' 
         ELSE 'loss'
       END as user_result
       FROM games g
       LEFT JOIN users u1 ON g.player1_id = u1.id
       WHERE ${whereClause}
       ORDER BY g.finished_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, userId, parseInt(limit), offset]
    );

    res.json({ success: true, data: games });
  } catch (error) {
    console.error('Error fetching game history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch game history' });
  }
});

// Resign from game
router.post('/:gameId/resign', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { gameId } = req.params;
    const userId = req.user.id;

    const [game] = await connection.execute(
      'SELECT * FROM games WHERE id = ? AND game_status = "playing" AND player1_id = ?',
      [gameId, userId]
    );

    if (game.length === 0) {
      return res.status(404).json({ success: false, error: 'Game not found or already finished' });
    }

    const gameData = game[0];

    // Update game as loss for player
    await connection.execute(
      'UPDATE games SET game_status = "finished", game_result = "loss", finished_at = NOW() WHERE id = ?',
      [gameId]
    );

    // Update stats
    const gameEndResult = { isEnd: true, result: 'loss', winnerId: null };
    await updateGameStats(connection, gameData, gameEndResult, userId);

    await connection.commit();

    res.json({ success: true, message: 'Game resigned successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error resigning game:', error);
    res.status(500).json({ success: false, error: 'Failed to resign game' });
  } finally {
    connection.release();
  }
});

// Helper functions
const ensureStatsExist = async (userId, connection = pool) => {
  try {
    const [existing] = await connection.execute(
      'SELECT id FROM game_stats WHERE user_id = ?',
      [userId]
    );

    if (existing.length === 0) {
      await connection.execute(
        `INSERT INTO game_stats (
          user_id, chess_wins, chess_losses, chess_draws, chess_total_games,
          sudoku_wins, sudoku_losses, sudoku_total_games, 
          total_points, rating, highest_rating, created_at
        ) VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 1200, 1200, NOW())`,
        [userId]
      );
    }
  } catch (error) {
    console.error('Error ensuring stats exist:', error);
    throw error;
  }
};

const checkGameEnd = (gameState, gameType) => {
  if (gameType === 'chess') {
    // Check for basic win conditions - king capture
    let whiteKing = false, blackKing = false;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (gameState.board[row][col] === 'K') whiteKing = true;
        if (gameState.board[row][col] === 'k') blackKing = true;
      }
    }
    
    if (!blackKing) return { isEnd: true, result: 'player1', winnerId: null };
    if (!whiteKing) return { isEnd: true, result: 'loss', winnerId: null };
    
    // Could add more sophisticated chess ending logic here
    
  } else if (gameType === 'sudoku') {
    // Check if sudoku puzzle is solved correctly
    const puzzle = gameState.userInput || gameState.puzzle;
    const solution = gameState.solution;
    
    if (!solution) return { isEnd: false };
    
    // Check if all cells are filled and match solution
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (puzzle[row][col] === 0 || puzzle[row][col] !== solution[row][col]) {
          return { isEnd: false };
        }
      }
    }
    
    return { isEnd: true, result: 'win', winnerId: null };
  }
  
  return { isEnd: false };
};

// PERBAIKAN: Update stats dengan lebih akurat
const updateGameStats = async (connection, gameData, gameResult, playerId) => {
  try {
    const isWin = gameResult.result === 'player1' || gameResult.result === 'win';
    const isLoss = gameResult.result === 'loss';
    const isDraw = gameResult.result === 'draw';
    
    // Calculate points for bot games
    let pointsChange = 0;
    if (isWin) {
      pointsChange = gameData.game_type === 'chess' ? 25 : 30;
    } else if (isDraw) {
      pointsChange = 5;
    } else {
      pointsChange = -10;
    }

    // Rating change
    let ratingChange = 0;
    if (isWin) {
      ratingChange = 15;
    } else if (isDraw) {
      ratingChange = 5;
    } else {
      ratingChange = -10;
    }

    if (gameData.game_type === 'chess') {
      await connection.execute(
        `UPDATE game_stats SET 
         chess_wins = chess_wins + ?, 
         chess_losses = chess_losses + ?, 
         chess_draws = chess_draws + ?, 
         chess_total_games = chess_total_games + 1,
         total_points = GREATEST(0, total_points + ?),
         rating = GREATEST(800, LEAST(2800, rating + ?)),
         highest_rating = GREATEST(highest_rating, GREATEST(800, LEAST(2800, rating + ?))),
         updated_at = NOW()
         WHERE user_id = ?`,
        [isWin ? 1 : 0, isLoss ? 1 : 0, isDraw ? 1 : 0, 
         pointsChange, ratingChange, ratingChange, playerId]
      );
    } else if (gameData.game_type === 'sudoku') {
      await connection.execute(
        `UPDATE game_stats SET 
         sudoku_wins = sudoku_wins + ?, 
         sudoku_losses = sudoku_losses + ?, 
         sudoku_total_games = sudoku_total_games + 1,
         total_points = GREATEST(0, total_points + ?),
         rating = GREATEST(800, LEAST(2800, rating + ?)),
         highest_rating = GREATEST(highest_rating, GREATEST(800, LEAST(2800, rating + ?))),
         updated_at = NOW()
         WHERE user_id = ?`,
        [isWin ? 1 : 0, isLoss ? 1 : 0, pointsChange, ratingChange, ratingChange, playerId]
      );
    }

  } catch (error) {
    console.error('Error updating game stats:', error);
    throw error;
  }
};

export default router;