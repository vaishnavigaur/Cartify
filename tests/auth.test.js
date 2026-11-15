process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_cartify_12345';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { setupTestDB } = require('./setup');

describe('Authentication & User Management APIs', () => {
  setupTestDB();

  const testUser = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'Password123!',
    phone: '+1-202-555-0199',
    address: {
      street: '123 Market St',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'USA'
    }
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toHaveProperty('_id');
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.name).toBe(testUser.name);
      expect(res.body.data.user.role).toBe('user');
      // Password must be stripped from response
      expect(res.body.data.user.password).toBeUndefined();

      // Verify user in database
      const dbUser = await User.findOne({ email: testUser.email.toLowerCase() });
      expect(dbUser).not.toBeNull();
      expect(dbUser.password).not.toBe(testUser.password); // Must be hashed
    });

    it('should reject registration if email is already in use (409 Conflict)', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject registration if required fields are missing (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject registration if password is under 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass',
          email: 'short@example.com',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should reject login with incorrect password (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject login for non-existent email (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile & PUT /api/auth/profile', () => {
    let token;

    beforeEach(async () => {
      const reg = await request(app).post('/api/auth/register').send(testUser);
      token = reg.body.data.token;
    });

    it('should reject profile request without token (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.name).toBe(testUser.name);
    });

    it('should update profile name and address', async () => {
      const updateData = {
        name: 'Alice Updated',
        phone: '+1-202-999-8877',
        address: {
          city: 'Bellevue',
          state: 'WA'
        }
      };

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Alice Updated');
      expect(res.body.data.user.phone).toBe('+1-202-999-8877');
      expect(res.body.data.user.address.city).toBe('Bellevue');
    });

    it('should successfully change password when current password is provided', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'BrandNewPassword456!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify new password works for login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'BrandNewPassword456!'
        });

      expect(loginRes.status).toBe(200);
    });

    it('should fail password change if current password is incorrect', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'IncorrectOldPassword',
          newPassword: 'BrandNewPassword456!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/current password does not match/i);
    });
  });
});
