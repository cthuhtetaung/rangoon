# CafeManage - Architecture Documentation

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                         │
│                  React 18 + Tailwind + TypeScript                │
│  - POS Interface                                                 │
│  - Dashboards & Reports                                         │
│  - Inventory Management                                         │
│  - Staff Management                                             │
│  - Settings                                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API + WebSocket
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      API GATEWAY (Nginx)                         │
│              Route requests to appropriate service               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  BACKEND (NestJS + Express)                      │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Auth      │  │    Users     │  │   Branches   │            │
│  │   Module    │  │   Module     │  │   Module     │            │
│  └─────────────┘  └──────────────┘  └──────────────┘            │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Products  │  │    Orders    │  │     POS      │            │
│  │   Module    │  │   Module     │  │   Module     │            │
│  └─────────────┘  └──────────────┘  └──────────────┘            │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Inventory  │  │   Payments   │  │  Reports     │            │
│  │  Module     │  │   Module     │  │   Module     │            │
│  └─────────────┘  └──────────────┘  └──────────────┘            │
│                                                                  │
│  ... and 10+ more specialized modules                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      DATABASE LAYER                              │
│           TypeORM + PostgreSQL with UUID support                │
│           Soft Deletes + Audit Logging                          │
└─────────────────────────────────────────────────────────────────┘
```

## Module Architecture

Each major feature is organized as an independent NestJS module with:

```
module/
├── controllers/
│   └── module.controller.ts      # HTTP request handlers
├── services/
│   └── module.service.ts         # Business logic
├── entities/
│   └── module.entity.ts          # Database schema
├── dto/
│   ├── create-module.dto.ts      # Create request validation
│   ├── update-module.dto.ts      # Update request validation
│   └── module.dto.ts             # Response DTO
└── module.module.ts              # Module definition & imports
```

### Module Responsibilities

- **Controller**: Handles HTTP requests, validation, and responses
- **Service**: Contains business logic and database operations
- **Entity**: Defines database schema using TypeORM decorators
- **DTO**: Data Transfer Objects for request/response validation
- **Module**: Registers controllers, services, and dependencies

## Core Modules Overview

### 1. Auth Module
- JWT-based authentication
- User registration & login
- Password management
- Token refresh
- **Key Files**:
  - `auth.service.ts` - JWT token generation
  - `jwt.strategy.ts` - Passport JWT strategy
  - `auth.guard.ts` - Authentication guard

### 2. Users Module
- User CRUD operations
- Role-based access control (RBAC)
- User profiles
- Language preferences
- **Key Files**:
  - `user.entity.ts` - User schema
  - `users.service.ts` - User business logic
  - `roles.enum.ts` - Role definitions

### 3. Products Module
- Product catalog management
- Categories & subcategories
- Pricing (inclusive/exclusive tax)
- Service charges
- **Key Files**:
  - `product.entity.ts` - Product schema
  - `product-category.entity.ts` - Category schema

### 4. Orders Module
- Order creation & management
- Order items tracking
- Order status workflow
- Order modifications (split, merge)
- **Key Files**:
  - `order.entity.ts` - Order schema
  - `order-item.entity.ts` - Individual items
  - `order-status.enum.ts` - Status workflow

### 5. POS Module
- Real-time POS operations
- Table/counter management
- Bill generation
- Receipt printing
- **Key Files**:
  - `pos.controller.ts` - POS operations
  - `pos.service.ts` - POS logic

### 6. Payments Module
- Payment processing
- Multiple payment methods
- Split payments
- Partial payments
- Refunds
- **Key Files**:
  - `payment.entity.ts` - Payment schema
  - `payment.service.ts` - Payment processing

### 7. Inventory Module
- Stock level tracking
- Stock movements (IN/OUT/ADJUSTMENT)
- Stock ledger
- **Key Files**:
  - `inventory.entity.ts` - Inventory schema
  - `stock-movement.entity.ts` - Movement history

### 8. Reports Module
- Sales reports
- Product performance
- Cashier shift reports
- Profit & Loss
- Forecasting
- **Key Files**:
  - `reports.service.ts` - Report generation
  - `export.service.ts` - PDF/Excel export

## Database Schema

### Core Tables

```
users
├── id (UUID, PK)
├── firstName
├── lastName
├── email
├── password (hashed with bcrypt)
├── role (enum: admin|manager|staff|cashier)
├── branchId (FK)
├── isActive
├── language
└── timestamps (createdAt, updatedAt, deletedAt)

orders
├── id (UUID, PK)
├── orderNumber
├── tableId or customerId
├── branchId (FK)
├── userId (cashier/staff FK)
├── status (enum: pending|preparing|ready|completed|cancelled)
├── totalAmount
├── discountAmount
├── serviceChargeAmount
├── taxAmount
└── timestamps

order_items
├── id (UUID, PK)
├── orderId (FK)
├── productId (FK)
├── quantity
├── unitPrice
├── specialNotes
├── status
└── timestamps

payments
├── id (UUID, PK)
├── orderId (FK)
├── amount
├── method (enum: cash|kbzpay|wavepay|card)
├── status (enum: pending|completed|failed|refunded)
└── timestamps

products
├── id (UUID, PK)
├── name
├── categoryId (FK)
├── price
├── costPrice
├── isTaxable
├── isActive
├── branchId (FK)
└── timestamps

inventory
├── id (UUID, PK)
├── productId (FK)
├── branchId (FK)
├── quantity
├── minThreshold
└── timestamps

stock_movements
├── id (UUID, PK)
├── inventoryId (FK)
├── type (enum: IN|OUT|ADJUSTMENT)
├── quantity
├── reason
├── referenceId (PO/Order ID)
└── timestamps

branches
├── id (UUID, PK)
├── name
├── location
├── phone
├── manager
├── isActive
└── timestamps
```

## Data Flow

### Order Creation Flow

```
1. POS Controller receives CreateOrderDTO
   ↓
2. POS Service validates
   - Products exist and in stock
   - User has permission
   ↓
3. Order Entity created with initial status = "pending"
   ↓
4. OrderItems created for each product
   ↓
5. Inventory updated (stock decreased)
   ↓
6. WebSocket event emitted to KDS display
   ↓
7. Response sent to client with Order ID
```

### Payment Flow

```
1. Payment Controller receives payment details
   ↓
2. Order validation (exists, not already paid)
   ↓
3. Payment method selection
   - Cash: Direct creation
   - Card/Mobile: Payment gateway call
   ↓
4. Payment Entity created
   ↓
5. If successful:
   - Order status → "completed"
   - Stock movement logged
   - Receipt generated
   ↓
6. WebSocket notification to cashier & manager
```

## Real-Time Communication (WebSockets)

- **Kitchen Display System**: Live order updates
- **Bar Display**: Bar order notifications
- **Cashier Notifications**: Payment confirmations
- **Manager Dashboard**: Real-time metrics
- **Offline Queue**: Orders queued when offline

## Error Handling

- Global exception filter
- Custom exception types:
  - `BadRequestException` - Invalid input
  - `UnauthorizedException` - Auth failed
  - `ForbiddenException` - Insufficient permissions
  - `NotFoundException` - Resource not found
  - `ConflictException` - Data conflict
  - `InternalServerErrorException` - Server errors

## Security Measures

1. **Authentication**
   - JWT tokens with expiration
   - Refresh tokens for session extension
   - HTTP-only cookies for tokens

2. **Authorization**
   - Role-based access control (RBAC)
   - Route guards
   - Method-level authorization

3. **Data Protection**
   - Password hashing (bcrypt)
   - Soft deletes (never delete data)
   - Audit logging

4. **API Security**
   - Rate limiting
   - Request validation
   - CORS configuration
   - SQL injection prevention (TypeORM parameterized queries)

## Performance Optimization

- Database indexing on frequently queried columns
- Pagination for list endpoints
- Caching layer (to be implemented)
- Query optimization with SELECT specific fields
- Connection pooling with TypeORM

## Deployment Architecture

- **Development**: Single machine with Docker Compose
- **Production**: Kubernetes or managed container platform
- **Load Balancing**: Nginx reverse proxy
- **Database**: Managed PostgreSQL (RDS, Cloud SQL, etc.)
- **Storage**: Cloud storage for receipts/reports (S3, GCS)
- **Monitoring**: Application logging and metrics

---

For more details, see:
- [Database Schema](./DATABASE.md)
- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)
