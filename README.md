# CafeManage - Myanmar All-in-One ERP POS System

**Version:** 1.0.0 (Phase 1 Foundation)

A comprehensive, production-ready ERP/POS system built specifically for Myanmar businesses including restaurants, bars, hotpots, KTV, spas, and multi-branch chains.

## 🎯 Key Features

### 🛒 POS System
- Modern, intuitive POS interface
- Table-based ordering with split/merge capabilities
- Offline-first architecture (works without internet)
- Local order sync when online
- Multiple payment methods (KBZPay, WavePay, CBPay, AyaPay, Cash, MPU Card)
- Split payments and partial/deposit payments
- Receipt printing with local printer support

### 📊 Business Operations
- **Inventory Management** - Real-time stock tracking and ledger
- **Order Management** - Full order lifecycle from creation to completion
- **Kitchen Display System (KDS)** - Real-time order status for kitchen
- **Bar Display** - Separate display system for bar orders
- **Reservations** - Table booking and guest management
- **Staff Management** - Shift tracking, clock in/out, commissions
- **Expense Tracking** - Categorized expense management
- **Purchase Management** - Supplier management and purchase orders

### 📈 Analytics & Reports
- Sales reports (daily, weekly, monthly)
- Profit & Loss analysis
- Cashier shift reports
- Sales forecasting
- Product performance analysis
- Export to PDF and Excel

### 🏢 Multi-Branch Support
- Centralized dashboard for all branches
- Branch-specific inventory and staff management
- Consolidated reporting across branches

### 🌍 Myanmar-First Customization
- **Default Language:** Myanmar Unicode (with English fallback)
- **Currency:** MMK (Myanmar Kyat)
- **Payment Methods:** KBZPay, WavePay, CBPay, AyaPay integration ready
- **Offline-First:** Works completely offline, syncs when online
- **Business Presets:** Restaurant, Hotpot, KTV, Salon/Spa configurations

## 🏗️ Technology Stack

### Backend
- **Framework:** NestJS 10.x
- **Database:** PostgreSQL with TypeORM
- **Authentication:** JWT + Passport
- **Real-time:** WebSockets (Socket.IO)
- **API Docs:** Swagger/OpenAPI
- **Export:** PDF (PDFKit) & Excel (ExcelJS)

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Data Fetching:** React Query (TanStack Query)
- **Real-time:** Socket.IO Client
- **i18n:** next-international (MM + EN)

### Deployment
- **Docker** & Docker Compose
- **Nginx** reverse proxy
- **Local + Cloud** ready

## 📁 Project Structure

```
CafeManage/
├── server/                           # NestJS Backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                 # Authentication & JWT
│   │   │   ├── users/                # User management & RBAC
│   │   │   ├── branches/             # Multi-branch management
│   │   │   ├── products/             # Products & categories
│   │   │   ├── orders/               # Order management
│   │   │   ├── pos/                  # POS operations
│   │   │   ├── payments/             # Payment processing
│   │   │   ├── reservations/         # Table reservations
│   │   │   ├── inventory/            # Stock management
│   │   │   ├── promotions/           # Discounts & promotions
│   │   │   ├── kds/                  # Kitchen Display System
│   │   │   ├── salon/                # Salon-specific features
│   │   │   ├── ktv/                  # KTV-specific features
│   │   │   ├── staff/                # Staff & shift management
│   │   │   ├── commission/           # Staff commissions
│   │   │   ├── expense/              # Expense tracking
│   │   │   ├── purchase/             # Supplier & purchase orders
│   │   │   ├── reports/              # Analytics & reports
│   │   │   ├── dashboard/            # Dashboard data
│   │   │   └── common/               # Shared utilities
│   │   ├── app.module.ts
│   │   ├── app.controller.ts
│   │   └── main.ts
│   ├── dockerfile
│   ├── docker-compose.yml
│   └── package.json
│
├── client/                           # Next.js Frontend
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── dashboard/
│   │   ├── pos/                      # POS interface
│   │   ├── orders/
│   │   ├── inventory/
│   │   ├── reservations/
│   │   ├── reports/
│   │   ├── staff/
│   │   ├── settings/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   ├── components/                   # Reusable UI components
│   │   ├── POS/
│   │   ├── Layout/
│   │   └── ...
│   ├── hooks/                        # Custom React hooks
│   ├── lib/                          # API clients, utilities
│   ├── stores/                       # Zustand stores
│   ├── types/                        # TypeScript types
│   ├── locales/                      # i18n translations (MM, EN)
│   ├── styles/
│   └── package.json
│
└── docs/
    ├── README.md                     # This file
    ├── ARCHITECTURE.md               # Detailed architecture
    ├── DATABASE.md                   # Database schema
    ├── API.md                        # API documentation
    └── DEPLOYMENT.md                 # Deployment guide
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Docker & Docker Compose (optional)

### Installation

1. **Clone & Install Dependencies**
```bash
cd CafeManage

# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

2. **Configure Environment**
```bash
# Server
cd server
cp .env.example .env
# Edit .env with your database credentials

# Create database
createdb cafemanage
```

3. **Start Development Servers**
```bash
# Terminal 1 - Backend
cd server
npm run start:dev

# Terminal 2 - Frontend
cd client
npm run dev
```

Access the application:
- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/docs

### Using Docker

```bash
docker-compose up -d
```

The application will be available at:
- Frontend: http://localhost:3001
- Backend: http://localhost:3000

## 📋 Core Modules

### Auth Module
- User registration & login
- JWT token management
- Password reset
- Multi-factor authentication (future)

### Products Module
- Product CRUD operations
- Category management
- Pricing management (inclusive/exclusive tax toggle)
- Service charges

### POS Module
- Real-time order creation
- Table management
- Order modifications (split, merge)
- Payment processing
- Receipt generation & printing

### Inventory Module
- Stock level tracking
- Stock movements (IN/OUT/ADJUSTMENT)
- Stock ledger
- Low stock alerts
- Supplier management

### Reports Module
- Sales summaries
- Product performance
- Cashier shift reports
- Profit & Loss analysis
- Sales forecasting
- Export to PDF/Excel

### Staff & Commission
- Staff management & roles
- Shift tracking
- Commission rules & calculations
- Staff performance reports

## 🌐 Language & Localization

The system is fully bilingual:
- **Myanmar (ဒ):** Default language, using proper Unicode support
- **English:** Full English interface available

Users can switch languages in settings. All menus, reports, and documentation support both languages.

## 💳 Payment Integration

Abstracted payment gateway system ready for:
- ✅ Cash
- 🔄 KBZPay (to be integrated)
- 🔄 WavePay (to be integrated)
- 🔄 CBPay (to be integrated)
- 🔄 AyaPay (to be integrated)
- 🔄 MPU Card (to be integrated)
- 🔄 Custom payment methods

## 🔒 Security

- JWT-based authentication
- Role-Based Access Control (RBAC)
- Password hashing with bcrypt
- Soft-delete for data protection
- Audit logging (coming soon)
- API rate limiting (coming soon)

## 🗂️ Database Schema Highlights

### Core Entities
- **Users** - Staff members with roles
- **Branches** - Multi-branch support
- **Products** - Items/services with pricing
- **Orders** - Customer orders with items
- **Payments** - Payment records
- **Inventory** - Stock management
- **Staff Shifts** - Work schedule & tracking
- **Commissions** - Staff earnings tracking
- **Reports** - Transaction records for analytics

## 📈 Next Phase (Phase 2)

- [ ] Advanced reporting (BI dashboard)
- [ ] Mobile POS app (Flutter)
- [ ] Customer loyalty program
- [ ] Table management UI editor
- [ ] Staff app for shift tracking
- [ ] Cloud sync & backup
- [ ] Advanced analytics
- [ ] Multi-language reports
- [ ] Payment gateway integration

## 🤝 Contributing

This is a professional ERP system built for Myanmar businesses. Contributions are welcome.

## 📄 License

MIT

## 📞 Support

For issues, feature requests, or questions:
- GitHub Issues: [Create an issue]
- Email: support@cafemanage.com

---

**Made with ❤️ for Myanmar Businesses**
