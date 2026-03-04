import { Order } from '../entities/order.entity';
import { OrderLine } from '../entities/order-line.entity';

const STATUS_LABEL: Record<number, string> = {
  '-1': 'Cancelado',
  0: 'Borrador',
  1: 'Validado',
  2: 'En Proceso',
  3: 'Despachado',
};

const STATUS_COLORS: Record<number, { bg: string; text: string }> = {
  '-1': { bg: '#fee2e2', text: '#dc2626' },
  0: { bg: '#f1f5f9', text: '#475569' },
  1: { bg: '#dcfce7', text: '#16a34a' },
  2: { bg: '#dbeafe', text: '#2563eb' },
  3: { bg: '#ede9fe', text: '#7c3aed' },
};

function esc(value: string | null | undefined): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  };
  return String(value ?? '').replace(/[&<>"']/g, (c) => map[c] ?? c);
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d as string).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtNum(n: number): string {
  return n.toLocaleString('es-AR');
}

export function buildOrderPdfHtml(order: Order): string {
  const lines = (order.lines ?? []) as OrderLine[];
  const statusColor = STATUS_COLORS[order.status] ?? STATUS_COLORS[0];
  const statusLabel = STATUS_LABEL[order.status] ?? String(order.status);

  const thirdPartyName = esc((order.thirdParty as { name?: string })?.name ?? `Cliente #${order.thirdPartyId}`);
  const warehouseName  = esc((order.warehouse as { name?: string })?.name ?? '—');
  const validatedByUser = order.validatedBy as { firstName?: string; lastName?: string } | null;
  const validatedByName = validatedByUser
    ? esc(`${validatedByUser.firstName ?? ''} ${validatedByUser.lastName ?? ''}`.trim())
    : null;

  const totalQty = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);

  // ── Lines table rows ─────────────────────────────────────────────────────
  const linesHtml = lines.length
    ? lines
        .map((l, i) => {
          const product = l.product as { ref?: string; label?: string } | null;
          const ref   = product?.ref  ?? '—';
          const label = product?.label ?? l.label ?? '—';
          const bg    = i % 2 === 0 ? '#ffffff' : '#f8fafc';
          return `
        <tr style="background:${bg};">
          <td style="padding:11px 16px; border-bottom:1px solid #e2e8f0; vertical-align:middle;">
            <span style="display:inline-block; background:#e0f2fe; color:#0369a1; padding:2px 9px; border-radius:5px; font-size:11px; font-family:monospace; font-weight:700; letter-spacing:0.3px;">${esc(ref)}</span>
          </td>
          <td style="padding:11px 16px; border-bottom:1px solid #e2e8f0; color:#1e293b; font-size:13px; vertical-align:middle;">${esc(label)}</td>
          <td style="padding:11px 16px; border-bottom:1px solid #e2e8f0; text-align:center; vertical-align:middle;">
            <span style="font-size:17px; font-weight:800; color:#0e7490;">${fmtNum(l.quantity ?? 0)}</span>
          </td>
        </tr>`;
        })
        .join('')
    : `<tr><td colspan="3" style="padding:24px; text-align:center; color:#94a3b8; font-size:13px;">Sin líneas</td></tr>`;

  // ── Extra fields block ───────────────────────────────────────────────────
  const extraChips: string[] = [];
  if (order.agencia) {
    extraChips.push(`
      <div style="background:#f1f5f9; border:1px solid #e2e8f0; border-radius:10px; padding:12px 18px; min-width:160px;">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-bottom:4px;">Agencia de envío</div>
        <div style="font-size:14px; font-weight:700; color:#0f172a;">${esc(order.agencia)}</div>
      </div>`);
  }
  if (order.nroSeguimiento) {
    extraChips.push(`
      <div style="background:#f1f5f9; border:1px solid #e2e8f0; border-radius:10px; padding:12px 18px; min-width:160px;">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-bottom:4px;">Nro. de seguimiento</div>
        <div style="font-size:14px; font-weight:700; color:#0f172a; font-family:monospace;">${esc(order.nroSeguimiento)}</div>
      </div>`);
  }
  const extraBlock = extraChips.length
    ? `<div style="display:flex; gap:14px; flex-wrap:wrap; margin-top:24px;">${extraChips.join('')}</div>`
    : '';

  // ── Notes block ──────────────────────────────────────────────────────────
  const notesBlock = order.publicNote
    ? `<div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:16px 20px; margin-top:24px;">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#92400e; margin-bottom:8px;">Notas del pedido</div>
        <p style="margin:0; font-size:13px; color:#78350f; line-height:1.7; white-space:pre-wrap;">${esc(order.publicNote)}</p>
       </div>`
    : '';

  const generatedAt = new Date().toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: #1e293b;
      font-size: 14px;
      background: #ffffff;
    }
    @page { size: A4; margin: 0; }
  </style>
</head>
<body>

  <!-- ═══ HEADER ═════════════════════════════════════════════════════════ -->
  <div style="background:linear-gradient(135deg, #0e7490 0%, #06b6d4 100%); color:white; padding:32px 44px; display:flex; justify-content:space-between; align-items:center;">
    <div>
      <div style="font-size:30px; font-weight:900; letter-spacing:-1px; text-shadow:0 1px 2px rgba(0,0,0,0.15);">DEPÓSITO</div>
      <div style="font-size:11px; text-transform:uppercase; letter-spacing:3px; opacity:0.85; margin-top:5px; font-weight:600;">Pedido de Venta</div>
    </div>
    <div style="background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.35); backdrop-filter:blur(4px); padding:14px 22px; border-radius:12px; text-align:right;">
      <div style="font-size:10px; text-transform:uppercase; letter-spacing:1.5px; opacity:0.8; margin-bottom:5px;">Número de Pedido</div>
      <div style="font-size:24px; font-weight:800; letter-spacing:0.5px;">${esc(order.ref)}</div>
    </div>
  </div>

  <!-- ═══ DECORATIVE STRIP ════════════════════════════════════════════════ -->
  <div style="height:4px; background:linear-gradient(90deg, #0e7490, #06b6d4, #67e8f9);"></div>

  <!-- ═══ CONTENT ════════════════════════════════════════════════════════ -->
  <div style="padding:32px 44px;">

    <!-- INFO GRID (2 cards) -->
    <div style="display:flex; gap:20px; margin-bottom:30px;">

      <!-- Card: Pedido -->
      <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:20px 22px;">
        <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:2px; color:#0891b2; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #e2e8f0;">
          Información del Pedido
        </div>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="color:#64748b; font-size:12px; padding:5px 0; width:110px;">Referencia</td>
            <td style="font-weight:700; color:#0f172a; font-size:13px; text-align:right;">${esc(order.ref)}</td>
          </tr>
          <tr>
            <td style="color:#64748b; font-size:12px; padding:5px 0;">Fecha</td>
            <td style="font-weight:600; color:#0f172a; font-size:13px; text-align:right;">${fmtDate(order.orderDate)}</td>
          </tr>
          ${order.clientRef ? `<tr>
            <td style="color:#64748b; font-size:12px; padding:5px 0;">Ref. Cliente</td>
            <td style="font-weight:600; color:#0f172a; font-size:13px; text-align:right;">${esc(order.clientRef)}</td>
          </tr>` : ''}
          <tr>
            <td style="color:#64748b; font-size:12px; padding:5px 0;">Estado</td>
            <td style="text-align:right; padding:5px 0;">
              <span style="display:inline-block; background:${statusColor.bg}; color:${statusColor.text}; font-size:11px; font-weight:700; padding:3px 12px; border-radius:20px;">
                ${statusLabel}
              </span>
            </td>
          </tr>
          ${order.validatedAt ? `<tr>
            <td style="color:#64748b; font-size:12px; padding:5px 0;">Validado el</td>
            <td style="font-weight:600; color:#0f172a; font-size:13px; text-align:right;">${fmtDate(order.validatedAt)}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Card: Destino -->
      <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:20px 22px;">
        <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:2px; color:#0891b2; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #e2e8f0;">
          Cliente / Destino
        </div>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="color:#64748b; font-size:12px; padding:5px 0; width:110px;">Cliente</td>
            <td style="font-weight:700; color:#0f172a; font-size:13px; text-align:right;">${thirdPartyName}</td>
          </tr>
          <tr>
            <td style="color:#64748b; font-size:12px; padding:5px 0;">Almacén</td>
            <td style="font-weight:600; color:#0f172a; font-size:13px; text-align:right;">${warehouseName}</td>
          </tr>
          ${order.deliveryDate ? `<tr>
            <td style="color:#64748b; font-size:12px; padding:5px 0;">Entrega</td>
            <td style="font-weight:600; color:#0f172a; font-size:13px; text-align:right;">${fmtDate(order.deliveryDate)}</td>
          </tr>` : ''}
          ${validatedByName ? `<tr>
            <td style="color:#64748b; font-size:12px; padding:5px 0;">Validado por</td>
            <td style="font-weight:600; color:#0f172a; font-size:13px; text-align:right;">${validatedByName}</td>
          </tr>` : ''}
        </table>
      </div>

    </div>

    <!-- LINES SECTION HEADER -->
    <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:2px; color:#0891b2; margin-bottom:12px;">
      Líneas del Pedido
    </div>

    <!-- LINES TABLE -->
    <table style="width:100%; border-collapse:collapse; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0;">
      <thead>
        <tr style="background:linear-gradient(90deg, #0e7490, #0891b2);">
          <th style="padding:12px 16px; text-align:left; color:white; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; width:140px;">Ref. Producto</th>
          <th style="padding:12px 16px; text-align:left; color:white; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Descripción</th>
          <th style="padding:12px 16px; text-align:center; color:white; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; width:110px;">Cantidad</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    <!-- TOTALS BAR -->
    ${lines.length > 0 ? `
    <div style="background:linear-gradient(135deg, #f0fdff, #ecfeff); border:1px solid #a5f3fc; border-radius:10px; padding:14px 20px; margin-top:14px; display:flex; justify-content:flex-end; align-items:center; gap:8px;">
      <span style="color:#0e7490; font-size:13px;">Total:</span>
      <span style="font-size:22px; font-weight:900; color:#0e7490;">${fmtNum(totalQty)}</span>
      <span style="color:#0891b2; font-size:13px;">unidades&nbsp;·&nbsp;${fmtNum(lines.length)} línea${lines.length !== 1 ? 's' : ''}</span>
    </div>` : ''}

    <!-- EXTRA FIELDS -->
    ${extraBlock}

    <!-- NOTES -->
    ${notesBlock}

  </div>

  <!-- ═══ FOOTER ══════════════════════════════════════════════════════════ -->
  <div style="margin-top:32px; padding:18px 44px; background:#f8fafc; border-top:2px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
    <div style="font-size:11px; color:#94a3b8;">Generado el ${generatedAt}</div>
    <div style="font-size:11px; color:#94a3b8; font-weight:600; color:#0891b2;">GJ Logística — Sistema de Gestión de Depósito</div>
  </div>

</body>
</html>`;
}
