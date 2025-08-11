import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown, Users, Target, Bot, RotateCcw, Gamepad2 } from 'lucide-react';

const Games = () => {
  const [activeView, setActiveView] = useState('menu'); // 'menu', 'chess', 'sudoku', 'leaderboard'
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState('all');
  
  // Chess state
  const [chessBoard, setChessBoard] = useState(null);
  const [chessGameId, setChessGameId] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [currentTurn, setCurrentTurn] = useState('player');
  const [chessGameStatus, setChessGameStatus] = useState('waiting');
  const [isMyTurn, setIsMyTurn] = useState(true);
  
  // Sudoku state
  const [sudokuPuzzle, setSudokuPuzzle] = useState(null);
  const [sudokuSolution, setSudokuSolution] = useState(null);
  const [sudokuGameId, setSudokuGameId] = useState(null);
  const [sudokuUserInput, setSudokuUserInput] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [sudokuGameStatus, setSudokuGameStatus] = useState('waiting');
  const [timer, setTimer] = useState(0);
  
  // Shared state
  const [stats, setStats] = useState({
    chess_wins: 0,
    chess_losses: 0,
    chess_draws: 0,
    chess_total_games: 0,
    sudoku_wins: 0,
    sudoku_losses: 0,
    sudoku_total_games: 0,
    rating: 1200,
    total_points: 0,
    total_games_played: 0,
    total_wins: 0,
    win_percentage: 0
  });
  const [gameMessage, setGameMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Set to true for demo mode (no backend required)
  const [demoMode] = useState(true);

  useEffect(() => {
    if (demoMode) {
      // Set demo user
      setCurrentUser({ id: 1, username: 'demo_player' });
    } else {
      const token = localStorage.getItem('token');
      if (token) {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        setCurrentUser(userInfo);
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    let interval;
    if (sudokuGameStatus === 'playing') {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sudokuGameStatus]);

  useEffect(() => {
    if (activeView === 'leaderboard') {
      fetchLeaderboard(activeLeaderboardTab);
    }
  }, [activeView, activeLeaderboardTab]);

  const fetchStats = async () => {
    if (demoMode) {
      // Get current demo stats from localStorage or use defaults
      const savedStats = localStorage.getItem('demoGameStats');
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      } else {
        setStats({
          chess_wins: 5,
          chess_losses: 3,
          chess_draws: 1,
          chess_total_games: 9,
          sudoku_wins: 8,
          sudoku_losses: 2,
          sudoku_total_games: 10,
          rating: 1350,
          total_points: 450,
          total_games_played: 19,
          total_wins: 13,
          win_percentage: 68.42
        });
      }
    } else {
      // Real API call would go here
      try {
        const response = await fetch('/api/games/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }
  };

  // PERBAIKAN: Fetch leaderboard dengan data realistis
  const fetchLeaderboard = async (type) => {
    if (demoMode) {
      // Gunakan stats user yang ter-update untuk leaderboard
      const currentStats = JSON.parse(localStorage.getItem('demoGameStats') || 'null') || stats;
      
      const demoUsers = [
        { id: 2, username: 'alex_chess', avatar: null, wins: 45, total_games: 60, losses: 12, total_points: 2500, rating: 2100, win_percentage: 75 },
        { id: 3, username: 'sarah_gamer', avatar: null, wins: 38, total_games: 50, losses: 10, total_points: 2200, rating: 1950, win_percentage: 76 },
        { id: 4, username: 'mike_sudoku', avatar: null, wins: 42, total_games: 55, losses: 11, total_points: 2000, rating: 1800, win_percentage: 76.36 },
        { id: 5, username: 'lisa_player', avatar: null, wins: 30, total_games: 45, losses: 12, total_points: 1800, rating: 1650, win_percentage: 66.67 },
        { id: 6, username: 'john_gamer', avatar: null, wins: 25, total_games: 40, losses: 13, total_points: 1200, rating: 1500, win_percentage: 62.5 },
        { id: 7, username: 'emma_smart', avatar: null, wins: 20, total_games: 30, losses: 8, total_points: 1000, rating: 1400, win_percentage: 66.67 },
        { id: 8, username: 'david_chess', avatar: null, wins: 18, total_games: 28, losses: 9, total_points: 800, rating: 1300, win_percentage: 64.29 },
        // User saat ini dengan stats yang ter-update
        { 
          id: 1, 
          username: 'demo_player', 
          avatar: null, 
          wins: currentStats.total_wins || (currentStats.chess_wins + currentStats.sudoku_wins), 
          total_games: currentStats.total_games_played || (currentStats.chess_total_games + currentStats.sudoku_total_games), 
          losses: (currentStats.chess_losses + currentStats.sudoku_losses), 
          total_points: currentStats.total_points, 
          rating: currentStats.rating, 
          win_percentage: currentStats.win_percentage 
        }
      ];
      
      // Sort berdasarkan total points
      const sortedUsers = demoUsers.sort((a, b) => b.total_points - a.total_points);
      
      // Add rank
      const leaderboardData = sortedUsers.map((user, index) => ({ ...user, rank: index + 1 }));
      
      setLeaderboard(leaderboardData);
    } else {
      // Real API call
      try {
        const response = await fetch(`/api/games/leaderboard/${type === 'all' ? '' : type}`);
        const data = await response.json();
        if (data.success) {
          setLeaderboard(data.data);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    }
  };

  // PERBAIKAN: Update stats dan simpan ke localStorage
  const updateStats = (gameType, result) => {
    setStats(prevStats => {
      const newStats = { ...prevStats };
      
      if (gameType === 'chess') {
        newStats.chess_total_games += 1;
        if (result === 'win') {
          newStats.chess_wins += 1;
          newStats.total_points += 25;
          newStats.rating += 15;
        } else if (result === 'loss') {
          newStats.chess_losses += 1;
          newStats.total_points = Math.max(0, newStats.total_points - 10);
          newStats.rating = Math.max(800, newStats.rating - 10);
        } else if (result === 'draw') {
          newStats.chess_draws += 1;
          newStats.total_points += 5;
          newStats.rating += 5;
        }
      } else if (gameType === 'sudoku') {
        newStats.sudoku_total_games += 1;
        if (result === 'win') {
          newStats.sudoku_wins += 1;
          newStats.total_points += 30;
          newStats.rating += 15;
        } else if (result === 'loss') {
          newStats.sudoku_losses += 1;
          newStats.total_points = Math.max(0, newStats.total_points - 10);
          newStats.rating = Math.max(800, newStats.rating - 10);
        }
      }
      
      // Update computed fields
      newStats.total_wins = newStats.chess_wins + newStats.sudoku_wins;
      newStats.total_games_played = newStats.chess_total_games + newStats.sudoku_total_games;
      newStats.win_percentage = newStats.total_games_played > 0 ? 
        Math.round((newStats.total_wins / newStats.total_games_played) * 100 * 100) / 100 : 0;
      
      // Ensure rating doesn't exceed limits
      newStats.rating = Math.min(2800, Math.max(800, newStats.rating));
      
      // Save to localStorage for demo mode
      if (demoMode) {
        localStorage.setItem('demoGameStats', JSON.stringify(newStats));
      }
      
      return newStats;
    });
  };

  // Generate a valid Sudoku puzzle
  const generateSudokuPuzzle = () => {
    // Start with a complete valid solution
    const solution = [
      [5,3,4,6,7,8,9,1,2],
      [6,7,2,1,9,5,3,4,8],
      [1,9,8,3,4,2,5,6,7],
      [8,5,9,7,6,1,4,2,3],
      [4,2,6,8,5,3,7,9,1],
      [7,1,3,9,2,4,8,5,6],
      [9,6,1,5,3,7,2,8,4],
      [2,8,7,4,1,9,6,3,5],
      [3,4,5,2,8,6,1,7,9]
    ];

    // Create puzzle by removing some numbers
    const puzzle = solution.map(row => [...row]);
    const difficulty = 40; // Number of cells to remove
    
    for (let i = 0; i < difficulty; i++) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      puzzle[row][col] = 0;
    }

    return { puzzle, solution };
  };

  // Chess functions
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

  const startChessGame = async () => {
    setIsLoading(true);
    setGameMessage('Starting chess game vs Bot...');
    
    // Always use demo mode (simulate game start)
    setTimeout(() => {
      setChessBoard(initializeChessBoard());
      setChessGameId('demo-chess-' + Date.now());
      setCurrentTurn('player');
      setChessGameStatus('playing');
      setSelectedSquare(null);
      setIsMyTurn(true);
      setGameMessage('Chess game started! Your turn (White pieces)');
      setActiveView('chess');
      setIsLoading(false);
    }, 1000);
  };

  const startSudokuGame = async () => {
    setIsLoading(true);
    setGameMessage('Generating sudoku puzzle...');
    setTimer(0);
    
    // Always use demo mode (generate puzzle locally)
    setTimeout(() => {
      try {
        const { puzzle, solution } = generateSudokuPuzzle();
        
        setSudokuPuzzle(puzzle);
        setSudokuSolution(solution);
        setSudokuUserInput(puzzle.map(row => [...row]));
        setSudokuGameId('demo-sudoku-' + Date.now());
        setSudokuGameStatus('playing');
        setSelectedCell(null);
        setGameMessage('Sudoku puzzle generated! Fill in the missing numbers.');
        setActiveView('sudoku');
        setIsLoading(false);
      } catch (error) {
        console.error('Error generating sudoku:', error);
        setGameMessage('Failed to generate sudoku puzzle. Try again.');
        setIsLoading(false);
      }
    }, 1000);
  };

  // Chess move validation and handling
  const isValidChessMove = (fromRow, fromCol, toRow, toCol, piece, targetPiece) => {
    if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
    
    if (targetPiece) {
      const isWhitePiece = piece === piece.toUpperCase();
      const isTargetWhite = targetPiece === targetPiece.toUpperCase();
      if (isWhitePiece === isTargetWhite) return false;
    }

    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    const piece_lower = piece.toLowerCase();

    switch (piece_lower) {
      case 'p':
        const isWhite = piece === 'P';
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        
        if (colDiff === 0 && !targetPiece) {
          if (toRow === fromRow + direction) return true;
          if (fromRow === startRow && toRow === fromRow + 2 * direction) return true;
        }
        if (colDiff === 1 && toRow === fromRow + direction && targetPiece) {
          return true;
        }
        return false;

      case 'r':
        return (rowDiff === 0 || colDiff === 0) && isChessPathClear(fromRow, fromCol, toRow, toCol);

      case 'n':
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

      case 'b':
        return rowDiff === colDiff && isChessPathClear(fromRow, fromCol, toRow, toCol);

      case 'q':
        return (rowDiff === 0 || colDiff === 0 || rowDiff === colDiff) && 
               isChessPathClear(fromRow, fromCol, toRow, toCol);

      case 'k':
        return rowDiff <= 1 && colDiff <= 1;

      default:
        return false;
    }
  };

  const isChessPathClear = (fromRow, fromCol, toRow, toCol) => {
    const rowDir = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colDir = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
    
    let currentRow = fromRow + rowDir;
    let currentCol = fromCol + colDir;
    
    while (currentRow !== toRow || currentCol !== toCol) {
      if (chessBoard[currentRow][currentCol] !== null) return false;
      currentRow += rowDir;
      currentCol += colDir;
    }
    
    return true;
  };

  const makeBotMove = (board) => {
    // Simple bot that makes random valid moves
    const blackPieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] && board[r][c] === board[r][c].toLowerCase()) {
          blackPieces.push([r, c]);
        }
      }
    }
    
    // Shuffle pieces for randomness
    for (let i = blackPieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [blackPieces[i], blackPieces[j]] = [blackPieces[j], blackPieces[i]];
    }
    
    for (const [pieceRow, pieceCol] of blackPieces) {
      const piece = board[pieceRow][pieceCol];
      const validMoves = [];
      
      for (let tr = 0; tr < 8; tr++) {
        for (let tc = 0; tc < 8; tc++) {
          if (isValidChessMove(pieceRow, pieceCol, tr, tc, piece, board[tr][tc])) {
            validMoves.push([tr, tc]);
          }
        }
      }
      
      if (validMoves.length > 0) {
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        const [toRow, toCol] = randomMove;
        
        const newBoard = board.map(row => [...row]);
        newBoard[toRow][toCol] = newBoard[pieceRow][pieceCol];
        newBoard[pieceRow][pieceCol] = null;
        
        return newBoard;
      }
    }
    
    return board; // No valid moves found
  };

  const handleChessSquareClick = async (row, col) => {
    if (chessGameStatus !== 'playing' || !isMyTurn || isLoading) return;

    if (!selectedSquare) {
      const piece = chessBoard[row][col];
      if (piece && piece === piece.toUpperCase()) {
        setSelectedSquare([row, col]);
      }
    } else {
      const [fromRow, fromCol] = selectedSquare;
      
      if (fromRow === row && fromCol === col) {
        setSelectedSquare(null);
        return;
      }

      const piece = chessBoard[fromRow][fromCol];
      const targetPiece = chessBoard[row][col];

      if (isValidChessMove(fromRow, fromCol, row, col, piece, targetPiece)) {
        const newBoard = [...chessBoard.map(row => [...row])];
        newBoard[row][col] = newBoard[fromRow][fromCol];
        newBoard[fromRow][fromCol] = null;

        setChessBoard(newBoard);
        setSelectedSquare(null);
        
        // Check for win condition (king captured)
        let whiteKing = false, blackKing = false;
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (newBoard[r][c] === 'K') whiteKing = true;
            if (newBoard[r][c] === 'k') blackKing = true;
          }
        }
        
        if (!blackKing) {
          setChessGameStatus('finished');
          setGameMessage('Congratulations! You won by capturing the enemy king!');
          updateStats('chess', 'win');
        } else {
          setIsMyTurn(false);
          setGameMessage('Bot is thinking...');
          
          // Bot makes a move after delay
          setTimeout(() => {
            const botBoard = makeBotMove(newBoard);
            setChessBoard(botBoard);
            
            // Check if player's king was captured
            let playerKing = false;
            for (let r = 0; r < 8; r++) {
              for (let c = 0; c < 8; c++) {
                if (botBoard[r][c] === 'K') playerKing = true;
              }
            }
            
            if (!playerKing) {
              setChessGameStatus('finished');
              setGameMessage('Game over! The bot captured your king.');
              updateStats('chess', 'loss');
            } else {
              setIsMyTurn(true);
              setGameMessage('Your turn!');
            }
          }, 1500);
        }
      } else {
        setSelectedSquare(null);
        setGameMessage('Invalid move! Try again.');
      }
    }
  };

  // Sudoku functions
  const handleSudokuCellClick = (row, col) => {
    if (sudokuGameStatus !== 'playing') return;
    
    if (sudokuPuzzle[row][col] === 0) {
      setSelectedCell([row, col]);
    }
  };

  const handleSudokuNumberInput = async (number) => {
    if (!selectedCell || sudokuGameStatus !== 'playing') return;
    
    const [row, col] = selectedCell;
    if (sudokuPuzzle[row][col] !== 0) return;

    const newInput = sudokuUserInput.map(r => [...r]);
    newInput[row][col] = number;
    setSudokuUserInput(newInput);

    // Check if puzzle is solved
    let isSolved = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (newInput[r][c] !== sudokuSolution[r][c]) {
          isSolved = false;
          break;
        }
      }
      if (!isSolved) break;
    }
    
    if (isSolved) {
      setSudokuGameStatus('finished');
      setGameMessage(`Congratulations! You solved the sudoku in ${formatTime(timer)}!`);
      updateStats('sudoku', 'win');
    }
  };

  const isValidSudokuPlacement = (row, col, num) => {
    if (!sudokuUserInput) return true;
    
    // Check row
    for (let x = 0; x < 9; x++) {
      if (x !== col && sudokuUserInput[row][x] === num) return false;
    }
    
    // Check column
    for (let x = 0; x < 9; x++) {
      if (x !== row && sudokuUserInput[x][col] === num) return false;
    }
    
    // Check 3x3 box
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const currentRow = startRow + i;
        const currentCol = startCol + j;
        if (currentRow !== row && currentCol !== col && 
            sudokuUserInput[currentRow][currentCol] === num) {
          return false;
        }
      }
    }
    
    return true;
  };

  // Helper functions
  const getPieceSymbol = (piece) => {
    const symbols = {
      'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
      'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };
    return symbols[piece] || '';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-500" size={24} />;
      case 2:
        return <Medal className="text-gray-400" size={24} />;
      case 3:
        return <Award className="text-orange-600" size={24} />;
      default:
        return <span className="text-gray-600 font-bold text-lg">{rank}</span>;
    }
  };

  const getRankBackground = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-orange-100 to-orange-200 border-orange-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getSudokuCellClass = (row, col) => {
    let classes = "w-10 h-10 border border-gray-400 flex items-center justify-center text-lg font-semibold cursor-pointer ";
    
    // Thick borders for 3x3 sections
    if (row % 3 === 0) classes += "border-t-2 border-t-black ";
    if (col % 3 === 0) classes += "border-l-2 border-l-black ";
    if (row === 8) classes += "border-b-2 border-b-black ";
    if (col === 8) classes += "border-r-2 border-r-black ";
    
    // Background colors
    if (sudokuPuzzle && sudokuPuzzle[row][col] !== 0) {
      classes += "bg-gray-200 text-gray-800 ";
    } else {
      classes += "bg-white hover:bg-blue-50 ";
      
      if (selectedCell && selectedCell[0] === row && selectedCell[1] === col) {
        classes += "bg-blue-200 ";
      }
      
      // Check if number is valid
      if (sudokuUserInput && sudokuUserInput[row][col] !== 0) {
        if (isValidSudokuPlacement(row, col, sudokuUserInput[row][col])) {
          classes += "text-blue-600 ";
        } else {
          classes += "text-red-600 bg-red-50 ";
        }
      }
    }
    
    return classes;
  };

  const renderGameMenu = () => (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 flex items-center justify-center">
          <Gamepad2 className="mr-3 text-purple-600" size={48} />
          Game Center
        </h1>
        
        <div className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-3 rounded mb-6">
          <Bot className="inline mr-2" size={20} />
          Play against AI bots and improve your skills!
        </div>
        
        {gameMessage && (
          <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded mb-6">
            {gameMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Chess Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">♔</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Chess vs Bot</h3>
            <p className="text-gray-600 mb-4">Challenge the AI in strategic chess</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Wins:</span>
                <span className="font-semibold text-green-600">{stats.chess_wins}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Games:</span>
                <span className="font-semibold">{stats.chess_total_games}</span>
              </div>
            </div>
            <button
              onClick={startChessGame}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
            >
              <Bot className="mr-2" size={16} />
              {isLoading ? 'Starting...' : 'Play vs Bot'}
            </button>
          </div>

          {/* Sudoku Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🧩</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Sudoku</h3>
            <p className="text-gray-600 mb-4">Solve number puzzles and train your brain</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Solved:</span>
                <span className="font-semibold text-green-600">{stats.sudoku_wins}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Games:</span>
                <span className="font-semibold">{stats.sudoku_total_games}</span>
              </div>
            </div>
            <button
              onClick={startSudokuGame}
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
            >
              <Target className="mr-2" size={16} />
              {isLoading ? 'Generating...' : 'New Puzzle'}
            </button>
          </div>

          {/* Leaderboard Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Leaderboard</h3>
            <p className="text-gray-600 mb-4">See how you rank among players</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Points:</span>
                <span className="font-semibold text-purple-600">{stats.total_points}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Rating:</span>
                <span className="font-semibold text-blue-600">{stats.rating}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveView('leaderboard')}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
            >
              View Rankings
            </button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-xl font-bold mb-4">Your Overall Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total_points}</div>
              <div className="text-blue-100">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.rating}</div>
              <div className="text-blue-100">Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total_wins || (stats.chess_wins + stats.sudoku_wins)}</div>
              <div className="text-blue-100">Total Wins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total_games_played || (stats.chess_total_games + stats.sudoku_total_games)}</div>
              <div className="text-blue-100">Games Played</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChessGame = () => (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setActiveView('menu')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Games
          </button>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <Bot className="mr-2" size={32} />
            Chess vs Bot
          </h1>
          <button
            onClick={() => setActiveView('leaderboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Leaderboard
          </button>
        </div>

        {gameMessage && (
          <div className="text-center text-lg font-medium text-blue-600 mb-4 bg-blue-50 p-3 rounded-lg">
            {gameMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-lg font-semibold flex items-center">
                  <span className="mr-2">You (White)</span>
                  <span className="text-2xl">♔</span>
                </div>
                <div className="text-lg font-semibold flex items-center">
                  <span className="text-2xl">♚</span>
                  <span className="ml-2">Bot (Black)</span>
                </div>
              </div>
              
              <div className="text-center mb-4">
                <div className={`text-sm font-medium px-3 py-1 rounded-full inline-block ${
                  isMyTurn ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {isMyTurn ? 'Your Turn' : 'Bot is thinking...'}
                </div>
              </div>
              
              <div className="flex justify-center">
                <div className="inline-block border-2 border-gray-800">
                  {chessBoard && chessBoard.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex">
                      {row.map((piece, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={`
                            w-12 h-12 flex items-center justify-center text-2xl cursor-pointer select-none transition-all
                            ${(rowIndex + colIndex) % 2 === 0 ? 'bg-amber-100' : 'bg-amber-800'}
                            ${selectedSquare && selectedSquare[0] === rowIndex && selectedSquare[1] === colIndex 
                              ? 'ring-4 ring-blue-500' : ''}
                            ${chessGameStatus === 'playing' && isMyTurn ? 'hover:opacity-80' : ''}
                          `}
                          onClick={() => handleChessSquareClick(rowIndex, colIndex)}
                        >
                          {getPieceSymbol(piece)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              {chessGameStatus === 'finished' && (
                <div className="text-center mt-4">
                  <button
                    onClick={startChessGame}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Chess Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Points:</span>
                <span className="font-bold text-purple-600">{stats.total_points}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rating:</span>
                <span className="font-bold text-blue-600">{stats.rating}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Wins:</span>
                <span className="font-semibold text-green-600">{stats.chess_wins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Losses:</span>
                <span className="font-semibold text-red-600">{stats.chess_losses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Draws:</span>
                <span className="font-semibold text-gray-600">{stats.chess_draws}</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-semibold text-gray-700 mb-2">How to Play:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Click a white piece to select it</li>
                <li>• Click a highlighted square to move</li>
                <li>• Capture the enemy king to win</li>
                <li>• You play as white pieces</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSudokuGame = () => (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setActiveView('menu')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Games
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Sudoku</h1>
          <button
            onClick={() => setActiveView('leaderboard')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Leaderboard
          </button>
        </div>

        {gameMessage && (
          <div className="text-center text-lg font-medium text-blue-600 mb-4 bg-blue-50 p-3 rounded-lg">
            {gameMessage}
          </div>
        )}

        {sudokuGameStatus === 'playing' && (
          <div className="text-center text-lg font-medium text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg">
            Time: {formatTime(timer)}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-center mb-6">
                <div className="inline-block border-2 border-black">
                  {sudokuUserInput && sudokuUserInput.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex">
                      {row.map((cell, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={getSudokuCellClass(rowIndex, colIndex)}
                          onClick={() => handleSudokuCellClick(rowIndex, colIndex)}
                        >
                          {cell === 0 ? '' : cell}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {selectedCell && sudokuGameStatus === 'playing' && (
                <div className="flex justify-center">
                  <div className="grid grid-cols-5 gap-2 max-w-xs">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button
                        key={num}
                        onClick={() => handleSudokuNumberInput(num)}
                        className="w-12 h-12 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => handleSudokuNumberInput(0)}
                      className="w-12 h-12 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition-colors"
                      title="Clear cell"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              )}
              
              {sudokuGameStatus === 'finished' && (
                <div className="text-center mt-4">
                  <button
                    onClick={startSudokuGame}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    New Puzzle
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sudoku Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Points:</span>
                <span className="font-bold text-purple-600">{stats.total_points}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rating:</span>
                <span className="font-bold text-blue-600">{stats.rating}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Solved:</span>
                <span className="font-semibold text-green-600">{stats.sudoku_wins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Attempts:</span>
                <span className="font-semibold text-gray-600">{stats.sudoku_total_games}</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-semibold text-gray-700 mb-2">How to Play:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Fill empty cells with numbers 1-9</li>
                <li>• Each row must contain 1-9</li>
                <li>• Each column must contain 1-9</li>
                <li>• Each 3×3 box must contain 1-9</li>
                <li>• Red numbers indicate conflicts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLeaderboard = () => (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => setActiveView('menu')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Games
          </button>
          <h1 className="text-4xl font-bold text-gray-800">
            <Trophy className="inline mr-3 text-yellow-500" size={40} />
            Leaderboard
          </h1>
          <div></div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => setActiveLeaderboardTab('all')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeLeaderboardTab === 'all'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Trophy size={20} />
            <span>Overall</span>
          </button>
          <button
            onClick={() => setActiveLeaderboardTab('chess')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeLeaderboardTab === 'chess'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Crown size={20} />
            <span>Chess</span>
          </button>
          <button
            onClick={() => setActiveLeaderboardTab('sudoku')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeLeaderboardTab === 'sudoku'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Target size={20} />
            <span>Sudoku</span>
          </button>
        </div>

        {/* Current User Stats */}
        {currentUser && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 mb-8 text-white">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Users className="mr-2" size={24} />
              Your Performance - {currentUser.username}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total_points}</div>
                <div className="text-blue-100">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.rating}</div>
                <div className="text-blue-100">Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {activeLeaderboardTab === 'chess' ? stats.chess_wins : 
                   activeLeaderboardTab === 'sudoku' ? stats.sudoku_wins :
                   (stats.total_wins || stats.chess_wins + stats.sudoku_wins)}
                </div>
                <div className="text-blue-100">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {activeLeaderboardTab === 'chess' ? stats.chess_total_games : 
                   activeLeaderboardTab === 'sudoku' ? stats.sudoku_total_games :
                   (stats.total_games_played || stats.chess_total_games + stats.sudoku_total_games)}
                </div>
                <div className="text-blue-100">Total Games</div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Users className="mr-2" size={24} />
              Top Players
              <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                {leaderboard.length} players
              </span>
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {leaderboard.map((player) => (
              <div
                key={player.id}
                className={`p-6 transition-all hover:shadow-md ${getRankBackground(player.rank)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12">
                      {getRankIcon(player.rank)}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {player.avatar ? (
                        <img 
                          src={player.avatar} 
                          alt={player.username}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {player.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg flex items-center">
                          {player.username}
                          {currentUser && player.id === currentUser.id && (
                            <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">You</span>
                          )}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Rating: {player.rating}</span>
                          <span>•</span>
                          <span>Win Rate: {player.win_percentage?.toFixed(1) || 0}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">
                      {player.total_points?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-gray-500">points</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {player.wins}W • {player.total_games}G
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderActiveView = () => {
    switch (activeView) {
      case 'chess':
        return renderChessGame();
      case 'sudoku':
        return renderSudokuGame();
      case 'leaderboard':
        return renderLeaderboard();
      default:
        return renderGameMenu();
    }
  };

  return renderActiveView();
};

export default Games;