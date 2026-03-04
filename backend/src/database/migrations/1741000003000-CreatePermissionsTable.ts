import { MigrationInterface, QueryRunner } from 'typeorm';

/** Full permission catalog seeded here (~48 permissions). */
const PERMISSIONS: Array<{
  module: string;
  action: string;
  label: string;
  isAdvanced: boolean;
}> = [
  // ── Users ─────────────────────────────────────────────────────────────────
  { module: 'users', action: 'read',              label: 'Consultar usuarios',                                isAdvanced: false },
  { module: 'users', action: 'read_permissions',  label: 'Consultar permisos de otros usuarios',             isAdvanced: true  },
  { module: 'users', action: 'write',             label: 'Crear/modificar usuarios y sus permisos',          isAdvanced: false },
  { module: 'users', action: 'write_external',    label: 'Crear/modificar únicamente usuarios externos',     isAdvanced: true  },
  { module: 'users', action: 'write_password',    label: 'Modificar contraseña de otros usuarios',           isAdvanced: false },
  { module: 'users', action: 'delete',            label: 'Eliminar o desactivar otros usuarios',             isAdvanced: false },
  { module: 'users', action: 'read_own_perms',    label: 'Consultar propios permisos',                       isAdvanced: true  },
  { module: 'users', action: 'write_own_info',    label: 'Crear/modificar propia info de usuario',           isAdvanced: false },
  { module: 'users', action: 'write_own_password',label: 'Modificar propia contraseña',                      isAdvanced: false },
  { module: 'users', action: 'write_own_perms',   label: 'Modificar propios permisos',                       isAdvanced: true  },
  { module: 'users', action: 'read_groups',       label: 'Consultar grupos',                                 isAdvanced: true  },
  { module: 'users', action: 'read_group_perms',  label: 'Consultar permisos de grupos',                     isAdvanced: true  },
  { module: 'users', action: 'write_groups',      label: 'Crear/modificar grupos y sus permisos',            isAdvanced: true  },
  { module: 'users', action: 'delete_groups',     label: 'Eliminar o desactivar grupos',                     isAdvanced: true  },
  { module: 'users', action: 'export',            label: 'Exportar usuarios',                                isAdvanced: false },

  // ── Third parties ─────────────────────────────────────────────────────────
  { module: 'third_parties', action: 'read',          label: 'Consultar empresas',                           isAdvanced: false },
  { module: 'third_parties', action: 'write',         label: 'Crear/modificar empresas',                     isAdvanced: false },
  { module: 'third_parties', action: 'delete',        label: 'Eliminar empresas',                            isAdvanced: false },
  { module: 'third_parties', action: 'export',        label: 'Exportar empresas',                            isAdvanced: false },
  { module: 'third_parties', action: 'write_payment', label: 'Crear/modificar información de pago',          isAdvanced: true  },
  { module: 'third_parties', action: 'expand_access', label: 'Ampliar acceso a todos los terceros',          isAdvanced: true  },

  // ── Contacts ──────────────────────────────────────────────────────────────
  { module: 'contacts', action: 'read',   label: 'Consultar contactos',         isAdvanced: false },
  { module: 'contacts', action: 'write',  label: 'Crear/modificar contactos',   isAdvanced: false },
  { module: 'contacts', action: 'delete', label: 'Eliminar contactos',          isAdvanced: false },
  { module: 'contacts', action: 'export', label: 'Exportar contactos',          isAdvanced: false },

  // ── Orders ────────────────────────────────────────────────────────────────
  { module: 'orders', action: 'read',          label: 'Consultar pedidos de clientes',            isAdvanced: false },
  { module: 'orders', action: 'write',         label: 'Crear/modificar pedidos de clientes',       isAdvanced: false },
  { module: 'orders', action: 'validate',      label: 'Validar pedidos de clientes',               isAdvanced: true  },
  { module: 'orders', action: 'generate_docs', label: 'Generar documentos de órdenes de venta',   isAdvanced: true  },
  { module: 'orders', action: 'send',          label: 'Enviar pedidos de clientes',                isAdvanced: true  },
  { module: 'orders', action: 'close',         label: 'Cerrar pedidos de clientes',                isAdvanced: true  },
  { module: 'orders', action: 'cancel',        label: 'Anular pedidos de clientes',                isAdvanced: true  },
  { module: 'orders', action: 'delete',        label: 'Eliminar pedidos de clientes',              isAdvanced: false },
  { module: 'orders', action: 'export',        label: 'Exportar pedidos y atributos',              isAdvanced: false },

  // ── Products ──────────────────────────────────────────────────────────────
  { module: 'products', action: 'read',            label: 'Consultar productos',              isAdvanced: false },
  { module: 'products', action: 'write',           label: 'Crear/modificar productos',        isAdvanced: false },
  { module: 'products', action: 'read_prices',     label: 'Leer precios de productos',        isAdvanced: true  },
  { module: 'products', action: 'delete',          label: 'Eliminar productos',               isAdvanced: false },
  { module: 'products', action: 'export',          label: 'Exportar productos',               isAdvanced: false },
  { module: 'products', action: 'ignore_min_price',label: 'Ignorar precio mínimo',            isAdvanced: true  },

  // ── Stock / Inventories ───────────────────────────────────────────────────
  { module: 'stock', action: 'read',              label: 'Consultar stocks',                    isAdvanced: false },
  { module: 'stock', action: 'write_warehouses',  label: 'Crear/modificar almacenes',           isAdvanced: false },
  { module: 'stock', action: 'delete_warehouses', label: 'Eliminar almacenes',                  isAdvanced: false },
  { module: 'stock', action: 'read_movements',    label: 'Consultar movimientos de stock',       isAdvanced: false },
  { module: 'stock', action: 'write_movements',   label: 'Crear/modificar movimientos de stock', isAdvanced: false },
  { module: 'stock', action: 'read_inventories',  label: 'Ver inventarios',                     isAdvanced: true  },
  { module: 'stock', action: 'write_inventories', label: 'Crear/modificar inventarios',         isAdvanced: true  },

  // ── Barcodes ──────────────────────────────────────────────────────────────
  { module: 'barcodes', action: 'generate', label: 'Generar hojas de códigos de barras',    isAdvanced: false },
  { module: 'barcodes', action: 'write',    label: 'Crear/modificar códigos de barras',     isAdvanced: true  },
  { module: 'barcodes', action: 'delete',   label: 'Eliminar códigos de barras',            isAdvanced: true  },

  // ── Import / Export ───────────────────────────────────────────────────────
  { module: 'import', action: 'run', label: 'Lanzar importaciones masivas a la base de datos', isAdvanced: false },
  { module: 'export', action: 'run', label: 'Obtener resultado de una exportación',            isAdvanced: false },
];

export class CreatePermissionsTable1741000003000 implements MigrationInterface {
  name = 'CreatePermissionsTable1741000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`permissions\` (
        \`id\`          INT NOT NULL AUTO_INCREMENT,
        \`module\`      VARCHAR(50) NOT NULL,
        \`action\`      VARCHAR(50) NOT NULL,
        \`label\`       VARCHAR(200) NOT NULL,
        \`description\` TEXT NULL,
        \`isAdvanced\`  TINYINT NOT NULL DEFAULT 0,
        \`isActive\`    TINYINT NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_module_action\` (\`module\`, \`action\`)
      ) ENGINE=InnoDB
    `);

    // Seed the full catalog
    for (const p of PERMISSIONS) {
      await queryRunner.query(
        `INSERT INTO \`permissions\` (\`module\`, \`action\`, \`label\`, \`isAdvanced\`)
         VALUES (?, ?, ?, ?)`,
        [p.module, p.action, p.label, p.isAdvanced ? 1 : 0],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`permissions\``);
  }
}
