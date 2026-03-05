#!/usr/bin/env node

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const RUN_MUTATION = process.env.RUN_MUTATION === '1';

let token = '';
let cookieHeader = '';
let failures = 0;

function logOk(message) {
  console.log(`OK   ${message}`);
}

function logFail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  const bodyText = await response.text();
  let body = null;
  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = bodyText;
    }
  }
  return { response, body };
}

async function expectStatus(path, expectedStatuses, options, label) {
  const { response, body } = await request(path, options);
  if (!expectedStatuses.includes(response.status)) {
    logFail(`${label} -> status ${response.status}`);
    if (body) {
      console.error('     ', body);
    }
    return null;
  }
  logOk(`${label} -> status ${response.status}`);
  return body;
}

async function login() {
  const { response, body } = await request(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email: ADMIN_USER, password: ADMIN_PASS }),
    },
  );
  if (![200, 201].includes(response.status)) {
    logFail(`Admin login -> status ${response.status}`);
    if (body) console.error('     ', body);
    return false;
  }
  logOk(`Admin login -> status ${response.status}`);

  const setCookie = response.headers.get('set-cookie') || '';
  if (setCookie) {
    const cookies = setCookie
      .split(/,(?=[^;]+=[^;]+)/g)
      .map((chunk) => chunk.split(';')[0].trim())
      .filter(Boolean);
    cookieHeader = cookies.join('; ');
  }

  if (body?.access_token) {
    token = body.access_token;
  }

  if (!token && !cookieHeader) {
    logFail('Missing auth session (no access token and no auth cookies)');
    return false;
  }

  return true;
}

async function runReadChecks() {
  await expectStatus('/auth/profile', [200], { method: 'GET' }, 'Auth profile');
  await expectStatus('/pos/orders', [200], { method: 'GET' }, 'POS orders list');
  await expectStatus('/pos/tables/active', [200], { method: 'GET' }, 'Active tables');
  await expectStatus('/payments/methods', [200], { method: 'GET' }, 'Payment methods');
  await expectStatus('/products?activeOnly=true', [200], { method: 'GET' }, 'Products list');
  await expectStatus('/reports/pnl?period=day', [200], { method: 'GET' }, 'P&L day summary');
  await expectStatus('/reservations', [200], { method: 'GET' }, 'Reservations list');
}

async function runMutationFlow() {
  const products = await expectStatus('/products?activeOnly=true&productType=sellable', [200], { method: 'GET' }, 'Sellable products');
  if (!Array.isArray(products) || products.length === 0) {
    logFail('No sellable products available for mutation flow');
    return;
  }

  const product = products.find((item) => !item.usesBom && Number(item.stockQuantity || 0) > 0) || null;
  if (!product) {
    logFail('No non-BOM sellable product with stock for mutation flow');
    return;
  }

  const paymentMethods = await expectStatus('/payments/methods', [200], { method: 'GET' }, 'Payment methods for mutation');
  if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) {
    logFail('No payment method found for mutation flow');
    return;
  }

  const cashMethod =
    paymentMethods.find((method) => String(method.provider || '').toLowerCase() === 'cash') ||
    paymentMethods[0];

  const createdOrder = await expectStatus(
    '/pos/orders',
    [200, 201],
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'dine_in',
        tableNumber: 99,
        items: [
          {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            price: Number(product.price || 0),
          },
        ],
      }),
    },
    'Create order (mutation flow)',
  );
  if (!createdOrder?.id) {
    logFail('Create order response missing id');
    return;
  }

  const checkoutResult = await expectStatus(
    `/pos/orders/${createdOrder.id}/checkout`,
    [200, 201],
    {
      method: 'POST',
      body: JSON.stringify({
        paymentMethodId: cashMethod.id,
        taxRate: 5,
        discountType: 'none',
        discountValue: 0,
      }),
    },
    'Checkout created order',
  );
  if (!checkoutResult?.order?.id) {
    logFail('Checkout response missing order payload');
    return;
  }
}

async function main() {
  console.log(`Running smoke checks against ${API_URL}`);
  console.log(`Mutation flow: ${RUN_MUTATION ? 'ON' : 'OFF'}`);

  const isLoggedIn = await login();
  if (!isLoggedIn) {
    process.exit(1);
  }

  await runReadChecks();
  if (RUN_MUTATION) {
    await runMutationFlow();
  }

  if (failures > 0) {
    console.error(`\nSmoke checks completed with ${failures} failure(s).`);
    process.exit(1);
  }

  console.log('\nSmoke checks completed successfully.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
