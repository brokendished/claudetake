const express = require('express');
const session = require('express-session');
const sessionCheck = require('./middleware/sessionCheck');

const app = express();

// ...existing code...

// Set up session management
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Public route
app.get('/login', (req, res) => {
    // ...existing code for login...
});

// Protected route
app.get('/dashboard', sessionCheck, (req, res) => {
    res.json({ message: 'Welcome to the dashboard!' });
});

// ...existing code...