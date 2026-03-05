# QA Smoke Checklist

Use this checklist after major UI/API updates.

## 1) Start app

- Backend: `cd /Users/sithu/Downloads/CafeManage/server && npm run start:dev`
- Frontend: `cd /Users/sithu/Downloads/CafeManage/client && npm run dev -- -p 3001`

## 2) Run automated smoke checks

- Read-only checks:
  - `node /Users/sithu/Downloads/CafeManage/scripts/smoke-check.mjs`
- Include create+checkout mutation flow:
  - `RUN_MUTATION=1 node /Users/sithu/Downloads/CafeManage/scripts/smoke-check.mjs`

NPM shortcuts (from `/Users/sithu/Downloads/CafeManage/server`):

- `npm run smoke:read`
- `npm run smoke:mutation`

Optional env overrides:

- `API_URL=http://localhost:3000`
- `ADMIN_USER=admin`
- `ADMIN_PASS=admin123`

## 3) Manual high-value checks

### POS and Orders

- Waiter account can create table order but cannot checkout.
- Cashier/admin can open order checkout modal, choose payment method, and confirm payment.
- Orders page date filter shows only selected day transactions.
- Waiter name is visible on order rows and transaction details.

### KDS

- Products marked for KDS create kitchen tickets after POS order submit.
- Chef role can update KDS status only.

### Inventory

- Product create works with manual SKU and blank SKU (auto-generate).
- Inventory summary cards open modal with filtered list.
- Low stock / out-of-stock numbers match modal rows.

### Reports

- P&L page filters work for day/month/year.
- Sales transactions and expense transactions list render with selected filter.

### Staff and Roles

- Admin can create/edit/delete users and assign roles.
- Waiter/chef/cashier route restrictions are enforced.

## 4) Final validation

- Logout/login for each role (admin, cashier, waiter, chef).
- Refresh each main page once to verify no runtime crash.
- Check browser console for app-origin errors (ignore extension noise).
