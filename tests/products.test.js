process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_cartify_12345';

const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/models/Product');
const { generateToken } = require('../src/config/jwt');
const User = require('../src/models/User');
const { setupTestDB } = require('./setup');

describe('Product Catalog APIs', () => {
  setupTestDB();

  let adminToken;
  let userToken;
  let sampleProduct;

  beforeEach(async () => {
    // Create Admin user
    const admin = await User.create({
      name: 'Admin Boss',
      email: 'admin@test.com',
      password: 'AdminPassword123!',
      role: 'admin'
    });
    adminToken = generateToken({ id: admin._id, role: admin.role });

    // Create Regular user
    const user = await User.create({
      name: 'Regular Customer',
      email: 'customer@test.com',
      password: 'CustomerPassword123!',
      role: 'user'
    });
    userToken = generateToken({ id: user._id, role: user.role });

    // Insert sample products
    sampleProduct = await Product.create({
      name: 'Wireless Bluetooth Earbuds',
      description: 'High fidelity audio earbuds with active noise cancellation and long battery life.',
      price: 99.99,
      category: 'electronics',
      stock: 50,
      brand: 'SoundPulse',
      sku: 'ELE-AUD-001'
    });

    await Product.create({
      name: 'Cotton Graphic T-Shirt',
      description: '100% combed cotton casual street-wear graphic t-shirt.',
      price: 25.00,
      category: 'fashion',
      stock: 100,
      brand: 'UrbanStyle',
      sku: 'FAS-TSH-002'
    });

    await Product.create({
      name: 'Stainless Steel Pour-Over Kettle',
      description: 'Gooseneck temperature kettle with ergonomic grip for pour-over coffee.',
      price: 49.99,
      category: 'home',
      stock: 15,
      brand: 'BrewMaster',
      sku: 'HOM-KET-003'
    });
  });

  describe('GET /api/products', () => {
    it('should return all active products with pagination metadata', async () => {
      const res = await request(app).get('/api/products?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.currentPage).toBe(1);
      expect(res.body.pagination.totalProducts).toBe(3);
    });

    it('should filter products by category', async () => {
      const res = await request(app).get('/api/products?category=electronics');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].category).toBe('electronics');
      expect(res.body.data[0].name).toBe('Wireless Bluetooth Earbuds');
    });

    it('should search products by search term', async () => {
      const res = await request(app).get('/api/products?search=cotton');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toContain('Cotton');
    });

    it('should filter products by price range', async () => {
      const res = await request(app).get('/api/products?minPrice=30&maxPrice=100');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should sort products by price ascending', async () => {
      const res = await request(app).get('/api/products?sort=price_asc');

      expect(res.status).toBe(200);
      expect(res.body.data[0].price).toBe(25.00);
      expect(res.body.data[2].price).toBe(99.99);
    });

    it('should sort products by price descending', async () => {
      const res = await request(app).get('/api/products?sort=price_desc');

      expect(res.status).toBe(200);
      expect(res.body.data[0].price).toBe(99.99);
      expect(res.body.data[2].price).toBe(25.00);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return product details for valid ID', async () => {
      const res = await request(app).get(`/api/products/${sampleProduct._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(sampleProduct._id.toString());
      expect(res.body.data.name).toBe(sampleProduct.name);
    });

    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const res = await request(app).get(`/api/products/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 400 for invalid ObjectId format', async () => {
      const res = await request(app).get('/api/products/invalid-id-string');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/products (Admin only)', () => {
    const newProduct = {
      name: 'Smart 4K TV 55 Inch',
      description: 'Ultra HD smart television with HDR10+ and Dolby Atmos support.',
      price: 499.99,
      category: 'electronics',
      stock: 12,
      brand: 'ApexVision'
    };

    it('should allow admin to create a new product (201 Created)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProduct);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(newProduct.name);
      expect(res.body.data.price).toBe(newProduct.price);
      expect(res.body.data.sku).toBeDefined();
    });

    it('should reject non-admin users from creating product (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newProduct);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated requests from creating product (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/products')
        .send(newProduct);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id & DELETE /api/products/:id', () => {
    it('should allow admin to update a product', async () => {
      const res = await request(app)
        .put(`/api/products/${sampleProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 79.99,
          stock: 35
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(79.99);
      expect(res.body.data.stock).toBe(35);
    });

    it('should allow admin to delete a product', async () => {
      const res = await request(app)
        .delete(`/api/products/${sampleProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion
      const findRes = await request(app).get(`/api/products/${sampleProduct._id}`);
      expect(findRes.status).toBe(404);
    });
  });
});
