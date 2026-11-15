process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_cartify_12345';

const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/models/Product');
const User = require('../src/models/User');
const { generateToken } = require('../src/config/jwt');
const { setupTestDB } = require('./setup');

describe('Shopping Cart & Order Processing APIs', () => {
  setupTestDB();

  let userToken;
  let adminToken;
  let userId;
  let product1;
  let product2;

  beforeEach(async () => {
    // Create shopper
    const user = await User.create({
      name: 'Bob Shopper',
      email: 'bob@example.com',
      password: 'BobPassword123!',
      role: 'user'
    });
    userId = user._id;
    userToken = generateToken({ id: user._id, role: user.role });

    // Create admin
    const admin = await User.create({
      name: 'Admin Boss',
      email: 'adminboss@example.com',
      password: 'AdminPassword123!',
      role: 'admin'
    });
    adminToken = generateToken({ id: admin._id, role: admin.role });

    // Create products
    product1 = await Product.create({
      name: 'Mechanical Keyboard',
      description: 'Tactile switches with per-key RGB.',
      price: 100.00,
      category: 'electronics',
      stock: 10
    });

    product2 = await Product.create({
      name: 'Wireless Mouse',
      description: 'Ergonomic sensor mouse.',
      price: 50.00,
      category: 'electronics',
      stock: 5
    });
  });

  describe('Shopping Cart Endpoints', () => {
    it('should add items to cart and compute total amount', async () => {
      // Add product1
      const res1 = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product1._id,
          quantity: 2
        });

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.items.length).toBe(1);
      expect(res1.body.data.totalAmount).toBe(200.00);
      expect(res1.body.data.totalItems).toBe(2);

      // Add product2
      const res2 = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product2._id,
          quantity: 1
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.items.length).toBe(2);
      expect(res2.body.data.totalAmount).toBe(250.00);
      expect(res2.body.data.totalItems).toBe(3);
    });

    it('should reject adding item if quantity exceeds stock', async () => {
      const res = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product2._id,
          quantity: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/insufficient stock/i);
    });

    it('should update item quantity in cart', async () => {
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ productId: product1._id, quantity: 1 });

      const res = await request(app)
        .put(`/api/cart/${product1._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 3 });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].quantity).toBe(3);
      expect(res.body.data.totalAmount).toBe(300.00);
    });

    it('should remove item from cart and allow clearing cart', async () => {
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ productId: product1._id, quantity: 2 });

      const removeRes = await request(app)
        .delete(`/api/cart/${product1._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(removeRes.status).toBe(200);
      expect(removeRes.body.data.items.length).toBe(0);

      const clearRes = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(clearRes.status).toBe(200);
      expect(clearRes.body.data.items.length).toBe(0);
    });
  });

  describe('Order Checkout & Payment Simulation', () => {
    const validShippingAddress = {
      street: '456 Tech Park Way',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'USA'
    };

    beforeEach(async () => {
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ productId: product1._id, quantity: 2 });
    });

    it('should place order with simulated payment, deduct stock, and empty cart', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress: validShippingAddress,
          simulationOutcome: 'SUCCESS'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.isPaid).toBe(true);
      expect(res.body.data.order.orderStatus).toBe('Processing');
      expect(res.body.data.paymentSimulation.status).toBe('COMPLETED');
      expect(res.body.data.paymentSimulation.transactionId).toBeDefined();

      const updatedProduct = await Product.findById(product1._id);
      expect(updatedProduct.stock).toBe(8);

      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);
      expect(cartRes.body.data.items.length).toBe(0);
    });

    it('should handle simulated declined payment without decrementing stock', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress: validShippingAddress,
          simulationOutcome: 'DECLINED'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order.isPaid).toBe(false);
      expect(res.body.data.order.orderStatus).toBe('Pending');
      expect(res.body.data.paymentSimulation.status).toBe('DECLINED');

      const unchangedProduct = await Product.findById(product1._id);
      expect(unchangedProduct.stock).toBe(10);
    });

    it('should retrieve order history and order details for user', async () => {
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress: validShippingAddress,
          simulationOutcome: 'SUCCESS'
        });

      const orderId = orderRes.body.data.order._id;

      const listRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);

      const singleRes = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(singleRes.status).toBe(200);
      expect(singleRes.body.data._id).toBe(orderId);
      expect(singleRes.body.data.shippingAddress.city).toBe('Austin');
    });

    it('should allow admin to update order status to Shipped or Delivered', async () => {
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress: validShippingAddress,
          simulationOutcome: 'SUCCESS'
        });

      const orderId = orderRes.body.data.order._id;

      const updateRes = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ orderStatus: 'Delivered' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.orderStatus).toBe('Delivered');
      expect(updateRes.body.data.deliveredAt).toBeDefined();
    });
  });
});
