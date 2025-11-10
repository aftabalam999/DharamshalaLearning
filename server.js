/**
 * Express.js Server for Reminder Endpoints
 * 
 * Simple Node.js/Express server to handle cron job requests
 * 
 * Setup:
 * 1. npm install express cors dotenv
 * 2. Create .env file with: CRON_API_KEY=your-secret-key
 * 3. Run: node server.js
 * 4. Set up cron jobs to call: http://your-server.com:3001/api/reminders/...
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const validApiKey = process.env.CRON_API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: 'Invalid or missing API key'
    });
  }

  next();
};

// Import Firebase Admin (you'll need to set this up)
// const admin = require('firebase-admin');
// admin.initializeApp({
//   credential: admin.credential.cert(require('./serviceAccountKey.json'))
// });

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Sunday 8pm reminder
app.post('/api/reminders/sunday', validateApiKey, async (req, res) => {
  try {
    console.log('[Server] Sunday reminder triggered at:', new Date().toISOString());
    
    // Call your ReviewReminderService here
    // const result = await sendSundayReminders();
    
    res.json({
      success: true,
      message: 'Sunday reminder sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Server] Error in Sunday reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send Sunday reminder',
      error: error.message
    });
  }
});

// Monday 9am reminder
app.post('/api/reminders/monday-morning', validateApiKey, async (req, res) => {
  try {
    console.log('[Server] Monday morning reminder triggered at:', new Date().toISOString());
    
    res.json({
      success: true,
      message: 'Monday morning reminder sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Server] Error in Monday morning reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send Monday morning reminder',
      error: error.message
    });
  }
});

// Monday 6pm reminder
app.post('/api/reminders/monday-evening', validateApiKey, async (req, res) => {
  try {
    console.log('[Server] Monday evening reminder triggered at:', new Date().toISOString());
    
    res.json({
      success: true,
      message: 'Monday evening reminder sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Server] Error in Monday evening reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send Monday evening reminder',
      error: error.message
    });
  }
});

// Daily overdue reminder (Tuesday-Sunday 10am)
app.post('/api/reminders/overdue', validateApiKey, async (req, res) => {
  try {
    console.log('[Server] Overdue reminder triggered at:', new Date().toISOString());
    
    res.json({
      success: true,
      message: 'Overdue reminder sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Server] Error in overdue reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send overdue reminder',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Reminder API server running on port ${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
  console.log(`[Server] Sunday reminder: POST http://localhost:${PORT}/api/reminders/sunday`);
  console.log(`[Server] Monday morning: POST http://localhost:${PORT}/api/reminders/monday-morning`);
  console.log(`[Server] Monday evening: POST http://localhost:${PORT}/api/reminders/monday-evening`);
  console.log(`[Server] Overdue: POST http://localhost:${PORT}/api/reminders/overdue`);
});

module.exports = app;
