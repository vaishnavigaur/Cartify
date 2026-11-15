require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start HTTP server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[Server] Cartify API server listening on http://localhost:${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('[Server Error] Failed to start server:', err.message);
    process.exit(1);
  });
