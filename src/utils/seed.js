require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');

const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@cartify.com',
    password: 'AdminPassword123!',
    role: 'admin',
    phone: '+1-555-0100',
    address: {
      street: '100 Commerce Blvd',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'USA'
    }
  },
  {
    name: 'Jane Shopper',
    email: 'shopper@cartify.com',
    password: 'ShopperPassword123!',
    role: 'user',
    phone: '+1-555-0101',
    address: {
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'OR',
      postalCode: '97477',
      country: 'USA'
    }
  }
];

const sampleProducts = [
  {
    name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    description: 'Industry-leading noise cancellation with two processors and 8 microphones. Up to 30 hours battery life with quick charging and crystal clear hands-free calling.',
    price: 399.99,
    category: 'electronics',
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    brand: 'Sony',
    sku: 'ELE-SNY-001',
    rating: { average: 4.8, count: 120 }
  },
  {
    name: 'Apple MacBook Pro 14" M3 Chip',
    description: 'Apple M3 Pro chip with 11-core CPU and 14-core GPU, 18GB unified memory, 512GB SSD storage. Liquid Retina XDR display.',
    price: 1999.00,
    category: 'electronics',
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
    brand: 'Apple',
    sku: 'ELE-APL-002',
    rating: { average: 4.9, count: 85 }
  },
  {
    name: 'Logitech MX Master 3S Wireless Mouse',
    description: 'Quiet click electromagnetic scrolling mouse with 8K DPI any-surface sensor, Bluetooth/USB receiver, and ergonomic thumb rest.',
    price: 99.99,
    category: 'electronics',
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80',
    brand: 'Logitech',
    sku: 'ELE-LOG-003',
    rating: { average: 4.7, count: 210 }
  },
  {
    name: 'Mechanical Gaming Keyboard RGB Backlit',
    description: 'Hot-swappable tactile switches, per-key RGB lighting, aircraft-grade aluminum frame with detachable braided USB-C cable.',
    price: 129.50,
    category: 'gaming',
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
    brand: 'Keychron',
    sku: 'GAM-KEY-004',
    rating: { average: 4.6, count: 74 }
  },
  {
    name: 'Ultra-Soft Organic Cotton Hoodie',
    description: 'Premium heavyweight organic cotton fleece hoodie with double-lined hood, kangaroo pocket, and ribbed cuffs. Pre-shrunk fit.',
    price: 65.00,
    category: 'fashion',
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80',
    brand: 'Cartify Apparel',
    sku: 'FAS-HOD-005',
    rating: { average: 4.5, count: 62 }
  },
  {
    name: 'Classic Minimalist Leather Watch',
    description: 'Genuine Italian leather strap with Japanese quartz movement, scratch-resistant sapphire crystal glass, 50m water resistance.',
    price: 149.00,
    category: 'fashion',
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    brand: 'Nordic Time',
    sku: 'FAS-WTC-006',
    rating: { average: 4.6, count: 48 }
  },
  {
    name: 'Ceramic Pour-Over Coffee Dripper Set',
    description: 'Artisan handcrafted ceramic dripper with thermal insulated glass carafe, reusable mesh filter, and barista measuring scoop.',
    price: 45.00,
    category: 'home',
    stock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
    brand: 'BrewCraft',
    sku: 'HOM-COF-007',
    rating: { average: 4.8, count: 115 }
  },
  {
    name: 'Smart WiFi Air Purifier with HEPA Filter',
    description: 'True HEPA air cleaner filtering 99.97% of dust, pollen, smoke, and pet dander. App enabled with real-time air quality indicator.',
    price: 189.99,
    category: 'home',
    stock: 18,
    imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80',
    brand: 'PureBreeze',
    sku: 'HOM-AIR-008',
    rating: { average: 4.7, count: 93 }
  },
  {
    name: 'Fitness Smartwatch with AMOLED Display & GPS',
    description: 'All-day heart rate, SpO2 monitoring, onboard GPS, 100+ workout modes, 14-day battery life, and 5ATM water resistance.',
    price: 179.99,
    category: 'wearables',
    stock: 22,
    imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80',
    brand: 'FitPulse',
    sku: 'WEA-WAT-009',
    rating: { average: 4.5, count: 88 }
  },
  {
    name: 'Insulated Stainless Steel Water Bottle 32oz',
    description: 'Double-wall vacuum insulation keeping drinks cold for 24 hours or piping hot for 12 hours. Leak-proof chug lid and BPA-free.',
    price: 29.99,
    category: 'fitness',
    stock: 60,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80',
    brand: 'HydroSteel',
    sku: 'FIT-BTL-010',
    rating: { average: 4.9, count: 340 }
  }
];

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await connectDB();

    console.log('[Seed] Cleaning old database data...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({})
    ]);

    console.log('[Seed] Inserting seed users...');
    // Use User.create so pre-save password hashing is triggered
    for (const userData of sampleUsers) {
      await User.create(userData);
    }
    console.log(`[Seed] Seeded ${sampleUsers.length} users (Admin & Shopper)`);

    console.log('[Seed] Inserting seed products...');
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`[Seed] Seeded ${createdProducts.length} products`);

    console.log('\n================ SEED SUMMARY ================');
    console.log('Admin Account:');
    console.log('  Email:    admin@cartify.com');
    console.log('  Password: AdminPassword123!');
    console.log('Shopper Account:');
    console.log('  Email:    shopper@cartify.com');
    console.log('  Password: ShopperPassword123!');
    console.log(`Total Products: ${createdProducts.length}`);
    console.log('==============================================\n');

    await disconnectDB();
    console.log('[Seed] Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleUsers, sampleProducts };
