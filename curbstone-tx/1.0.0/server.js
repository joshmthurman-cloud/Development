const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LOGS_PATH = process.env.LOGS_PATH || path.join(__dirname, 'LOGS');
const USERS_FILE = path.join(__dirname, 'users.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-in-production';

// Middleware
app.use(cors({
  origin: true, // Allow all origins in dev, configure properly in production
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId', // Give it a specific name
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, // 10 minutes
    sameSite: 'lax'
  }
}));

// Middleware to check session and inactivity timeout
function checkSession(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Check inactivity timeout (10 minutes)
  const now = Date.now();
  if (req.session.lastActivity && (now - req.session.lastActivity) > 10 * 60 * 1000) {
    req.session.destroy();
    return res.status(401).json({ error: 'Session expired' });
  }
  
  // Update last activity (initialize if not set)
  req.session.lastActivity = now;
  next();
}

// Middleware to check admin role
function checkAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

// Initialize users file if it doesn't exist
async function initializeUsers() {
  try {
    await fs.access(USERS_FILE);
    // File exists, check if ADMIN user exists
    const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    const adminExists = users.some(u => u.username === 'ADMIN');
    if (!adminExists) {
      // Create ADMIN user
      const adminHash = await bcrypt.hash('p0okmju7yg', 10);
      users.push({
        id: 'admin-' + Date.now(),
        username: 'ADMIN',
        passwordHash: adminHash,
        allowedTransactionTypes: ['Auth', 'Capture', 'Sale', 'ReferentialSale', 'Reversal', 'Return', 'Settle', 'Ticket', 'Void'],
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    }
  } catch (error) {
    // File doesn't exist, create it with ADMIN user
    const adminHash = await bcrypt.hash('p0okmju7yg', 10);
    const users = [{
      id: 'admin-' + Date.now(),
      username: 'ADMIN',
      passwordHash: adminHash,
      allowedTransactionTypes: ['Auth', 'Capture', 'Sale', 'ReferentialSale', 'Reversal', 'Return', 'Settle', 'Ticket'],
      role: 'admin',
      createdAt: new Date().toISOString()
    }];
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  }
}

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    // Case-insensitive username comparison
    const usernameLower = username.toLowerCase().trim();
    const user = users.find(u => u.username.toLowerCase() === usernameLower);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    req.session.user = {
      id: user.id,
      username: user.username, // Store original case
      role: user.role,
      allowedTransactionTypes: user.allowedTransactionTypes
    };
    req.session.lastActivity = Date.now();
    
    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          allowedTransactionTypes: user.allowedTransactionTypes
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.get('/api/auth/me', checkSession, (req, res) => {
  // Double-check session is valid
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({
    user: req.session.user
  });
});

// User management endpoints (ADMIN only)
app.get('/api/users', checkSession, checkAdmin, async (req, res) => {
  try {
    const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    // Return users without password hashes
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      allowedTransactionTypes: u.allowedTransactionTypes,
      createdAt: u.createdAt
    }));
    res.json({ users: safeUsers });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', checkSession, checkAdmin, async (req, res) => {
  try {
    const { username, password, allowedTransactionTypes, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Normalize username (trim and store as-is, but compare case-insensitively)
    const usernameNormalized = username.trim();
    if (!usernameNormalized) {
      return res.status(400).json({ error: 'Username cannot be empty' });
    }
    
    const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    
    // Check if username already exists (case-insensitive)
    const usernameLower = usernameNormalized.toLowerCase();
    if (users.some(u => u.username.toLowerCase() === usernameLower)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Validate transaction types
    const validTypes = ['Auth', 'Capture', 'Sale', 'ReferentialSale', 'Reversal', 'Return', 'Settle', 'Ticket', 'Void'];
    const allowedTypes = Array.isArray(allowedTransactionTypes) 
      ? allowedTransactionTypes.filter(t => validTypes.includes(t))
      : validTypes; // Default to all if not specified
    
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: 'user-' + Date.now(),
      username: usernameNormalized, // Store with original case
      passwordHash,
      allowedTransactionTypes: allowedTypes,
      role: role || 'user',
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    
    res.json({
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        allowedTransactionTypes: newUser.allowedTransactionTypes,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id', checkSession, async (req, res) => {
  try {
    const { id } = req.params;
    const { password, allowedTransactionTypes, role } = req.body;
    const currentUser = req.session.user;
    
    console.log('Update user request:', { id, allowedTransactionTypes, role, currentUser: currentUser.username });
    
    const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Users can only change their own password, unless they're admin
    const isAdmin = currentUser.role === 'admin';
    const isOwnAccount = currentUser.id === id;
    
    if (!isAdmin && !isOwnAccount) {
      return res.status(403).json({ error: 'Forbidden: Can only modify own account' });
    }
    
    // Update password if provided
    if (password) {
      if (!isAdmin && !isOwnAccount) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      users[userIndex].passwordHash = await bcrypt.hash(password, 10);
    }
    
    // Update permissions (admin only)
    if (isAdmin && allowedTransactionTypes !== undefined) {
      const validTypes = ['Auth', 'Capture', 'Sale', 'ReferentialSale', 'Reversal', 'Return', 'Settle', 'Ticket', 'Void'];
      console.log('Before filter - received:', JSON.stringify(allowedTransactionTypes));
      console.log('Valid types:', JSON.stringify(validTypes));
      const filteredTypes = Array.isArray(allowedTransactionTypes)
        ? allowedTransactionTypes.filter(t => {
            const isValid = validTypes.includes(t);
            if (!isValid) {
              console.log(`Filtering out invalid type: ${t}`);
            }
            return isValid;
          })
        : validTypes;
      console.log('After filter - filtered:', JSON.stringify(filteredTypes));
      console.log('Void in received?', allowedTransactionTypes.includes('Void'));
      console.log('Void in validTypes?', validTypes.includes('Void'));
      console.log('Void in filtered?', filteredTypes.includes('Void'));
      users[userIndex].allowedTransactionTypes = filteredTypes;
      console.log('Saved to user object:', JSON.stringify(users[userIndex].allowedTransactionTypes));
    }
    
    // Update role (admin only)
    if (isAdmin && role !== undefined) {
      users[userIndex].role = role;
    }
    
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('File written. User allowedTransactionTypes after write:', JSON.stringify(users[userIndex].allowedTransactionTypes));
    
    // Update session if current user was updated
    if (isOwnAccount && password) {
      // Re-login required after password change
      req.session.destroy();
      return res.json({ success: true, requiresReauth: true });
    }
    
    // If admin updated permissions for current user, update session
    if (isOwnAccount && isAdmin && allowedTransactionTypes !== undefined) {
      req.session.user.allowedTransactionTypes = users[userIndex].allowedTransactionTypes;
      // Save session explicitly to ensure it persists
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    const updatedUser = {
      id: users[userIndex].id,
      username: users[userIndex].username,
      role: users[userIndex].role,
      allowedTransactionTypes: users[userIndex].allowedTransactionTypes,
      createdAt: users[userIndex].createdAt
    };
    
    console.log('User updated successfully:', updatedUser);
    
    res.json({
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logging endpoint
app.post('/api/logs', checkSession, async (req, res) => {
  try {
    const logEntry = req.body;
    
    if (!logEntry || logEntry.status === 'listening') {
      return res.json({ success: true });
    }
    
    // Ensure LOGS directory exists
    try {
      await fs.mkdir(LOGS_PATH, { recursive: true });
    } catch (e) {
      if (e.code !== 'EEXIST') {
        console.error('Error creating LOGS directory:', e);
      }
    }
    
    // Get date for filename (YYYYMMDD.jsonl)
    const date = new Date(logEntry.timestamp);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const fileName = `${year}${month}${day}.jsonl`;
    const filePath = path.join(LOGS_PATH, fileName);
    
    // Prepare JSON object
    const logObject = {
      timestamp: logEntry.timestamp,
      user: logEntry.user,
      transType: logEntry.transType,
      amount: logEntry.amount,
      refId: String(logEntry.refId),
      requestUrl: logEntry.requestUrl,
      requestXml: logEntry.requestXml,
      responseCaptured: logEntry.responseCaptured || '',
      status: logEntry.status || '',
    };
    
    // Append to file (atomic on Windows)
    const jsonLine = JSON.stringify(logObject) + '\n';
    await fs.appendFile(filePath, jsonLine, 'utf8');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing log file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static files (React app)
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all handler: send back React's index.html for client-side routing
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Initialize users and start server
initializeUsers().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`LOGS_PATH: ${LOGS_PATH}`);
    console.log(`Users file: ${USERS_FILE}`);
  });
}).catch(error => {
  console.error('Failed to initialize users:', error);
  process.exit(1);
});

