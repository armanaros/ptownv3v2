import { formatCurrency } from './formatters';

export const printReceipt = (order) => {
  const html = generateReceiptHTML(order);
  const win = window.open('', '_blank', 'width=360,height=600,toolbar=0,scrollbars=0,status=0');
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt #${order.orderNumber}</title>
        <style>
          @media print { body { margin: 0; } }
          body { margin: 0; background: #fff; }
        </style>
      </head>
      <body>
        ${html}
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
      </body>
    </html>
  `);
  win.document.close();
};

export const generateReceiptHTML = (order) => {
  const items = order.items || [];
  const itemsHTML = items.map((item) =>
    `<tr>
      <td style="text-align:left;padding:2px 0">${item.quantity}x ${item.name}</td>
      <td style="text-align:right;padding:2px 0">${formatCurrency(item.totalPrice || item.unitPrice * item.quantity)}</td>
    </tr>`
  ).join('');

  return `
    <div style="font-family:monospace;font-size:12px;width:280px;padding:10px">
      <div style="text-align:center;margin-bottom:8px">
        <strong style="font-size:16px">P-TOWN</strong><br/>
        <span style="font-size:10px">ALMUSALAN ATBP.</span><br/>
        <span style="font-size:10px">Restaurant POS Receipt</span>
      </div>
      <hr style="border:none;border-top:1px dashed #000"/>
      <div style="margin:4px 0">
        <div>Order: #${String(order.orderNumber || '').padStart(4, '0')}</div>
        <div>Type: ${order.orderType || 'dine-in'}</div>
        ${order.tableNumber ? `<div>Table: ${order.tableNumber}</div>` : ''}
        ${order.customerName ? `<div>Customer: ${order.customerName}</div>` : ''}
        <div>Date: ${new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleString()}</div>
      </div>
      <hr style="border:none;border-top:1px dashed #000"/>
      <table style="width:100%;border-collapse:collapse">
        ${itemsHTML}
      </table>
      <hr style="border:none;border-top:1px dashed #000"/>
      <div style="text-align:right">
        <div>Subtotal: ${formatCurrency(order.subtotal)}</div>
        ${order.discount ? `<div>Discount: -${formatCurrency(order.discount)}</div>` : ''}
        ${order.tax ? `<div>Tax: ${formatCurrency(order.tax)}</div>` : ''}
        <div style="font-size:14px;font-weight:bold;margin-top:4px">Total: ${formatCurrency(order.total)}</div>
      </div>
      <div style="margin-top:4px">Payment: ${order.paymentMethod || 'cash'}</div>
      <hr style="border:none;border-top:1px dashed #000"/>
      <div style="text-align:center;font-size:10px;margin-top:8px">
        Thank you for dining with us!
      </div>
    </div>
  `;
};
