const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'friends_chat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

const initDatabase = async () => {
  try {
    // Create connection pool
    pool = mysql.createPool(dbConfig);
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    
    // Create database if not exists
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.query(`USE ${dbConfig.database}`);
    
    // Create tables
    await createTables(connection);
    
    // Insert admin user if not exists
    await createAdminUser(connection);
    
    connection.release();
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

const createTables = async (connection) => {
  // Users table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Posts table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS posts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Likes table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS likes (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      post_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      UNIQUE KEY unique_like (user_id, post_id)
    )
  `);

  // Comments table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      post_id INT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);

  // Friendships table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS friendships (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      friend_id INT NOT NULL,
      status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_friendship (user_id, friend_id)
    )
  `);

  // Messages table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      message TEXT NOT NULL,
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Database tables created successfully');
};

const createAdminUser = async (connection) => {
  const bcrypt = require('bcryptjs');
  
  // Check if admin exists
  const [adminExists] = await connection.execute('SELECT * FROM users WHERE email = ?', ['admin@friendschat.com']);
  
  if (adminExists.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.execute(
      'INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
      ['Admin User', 'admin', 'admin@friendschat.com', hashedPassword, 'admin']
    );
    console.log('Admin user created: admin@friendschat.com / admin123');
  }

  // Create demo users
  const demoUsers = [
    { name: 'Alice Johnson', username: 'alice_j', email: 'alice@demo.com' },
    { name: 'Bob Smith', username: 'bob_dev', email: 'bob@demo.com' },
    { name: 'Carol Davis', username: 'carol_art', email: 'carol@demo.com' }
  ];

  for (const user of demoUsers) {
    const [userExists] = await connection.execute('SELECT * FROM users WHERE email = ?', [user.email]);
    if (userExists.length === 0) {
      const hashedPassword = await bcrypt.hash('demo123', 10);
      await connection.execute(
        'INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [user.name, user.username, user.email, hashedPassword, 'user']
      );
    }
  }
};

const query = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

module.exports = {
  initDatabase,
  query
};