const mongoose = require('mongoose');

const TEST_MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/cartify_test';

const setupTestDB = () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_jwt_secret_key_cartify_12345';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_MONGO_URI);
    }
  });

  afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
      } catch (err) {
        // Ignore close errors on shutdown
      }
    }
  });
};

module.exports = { setupTestDB, TEST_MONGO_URI };
