import type { Contact } from '../../../shared/types';

interface Props {
  contact: Contact;
  orderRef: string;
}

export function printContactCard({ contact, orderRef }: Props) {
  const fullName = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || '-';
  const fullAddress = [contact.address, contact.city, contact.postalCode]
    .filter(Boolean)
    .join(', ');
  const phone = contact.phonePro || contact.phoneMobile || '-';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Contacto - ${orderRef}</title>
  <style>
    @page { size: 90mm 55mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; }
    .card {
      width: 90mm; height: 55mm; padding: 4mm 5mm;
      display: flex; flex-direction: column; justify-content: center;
      border: 1px solid #ccc;
    }
    .name { font-size: 14px; font-weight: bold; margin-bottom: 3px; }
    .order-ref { font-size: 9px; color: #888; margin-bottom: 4px; }
    .row { font-size: 11px; line-height: 1.5; color: #333; }
    .label { font-weight: 600; color: #555; }
    @media print {
      body { -webkit-print-color-adjust: exact; }
      .card { border: none; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="name">${fullName}</div>
    <div class="order-ref">Pedido: ${orderRef}</div>
    ${contact.dni ? `<div class="row"><span class="label">DNI:</span> ${contact.dni}</div>` : ''}
    <div class="row"><span class="label">Tel:</span> ${phone}</div>
    ${fullAddress ? `<div class="row"><span class="label">Dir:</span> ${fullAddress}</div>` : ''}
    ${contact.lugarDeEntrega ? `<div class="row"><span class="label">Entrega:</span> ${contact.lugarDeEntrega}</div>` : ''}
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=400,height=300');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
}
