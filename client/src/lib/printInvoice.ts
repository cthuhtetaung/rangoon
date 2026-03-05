export type PrintableReceipt = {
  receiptNumber: string;
  orderNumber: string;
  orderType?: string;
  tableNumber?: number | null;
  cashierName?: string;
  waiterName?: string | null;
  paymentMethod: string;
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  logoLabel?: string;
  printedAt: string;
  subtotal: number;
  discountAmount?: number;
  serviceCharge?: number;
  taxAmount: number;
  totalAmount: number;
  items: Array<{ name: string; qty: number; price: number; total: number }>;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function printInvoice(receipt: PrintableReceipt): void {
  const printWindow = window.open('', '_blank', 'width=420,height=900');
  if (!printWindow) return;

  const businessName = String(receipt.businessName || 'Rangoon F&B').trim();
  const logoLabel = String(
    receipt.logoLabel ||
      businessName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join(''),
  ).slice(0, 3);
  const rows = receipt.items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}. ${escapeHtml(item.name)}</td>
          <td class="right">${item.qty} x ${Number(item.price || 0).toLocaleString()}</td>
          <td class="right">${Number(item.total || 0).toLocaleString()}</td>
        </tr>
      `,
    )
    .join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(receipt.receiptNumber)}</title>
        <style>
          @page { size: 80mm auto; margin: 2mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body {
            margin: 0;
            font-family: "SF Mono", "Menlo", "Consolas", monospace;
            color: #111;
            background: #fff;
            width: 76mm;
            font-size: 12px;
            line-height: 1.35;
          }
          .receipt {
            width: 76mm;
            padding: 2mm;
          }
          .center { text-align: center; }
          .strong { font-weight: 700; }
          .muted { color: #333; font-size: 11px; }
          .line {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 2px 0;
            vertical-align: top;
          }
          th {
            text-align: left;
            font-size: 11px;
          }
          .right { text-align: right; white-space: nowrap; }
          .summary .row {
            display: flex;
            justify-content: space-between;
            padding: 1px 0;
          }
          .total {
            font-size: 14px;
            font-weight: 700;
          }
          .foot {
            margin-top: 8px;
            text-align: center;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <main class="receipt">
          <div class="center strong">${escapeHtml(businessName)}</div>
          ${receipt.businessPhone ? `<div class="center muted">${escapeHtml(receipt.businessPhone)}</div>` : ''}
          ${receipt.businessAddress ? `<div class="center muted">${escapeHtml(receipt.businessAddress)}</div>` : ''}
          <div class="center muted">${escapeHtml(logoLabel || 'OX')} | RECEIPT</div>
          <div class="line"></div>

          <div class="muted">Receipt: ${escapeHtml(receipt.receiptNumber)}</div>
          <div class="muted">Order: ${escapeHtml(receipt.orderNumber)}</div>
          <div class="muted">Date: ${new Date(receipt.printedAt).toLocaleString()}</div>
          <div class="muted">Table: ${receipt.tableNumber || '-'}</div>
          <div class="muted">Type: ${escapeHtml((receipt.orderType || 'dine_in').replace('_', ' '))}</div>
          <div class="muted">Cashier: ${escapeHtml(receipt.cashierName || 'Counter')}</div>
          <div class="muted">Waiter: ${escapeHtml(receipt.waiterName || '-')}</div>
          <div class="muted">Pay: ${escapeHtml(receipt.paymentMethod)}</div>

          <div class="line"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="right">Qty x Price</th>
                <th class="right">Amt</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="line"></div>

          <section class="summary">
            <div class="row"><span>Subtotal</span><span>${Number(receipt.subtotal || 0).toLocaleString()} MMK</span></div>
            <div class="row"><span>Discount</span><span>- ${Number(receipt.discountAmount || 0).toLocaleString()} MMK</span></div>
            <div class="row"><span>Service</span><span>${Number(receipt.serviceCharge || 0).toLocaleString()} MMK</span></div>
            <div class="row"><span>Tax</span><span>${Number(receipt.taxAmount || 0).toLocaleString()} MMK</span></div>
            <div class="line"></div>
            <div class="row total"><span>TOTAL</span><span>${Number(receipt.totalAmount || 0).toLocaleString()} MMK</span></div>
          </section>

          <div class="line"></div>
          <p class="foot">Thank you. See you again!</p>
        </main>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
