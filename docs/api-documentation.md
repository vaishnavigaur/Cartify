# Cartify E-Commerce REST API Documentation

Comprehensive technical API documentation for the **Cartify** E-Commerce Backend.

---

## Base URL & General Conventions

- **Base URL**: `http://localhost:5000/api`
- **Content-Type**: `application/json`
- **Standard Authentication**: Bearer Token in `Authorization` header (`Authorization: Bearer <JWT_TOKEN>`)

### Universal Response Format

All responses follow a predictable JSON schema:

#### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalProducts": 42,
    "limit": 10
  }
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    }
  ]
}
```

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 User Registration
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public
- **Rate Limit**: 20 requests per 15 minutes

#### Request Body
```json
{
  "name": "Jane Shopper",
  "email": "jane@example.com",
  "password": "Password123!",
  "role": "user",
  "phone": "+1-555-0199",
  "address": {
    "street": "123 Market St",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94105",
    "country": "USA"
  }
}
```

#### Responses
- **201 Created**: Returns signed JWT token and user profile (password stripped).
- **400 Bad Request**: Input validation errors.
- **409 Conflict**: Email already registered.

#### cURL Example
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Shopper",
    "email": "jane@example.com",
    "password": "Password123!"
  }'
```

---

### 1.2 User Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Rate Limit**: 20 requests per 15 minutes

#### Request Body
```json
{
  "email": "jane@example.com",
  "password": "Password123!"
}
```

#### Responses
- **200 OK**: Login successful, returns Bearer JWT.
- **401 Unauthorized**: Invalid email or password.

#### cURL Example
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "Password123!"
  }'
```

---

### 1.3 Get Current User Profile
- **Endpoint**: `GET /api/auth/profile`
- **Access**: Private (Requires Bearer Token)

#### Headers
```http
Authorization: Bearer <TOKEN>
```

#### Responses
- **200 OK**: Returns profile of authenticated user.
- **401 Unauthorized**: Missing or expired token.

---

### 1.4 Update User Profile
- **Endpoint**: `PUT /api/auth/profile`
- **Access**: Private (Requires Bearer Token)

#### Request Body
```json
{
  "name": "Jane Doe",
  "phone": "+1-555-0200",
  "address": {
    "city": "Seattle",
    "state": "WA"
  },
  "currentPassword": "Password123!",
  "newPassword": "NewSecurePassword456!"
}
```

#### Responses
- **200 OK**: Profile updated.
- **400 Bad Request**: Current password incorrect or validation error.

---

## 2. Product Catalog Endpoints (`/api/products`)

### 2.1 Get Products (Catalog Browsing)
- **Endpoint**: `GET /api/products`
- **Access**: Public
- **Query Parameters**:
  - `page` (default: `1`): Page number
  - `limit` (default: `10`, max: `50`): Items per page
  - `category`: Filter by category (e.g. `electronics`, `fashion`, `home`)
  - `search` / `q`: Full-text/regex search across name, description, category, brand
  - `minPrice`: Minimum price filter
  - `maxPrice`: Maximum price filter
  - `inStock`: `true` to filter items with stock > 0
  - `sort`: `price_asc`, `price_desc`, `rating`, `name_asc`, `newest` (default)

#### Example Request
`GET /api/products?category=electronics&sort=price_asc&minPrice=50&maxPrice=500&page=1&limit=5`

#### Responses
- **200 OK**: Returns array of matching products with pagination metadata.

---

### 2.2 Get Product by ID
- **Endpoint**: `GET /api/products/:id`
- **Access**: Public
- **Path Parameters**:
  - `id`: MongoDB ObjectId of the product

#### Responses
- **200 OK**: Product details.
- **400 Bad Request**: Malformed MongoDB ObjectId.
- **404 Not Found**: Product not found or inactive.

---

### 2.3 Create Product
- **Endpoint**: `POST /api/products`
- **Access**: Private / Admin Only

#### Request Body
```json
{
  "name": "Wireless Noise Cancelling Headphones",
  "description": "High fidelity audio with 30-hour battery life and fast charging.",
  "price": 299.99,
  "category": "electronics",
  "stock": 25,
  "imageUrl": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
  "brand": "AudioTech",
  "sku": "AUD-HDP-001"
}
```

#### Responses
- **201 Created**: Product created.
- **401 Unauthorized**: No token.
- **403 Forbidden**: User is not an admin.

---

### 2.4 Update Product
- **Endpoint**: `PUT /api/products/:id`
- **Access**: Private / Admin Only

#### Request Body (Any partial fields)
```json
{
  "price": 249.99,
  "stock": 40
}
```

#### Responses
- **200 OK**: Product updated.
- **404 Not Found**: Product does not exist.

---

### 2.5 Delete Product
- **Endpoint**: `DELETE /api/products/:id`
- **Access**: Private / Admin Only

#### Responses
- **200 OK**: Product deleted.
- **404 Not Found**: Product does not exist.

---

### 2.6 Get Product Categories
- **Endpoint**: `GET /api/products/categories`
- **Access**: Public

#### Responses
- **200 OK**: Returns distinct list of active categories `["electronics", "fashion", "home", ...]`.

---

## 3. Shopping Cart Endpoints (`/api/cart`)

All cart endpoints require authentication (`Authorization: Bearer <TOKEN>`).

### 3.1 Get Cart
- **Endpoint**: `GET /api/cart`
- **Access**: Private

#### Responses
- **200 OK**: Returns populated cart with product details, calculated `totalAmount`, and `totalItems`.

---

### 3.2 Add Item to Cart
- **Endpoint**: `POST /api/cart`
- **Access**: Private

#### Request Body
```json
{
  "productId": "67362f6b8b0e8b15d97f26ab",
  "quantity": 2
}
```

#### Responses
- **200 OK**: Item added or quantity incremented.
- **400 Bad Request**: Requested quantity exceeds available product stock.
- **404 Not Found**: Product not found.

---

### 3.3 Update Item Quantity in Cart
- **Endpoint**: `PUT /api/cart/:itemId`
- **Access**: Private
- **Path Parameter**: `itemId` (Can be cart item `_id` or `productId`)

#### Request Body
```json
{
  "quantity": 3
}
```

#### Responses
- **200 OK**: Cart item updated.
- **400 Bad Request**: Exceeds available stock.

---

### 3.4 Remove Item from Cart
- **Endpoint**: `DELETE /api/cart/:itemId`
- **Access**: Private

#### Responses
- **200 OK**: Item removed from cart.
- **404 Not Found**: Item was not in cart.

---

### 3.5 Clear Cart
- **Endpoint**: `DELETE /api/cart`
- **Access**: Private

#### Responses
- **200 OK**: Cart emptied.

---

## 4. Order & Checkout Endpoints (`/api/orders`)

All order endpoints require authentication (`Authorization: Bearer <TOKEN>`).

### 4.1 Create Order (Checkout & Payment Simulation)
- **Endpoint**: `POST /api/orders`
- **Access**: Private

#### Request Body
```json
{
  "shippingAddress": {
    "street": "742 Evergreen Terrace",
    "city": "Springfield",
    "state": "OR",
    "postalCode": "97477",
    "country": "USA"
  },
  "paymentMethod": "simulation",
  "simulationOutcome": "SUCCESS",
  "cardDetails": {
    "cardNumber": "4242 4242 4242 4242",
    "brand": "Visa"
  }
}
```

#### Supported `simulationOutcome` Options:
- `SUCCESS`: Transaction succeeds, marks order as `isPaid: true`, status `Processing`, decrements inventory stock, clears cart.
- `DECLINED`: Simulates card decline, creates order as `Pending` with `isPaid: false`, stock is preserved.
- `INSUFFICIENT_FUNDS`: Simulates account funds shortage, creates order as `Pending`.

#### Responses
- **201 Created**: Order created with simulation details.
- **400 Bad Request**: Empty cart or stock unavailable for requested items.

---

### 4.2 Get User Orders History
- **Endpoint**: `GET /api/orders`
- **Access**: Private
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 10)

#### Responses
- **200 OK**: Paginated list of user's past orders sorted by newest first.

---

### 4.3 Get Order by ID
- **Endpoint**: `GET /api/orders/:id`
- **Access**: Private (Owner or Admin)

#### Responses
- **200 OK**: Complete order details with shipping, items, pricing, and payment receipt.
- **403 Forbidden**: Attempting to view another user's order.
- **404 Not Found**: Order does not exist.

---

### 4.4 Update Order Status (Admin)
- **Endpoint**: `PUT /api/orders/:id/status`
- **Access**: Private / Admin Only

#### Request Body
```json
{
  "orderStatus": "Delivered"
}
```
*Valid statuses*: `Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`.

#### Responses
- **200 OK**: Order status updated (and records `deliveredAt` timestamp if status is `Delivered`).

---

### 4.5 Retry Payment Simulation on Order
- **Endpoint**: `POST /api/orders/:id/pay`
- **Access**: Private (Owner or Admin)

#### Request Body
```json
{
  "simulationOutcome": "SUCCESS"
}
```

#### Responses
- **200 OK**: Payment simulated, updates `isPaid`, status to `Processing`, and decrements inventory.
