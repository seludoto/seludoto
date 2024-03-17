// app.js

// Dependencies
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { createObjectCsvWriter } = require('csv-writer');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Configure express-session middleware
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false
}));

// Initialize passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Set up Google OAuth 2.0 strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  // Perform user authentication or registration logic here
  // For example, save user profile to database
  // Call done() with user object
}));

// Serialize user object to session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user object from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Authentication middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// Role-based access control middleware
const checkRole = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      next();
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }
  };
};

// Define routes

// Authentication routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  // Successful authentication, redirect to dashboard or home page
  res.redirect('/dashboard');
});

// Profile management routes
app.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is available in req.user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error getting user profile:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is available in req.user
    const { username, email } = req.body;
    const user = await User.findByIdAndUpdate(userId, { username, email }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User profile updated successfully', user });
  } catch (err) {
    console.error('Error updating user profile:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Role-based access control routes
app.post('/admin/add', checkRole('admin'), async (req, res) => {
  try {
    // Implement adding admin logic here
    res.json({ message: 'Admin added successfully' });
  } catch (err) {
    console.error('Error adding admin:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Data export route
app.get('/export/csv', verifyToken, async (req, res) => {
  try {
    // Define CSV header and data
    const csvHeader = [
      { id: 'id', title: 'ID' },
      { id: 'name', title: 'Name' },
      { id: 'email', title: 'Email' }
    ];
    const data = [{ id: 1, name: 'John Doe', email: 'john@example.com' }]; // Sample data to export

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: 'exported_data.csv',
      header: csvHeader
    });

    // Write data to CSV file
    csvWriter.writeRecords(data)
      .then(() => {
        console.log('CSV file created successfully');
        res.download('exported_data.csv'); // Download the generated CSV file
      })
      .catch(err => {
        console.error('Error writing CSV:', err.message);
        res.status(500).json({ message: 'Internal server error' });
      });
  } catch (err) {
    console.error('Error exporting data:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
