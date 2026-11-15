const mongoose = require('mongoose');

/**
 * Connect to MongoDB instance
 * @param {string} [customUri] - Optional custom MongoDB URI
 * @returns {Promise<mongoose.Connection>}
 */
const connectDB = async (customUri) => {
  const uri = customUri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cartify';
  
  try {
    const conn = await mongoose.connect(uri);
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    }
    return conn;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Disconnect from MongoDB instance
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    if (process.env.NODE_ENV !== 'test') {
      console.log('[Database] MongoDB connection closed');
    }
  } catch (error) {
    console.error(`[Database Error] Error during disconnect: ${error.message}`);
  }
};

module.exports = {
  connectDB,
  disconnectDB
};
