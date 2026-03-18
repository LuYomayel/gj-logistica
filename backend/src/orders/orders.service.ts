import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, FindOptionsWhere } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderLine } from '../entities/order-line.entity';
import { OrderSequence } from '../entities/order-sequence.entity';
import { ProductStock } from '../entities/product-stock.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { Product } from '../entities/product.entity';
import { OrderContact } from '../entities/order-contact.entity';
import { Contact } from '../entities/contact.entity';
import { CreateOrderDto, AddOrderLineDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { FilterOrderDto, OrderStatsDto } from './dto/filter-order.dto';
import { NotificationsService } from '../notifications/notifications.service';

export interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderStatsByMonth {
  year: number;
  month: number;
  count: number;
  totalQuantity: number;
}

export interface OrderStatsByStatus {
  status: number;
  count: number;
}

export interface OrderStatsResult {
  byMonth: OrderStatsByMonth[];
  byStatus: OrderStatsByStatus[];
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderLine) private lineRepo: Repository<OrderLine>,
    @InjectRepository(ProductStock) private stockRepo: Repository<ProductStock>,
    @InjectRepository(OrderContact) private orderContactRepo: Repository<OrderContact>,
    @InjectRepository(Contact) private contactRepo: Repository<Contact>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(filter: FilterOrderDto, tenantId: number | null): Promise<PaginatedOrders> {
    const { status, thirdPartyId, warehouseId, isDraft, ref, clientRef, dateFrom, dateTo, page = 1, limit = 50 } = filter;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.thirdParty', 'tp')
      .leftJoinAndSelect('o.createdBy', 'cb')
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status !== undefined) qb.andWhere('o.status = :status', { status });
    if (thirdPartyId) qb.andWhere('o.thirdPartyId = :thirdPartyId', { thirdPartyId });
    if (warehouseId) qb.andWhere('o.warehouseId = :warehouseId', { warehouseId });
    if (isDraft !== undefined) qb.andWhere('o.isDraft = :isDraft', { isDraft });
    if (ref) qb.andWhere('o.ref LIKE :ref', { ref: `%${ref}%` });
    if (clientRef) qb.andWhere('o.clientRef LIKE :clientRef', { clientRef: `%${clientRef}%` });
    if (dateFrom) qb.andWhere('o.orderDate >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('o.orderDate <= :dateTo', { dateTo });
    if (tenantId !== null) qb.andWhere('o.entity = :tenantId', { tenantId });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number, tenantId?: number | null): Promise<Order> {
    const where: FindOptionsWhere<Order> = { id };
    if (tenantId !== null && tenantId !== undefined) where.entity = tenantId;
    const order = await this.orderRepo.findOne({
      where,
      relations: ['thirdParty', 'lines', 'lines.product', 'warehouse', 'createdBy', 'validatedBy'],
    });
    if (!order) throw new NotFoundException(`Pedido #${id} no encontrado`);
    return order;
  }

  async create(dto: CreateOrderDto, createdByUserId: number, tenantId: number | null): Promise<Order> {
    const { lines, ...orderData } = dto;

    // Save with a temporary unique ref; will be replaced on validate
    const tempRef = `BORD${Date.now()}${Math.floor(Math.random() * 9999)}`;
    const order = await this.orderRepo.save(
      this.orderRepo.create({
        ...orderData,
        ref: tempRef,
        status: 0,
        isDraft: true,
        createdByUserId,
        orderDate: dto.orderDate ?? new Date(),
        entity: tenantId ?? 1,
      }),
    );

    // Stable draft ref using the DB-assigned id
    await this.orderRepo.update(order.id, { ref: `BORRADOR-${order.id}` });

    if (lines?.length) {
      const lineEntities = lines.map((l, i) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.lineRepo.create({ ...(l as any), orderId: order.id, position: l.position ?? i }) as unknown as import('../entities/order-line.entity').OrderLine,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.lineRepo.save(lineEntities as any);
    }

    return this.findOne(order.id);
  }

  async update(id: number, dto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status !== 0) {
      throw new BadRequestException('Solo se pueden editar pedidos en borrador');
    }
    const { lines: _lines, ...orderData } = dto;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.orderRepo.update(id, orderData as any);
    return this.findOne(id);
  }

  async addLine(orderId: number, dto: AddOrderLineDto): Promise<Order> {
    const order = await this.findOne(orderId);
    if (order.status !== 0) {
      throw new BadRequestException('Solo se pueden agregar líneas a pedidos en borrador');
    }

    // ── Stock check: if the order has a warehouse and a product, verify availability ──
    if (dto.productId && order.warehouseId) {
      const ps = await this.stockRepo.findOne({
        where: { warehouseId: order.warehouseId, productId: dto.productId },
      });
      const available = ps?.quantity ?? 0;
      const requestedQty = dto.quantity ?? 1;

      if (available < requestedQty) {
        throw new BadRequestException(
          `Stock insuficiente para el producto #${dto.productId}. ` +
          `Disponible en almacén: ${available}, solicitado: ${requestedQty}`,
        );
      }
    }

    const existingLines = await this.lineRepo.find({ where: { orderId } });
    const position = dto.position ?? existingLines.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.lineRepo.save(this.lineRepo.create({ ...(dto as any), orderId, position }));
    return this.findOne(orderId);
  }

  async removeLine(orderId: number, lineId: number): Promise<Order> {
    const order = await this.findOne(orderId);
    if (order.status !== 0) {
      throw new BadRequestException('Solo se pueden eliminar líneas de pedidos en borrador');
    }
    await this.lineRepo.delete({ id: lineId, orderId });
    return this.findOne(orderId);
  }

  /**
   * Validate order: atomically decrement stock, generate SOyymm-nnnn ref, flip status.
   */
  async validateOrder(id: number, userId: number): Promise<Order> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const orderRepo = qr.manager.getRepository(Order);
      const lineRepo = qr.manager.getRepository(OrderLine);
      const stockRepo = qr.manager.getRepository(ProductStock);
      const movRepo = qr.manager.getRepository(StockMovement);
      const prodRepo = qr.manager.getRepository(Product);

      const order = await orderRepo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new NotFoundException(`Pedido #${id} no encontrado`);
      if (order.status !== 0) throw new BadRequestException('Solo se pueden validar pedidos en borrador');

      const warehouseId = order.warehouseId;
      if (!warehouseId) throw new BadRequestException('El pedido debe tener un almacén asignado antes de validar');

      const lines = await lineRepo.find({ where: { orderId: id } });

      // ── 1+2. Atomic check+decrement stock per line (single loop) ────────
      for (const line of lines) {
        if (!line.productId) continue;

        // Lock, check and decrement in one pass — no race condition
        const ps = await stockRepo.findOne({
          where: { warehouseId, productId: line.productId },
          lock: { mode: 'pessimistic_write' },
        });
        const available = ps?.quantity ?? 0;
        if (available < line.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para producto #${line.productId}: disponible ${available}, requerido ${line.quantity}`,
          );
        }

        // Decrement immediately while holding the lock
        if (ps) {
          ps.quantity -= line.quantity;
          await stockRepo.save(ps);
        }

        // Mirror on products.stock
        await prodRepo.decrement({ id: line.productId }, 'stock', line.quantity);

        const movement = movRepo.create({
          warehouseId,
          productId: line.productId,
          quantity: -line.quantity,
          movementType: 1, // order
          originType: 'order',
          originId: id,
          label: `Pedido #${id}`,
          createdByUserId: userId,
          movedAt: new Date(),
        });
        await movRepo.save(movement);
      }

      // ── 3. Generate SOyymm-nnnn ref ────────────────────────────────────────
      const ref = await this.generateOrderRef(qr);

      // ── 4. Flip order status ───────────────────────────────────────────────
      await orderRepo.update(id, {
        status: 1,
        isDraft: false,
        ref,
        validatedAt: new Date(),
        validatedByUserId: userId,
      });

      await qr.commitTransaction();
      const validatedOrder = await this.findOne(id);

      // Fire-and-forget: generate PDF + send email after commit (non-blocking)
      void this.notificationsService.sendOrderEvent('ORDER_VALIDATE', validatedOrder);

      return validatedOrder;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  /**
   * Cancel order. If already validated, reverse stock.
   */
  async cancelOrder(id: number, userId: number): Promise<Order> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const orderRepo = qr.manager.getRepository(Order);
      const lineRepo = qr.manager.getRepository(OrderLine);
      const stockRepo = qr.manager.getRepository(ProductStock);
      const movRepo = qr.manager.getRepository(StockMovement);
      const prodRepo = qr.manager.getRepository(Product);

      const order = await orderRepo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new NotFoundException(`Pedido #${id} no encontrado`);
      if (order.status === -1) throw new BadRequestException('El pedido ya está cancelado');
      if (order.status === 3) throw new BadRequestException('No se puede cancelar un pedido despachado');

      // If order was validated, reverse stock
      if (order.status >= 1) {
        const warehouseId = order.warehouseId;
        const lines = await lineRepo.find({ where: { orderId: id } });

        for (const line of lines) {
          if (!line.productId || !warehouseId) continue;

          let ps = await stockRepo.findOne({ where: { warehouseId, productId: line.productId } });
          if (ps) {
            ps.quantity += line.quantity;
            await stockRepo.save(ps);
          } else {
            ps = stockRepo.create({ warehouseId, productId: line.productId, quantity: line.quantity });
            await stockRepo.save(ps);
          }

          // Update mirror (increment back)
          await prodRepo.increment({ id: line.productId }, 'stock', line.quantity);

          const movement = movRepo.create({
            warehouseId,
            productId: line.productId,
            quantity: line.quantity, // positive = return to stock
            movementType: 1,
            originType: 'order_cancel',
            originId: id,
            label: `Cancelación pedido ${order.ref}`,
            createdByUserId: userId,
            movedAt: new Date(),
          });
          await movRepo.save(movement);
        }
      }

      await orderRepo.update(id, { status: -1 });
      await qr.commitTransaction();
      return this.findOne(id);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  /**
   * Mark order as delivered (status=3). Triggers ORDER_CLOSE notification.
   */
  async shipOrder(id: number): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status < 1 || order.status === -1) {
      throw new BadRequestException('El pedido debe estar validado antes de poder despacharlo');
    }
    if (order.status === 3) {
      throw new BadRequestException('El pedido ya fue despachado');
    }
    await this.orderRepo.update(id, { status: 3 });
    const shipped = await this.findOne(id);

    // Fire-and-forget: generate PDF + send email (non-blocking)
    void this.notificationsService.sendOrderEvent('ORDER_CLOSE', shipped);

    return shipped;
  }

  /**
   * Advance to IN_PROGRESS (status=2).
   */
  async progressOrder(id: number): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status !== 1) {
      throw new BadRequestException('El pedido debe estar validado para pasar a en proceso');
    }
    await this.orderRepo.update(id, { status: 2 });
    return this.findOne(id);
  }

  /**
   * Estadísticas de pedidos: desglose por mes/año y por estado.
   */
  async getStats(filter: OrderStatsDto, tenantId: number | null): Promise<OrderStatsResult> {
    const { year, thirdPartyId, status, createdByUserId } = filter;

    // ── Por mes/año ────────────────────────────────────────────────────
    const monthQb = this.orderRepo
      .createQueryBuilder('o')
      .select([
        'YEAR(o.orderDate) AS year',
        'MONTH(o.orderDate) AS month',
        'COUNT(o.id) AS count',
        'COALESCE(SUM(ol.quantity), 0) AS totalQuantity',
      ])
      .leftJoin('o.lines', 'ol');

    if (year) monthQb.andWhere('YEAR(o.orderDate) = :year', { year });
    if (thirdPartyId) monthQb.andWhere('o.thirdPartyId = :thirdPartyId', { thirdPartyId });
    if (status !== undefined) monthQb.andWhere('o.status = :status', { status });
    if (createdByUserId) monthQb.andWhere('o.createdByUserId = :createdByUserId', { createdByUserId });
    if (tenantId !== null) monthQb.andWhere('o.entity = :tenantId', { tenantId });

    monthQb
      .groupBy('YEAR(o.orderDate), MONTH(o.orderDate)')
      .orderBy('YEAR(o.orderDate)', 'DESC')
      .addOrderBy('MONTH(o.orderDate)', 'DESC');

    const monthRows = await monthQb.getRawMany();

    // ── Por estado ─────────────────────────────────────────────────────
    const statusQb = this.orderRepo
      .createQueryBuilder('o')
      .select(['o.status AS status', 'COUNT(o.id) AS count']);

    if (year) statusQb.andWhere('YEAR(o.orderDate) = :year', { year });
    if (thirdPartyId) statusQb.andWhere('o.thirdPartyId = :thirdPartyId', { thirdPartyId });
    if (createdByUserId) statusQb.andWhere('o.createdByUserId = :createdByUserId', { createdByUserId });
    if (tenantId !== null) statusQb.andWhere('o.entity = :tenantId', { tenantId });

    statusQb.groupBy('o.status').orderBy('o.status', 'ASC');

    const statusRows = await statusQb.getRawMany();

    return {
      byMonth: monthRows.map((r) => ({
        year: Number(r.year),
        month: Number(r.month),
        count: Number(r.count),
        totalQuantity: Number(r.totalQuantity),
      })),
      byStatus: statusRows.map((r) => ({
        status: Number(r.status),
        count: Number(r.count),
      })),
    };
  }

  /**
   * Clone an order: creates a new BORRADOR with same lines/header.
   */
  async cloneOrder(id: number, createdByUserId: number, tenantId: number | null): Promise<Order> {
    const original = await this.findOne(id);

    const tempRef = `BORD${Date.now()}${Math.floor(Math.random() * 9999)}`;
    const newOrder = await this.orderRepo.save(
      this.orderRepo.create({
        thirdPartyId: original.thirdPartyId,
        warehouseId: original.warehouseId ?? undefined,
        clientRef: original.clientRef ?? undefined,
        publicNote: original.publicNote ?? undefined,
        privateNote: original.privateNote ?? undefined,
        agencia: original.agencia ?? undefined,
        nroSeguimiento: undefined,
        ref: tempRef,
        status: 0,
        isDraft: true,
        createdByUserId,
        orderDate: new Date(),
        entity: tenantId ?? 1,
      }),
    );
    await this.orderRepo.update(newOrder.id, { ref: `BORRADOR-${newOrder.id}` });

    if (original.lines?.length) {
      const lineEntities = (original.lines as OrderLine[]).map((l, i) =>
        this.lineRepo.create({
          orderId: newOrder.id,
          productId: l.productId ?? undefined,
          label: l.label ?? undefined,
          description: l.description ?? undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice ?? undefined,
          discountPercent: l.discountPercent ?? undefined,
          position: i,
        }),
      );
      await this.lineRepo.save(lineEntities);
    }

    return this.findOne(newOrder.id);
  }

  /**
   * Reopen a cancelled or shipped order.
   * CANCELADO (-1) → BORRADOR (0): stock was already reversed on cancel.
   * DESPACHADO (3) → VALIDADO (1): undo shipment.
   */
  async reopenOrder(id: number): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status === -1) {
      await this.orderRepo.update(id, { status: 0, isDraft: true });
    } else if (order.status === 3) {
      await this.orderRepo.update(id, { status: 1 });
    } else {
      throw new BadRequestException('Solo se pueden reabrir pedidos cancelados o despachados');
    }
    return this.findOne(id);
  }

  /**
   * Export all orders (with lines) as a UTF-8 CSV string.
   */
  async exportCsv(filter: FilterOrderDto, tenantId: number | null): Promise<string> {
    const { status, thirdPartyId, dateFrom, dateTo, clientRef } = filter;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.thirdParty', 'tp')
      .leftJoinAndSelect('o.lines', 'l')
      .leftJoinAndSelect('l.product', 'p')
      .orderBy('o.createdAt', 'DESC');

    if (status !== undefined) qb.andWhere('o.status = :status', { status });
    if (thirdPartyId) qb.andWhere('o.thirdPartyId = :thirdPartyId', { thirdPartyId });
    if (dateFrom) qb.andWhere('o.orderDate >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('o.orderDate <= :dateTo', { dateTo });
    if (clientRef) qb.andWhere('o.clientRef LIKE :clientRef', { clientRef: `%${clientRef}%` });
    if (tenantId !== null) qb.andWhere('o.entity = :tenantId', { tenantId });

    const orders = await qb.getMany();

    const statusLabel: Record<number, string> = {
      '-1': 'Cancelado', 0: 'Borrador', 1: 'Validado', 2: 'En Proceso', 3: 'Despachado',
    };

    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const fmtDate = (d: string | Date | null | undefined) =>
      d ? new Date(d as string).toLocaleDateString('es-AR') : '';

    const headers = [
      'Id', 'Ref.', 'Fecha Creación', 'Ref. Cliente', 'Tercero', 'Estado',
      'Total Neto', 'Agencia', 'Nro. Seguimiento', 'Nota',
      'ID Línea', 'Ref. Producto', 'Etiqueta del Producto', 'Cantidad',
      'SubRubro', 'Marca',
    ];
    const rows: string[] = [headers.map(q).join(',')];

    for (const o of orders) {
      const orderBase = [
        o.id, o.ref, fmtDate(o.createdAt), o.clientRef ?? '',
        o.thirdParty?.name ?? '', statusLabel[o.status] ?? o.status,
        o.totalHT ?? '', o.agencia ?? '', o.nroSeguimiento ?? '', o.publicNote ?? '',
      ];

      if (!o.lines?.length) {
        rows.push([...orderBase, '', '', '', '', '', ''].map(q).join(','));
      } else {
        for (const l of o.lines as OrderLine[]) {
          rows.push([
            ...orderBase,
            l.id, l.product?.ref ?? '', l.product?.label ?? l.label ?? '', l.quantity,
            l.product?.subrubro ?? '', l.product?.marca ?? '',
          ].map(q).join(','));
        }
      }
    }
    return rows.join('\n');
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async generateOrderRef(qr: QueryRunner): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${yy}${mm}`;

    // Atomic sequence: LAST_INSERT_ID() is connection-local, no race condition
    await qr.manager.query(
      'INSERT INTO order_sequences (yearMonth, currentSeq) VALUES (?, LAST_INSERT_ID(1)) ' +
      'ON DUPLICATE KEY UPDATE currentSeq = LAST_INSERT_ID(currentSeq + 1)',
      [yearMonth],
    );

    const [row] = await qr.manager.query('SELECT LAST_INSERT_ID() AS seq');

    return `SO${yearMonth}-${String(row.seq).padStart(4, '0')}`;
  }

  // ── Order Contacts ────────────────────────────────────────

  async getOrderContacts(orderId: number): Promise<OrderContact[]> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Pedido ${orderId} no encontrado`);
    return this.orderContactRepo.find({
      where: { orderId },
      relations: ['contact'],
      order: { id: 'ASC' },
    });
  }

  async assignContact(orderId: number, contactId: number, role?: string): Promise<OrderContact> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Pedido ${orderId} no encontrado`);

    const contact = await this.contactRepo.findOne({ where: { id: contactId } });
    if (!contact) throw new NotFoundException(`Contacto ${contactId} no encontrado`);

    const existing = await this.orderContactRepo.findOne({ where: { orderId, contactId } });
    if (existing) throw new BadRequestException('Este contacto ya está asignado al pedido');

    const oc = this.orderContactRepo.create({ orderId, contactId, role: role ?? null });
    return this.orderContactRepo.save(oc);
  }

  async removeContact(orderId: number, contactId: number): Promise<void> {
    const oc = await this.orderContactRepo.findOne({ where: { orderId, contactId } });
    if (!oc) throw new NotFoundException('Asignación de contacto no encontrada');
    await this.orderContactRepo.remove(oc);
  }
}
