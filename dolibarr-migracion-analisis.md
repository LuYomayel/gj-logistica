# Análisis Exhaustivo Dolibarr → Migración NestJS + ReactJS + TypeScript

> **Empresa:** Deposito  
> **País:** Argentina | **Moneda:** Peso Argentino (ARS)  
> **Versión Dolibarr:** 18.0.0  
> **Instancia:** http://137.184.15.234  
> **Fecha de análisis:** Marzo 2026  
> **Stack destino:** NestJS + ReactJS + TypeScript + **MySQL** + TypeORM

---

## TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Módulos Activos](#módulos-activos)
3. [Entidades y Campos Detallados](#entidades-y-campos-detallados)
4. [Campos Extra (Atributos Complementarios)](#campos-extra-atributos-complementarios)
5. [Lógica de Negocio Crítica](#lógica-de-negocio-crítica)
6. [Volúmenes de Datos Reales](#volúmenes-de-datos-reales)
7. [Decisiones de Stack y Convenciones](#decisiones-de-stack-y-convenciones)
8. [Mapeo de esquema (tablas destino)](#mapeo-de-esquema-tablas-destino)
9. [Esquema TypeORM Propuesto](#esquema-typeorm-propuesto)
10. [Arquitectura NestJS Propuesta](#arquitectura-nestjs-propuesta)
11. [Roadmap de Migración](#roadmap-de-migración)

---

## RESUMEN EJECUTIVO

Dolibarr se utiliza como sistema ERP para gestión de pedidos, productos, stock, contactos y usuarios. El núcleo del negocio es:

- **Gestión de Pedidos:** Creación, aprobación, despacho y cancelación de órdenes de venta
- **Control de Stock:** Un único almacén ("Almacen general"), con decremento automático al validar pedidos
- **Catálogo de Productos:** 5.888 productos con 11 campos extra personalizados (talle, rubro, subrubro, marca, color, etc.)
- **Contactos/Clientes:** 169 contactos vinculados a 3 terceros (empresas), con campos extra (DNI, lugar de entrega, marca, nombre fantasía)
- **Usuarios y Permisos:** 12 usuarios internos organizados en 5 grupos con permisos granulares
- **Notificaciones:** Emails automáticos en eventos ORDER_VALIDATE y ORDER_CLOSE

La migración debe preservar **todos los campos extra** ya que son el núcleo de la lógica comercial del negocio.

---

## MÓDULOS ACTIVOS

De 79 módulos disponibles en Dolibarr, **13 están activos** (filtrado por Estado: Habilitado):

| # | Módulo | Descripción funcional |
|---|--------|----------------------|
| 1 | **Usuarios y Grupos** | Gestión de usuarios internos, grupos con permisos granulares |
| 2 | **Terceros (Societes)** | Empresas/organizaciones cliente o proveedor |
| 3 | **Pedidos (Commandes)** | Órdenes de venta con ciclo de vida completo |
| 4 | **Productos** | Catálogo de productos físicos |
| 5 | **Servicios** | Parte del mismo módulo de productos (tipo servicio) |
| 6 | **Inventarios / Stocks** | Control de stock por almacén y movimientos |
| 7 | **Alerta de Stock Insuficiente** | Widget dashboard + flag lowstock en almacén |
| 8 | **Editor WYSIWYG** | Editor de texto enriquecido para notas/descripciones |
| 9 | **Códigos de Barras** | Campo barcode en productos, generación de etiquetas |
| 10 | **Importación de Datos** | Import masivo CSV/XLS (productos, contactos) |
| 11 | **Exportación de Datos** | Export masivo de entidades |
| 12 | **Constructor de Módulos** | Herramienta interna Dolibarr (no migrar) |
| 13 | **Notificaciones sobre Eventos** | Emails automáticos configurados por evento |

### Módulos NO activos (no migrar)
Facturación, Contabilidad, CRM/Oportunidades, Proyectos, RRHH, Contratos, Expediciones, Proveedores, Bancos, y todos los demás (~66 módulos).

---

## ENTIDADES Y CAMPOS DETALLADOS

### 1. USUARIOS (llx_user)

Campos relevantes para migración:

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| login | username | VARCHAR(50) | UNIQUE, requerido |
| pass_crypted | passwordHash | VARCHAR(255) | bcrypt en destino |
| firstname | firstName | VARCHAR(100) | |
| lastname | lastName | VARCHAR(100) | |
| email | email | VARCHAR(255) | UNIQUE |
| phone | phone | VARCHAR(20) | |
| fk_soc | thirdPartyId | INT FK | NULL si usuario interno |
| fk_user | supervisorId | INT FK | auto-ref |
| admin | isAdmin | BOOLEAN | superadmin flag |
| statut | status | SMALLINT | 1=activo, 0=inactivo |
| entity | entity | INT | multiempresa (siempre 1 aquí) |
| datec | createdAt | TIMESTAMP | |
| tms | updatedAt | TIMESTAMP | |
| photo | avatarUrl | VARCHAR(255) | ruta a imagen |
| lang | language | VARCHAR(6) | es_AR |
| note_public | notes | TEXT | |

**Datos reales:** 12 usuarios, todos internos (fk_soc = NULL).

---

### 2. GRUPOS (llx_usergroup)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| nom | name | VARCHAR(100) | |
| note | description | TEXT | |
| entity | entity | INT | |
| datec | createdAt | TIMESTAMP | |
| tms | updatedAt | TIMESTAMP | |

**Grupos existentes:**
- Clientes (11 permisos)
- Comercial (2 usuarios, 5 permisos)
- Comunicacion (8 usuarios, 19 permisos)
- Corteva (0 miembros)
- Regiones (4 miembros)

**Tabla de relación:** llx_usergroup_user → UserGroupMembership (userId, groupId)

---

### 3. TERCEROS / EMPRESAS (llx_societe)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| nom | name | VARCHAR(200) | nombre empresa |
| code_client | clientCode | VARCHAR(24) | |
| siren | taxId | VARCHAR(128) | CUIT en Argentina |
| email | email | VARCHAR(128) | |
| phone | phone | VARCHAR(20) | |
| address | address | TEXT | |
| zip | postalCode | VARCHAR(25) | |
| town | city | VARCHAR(50) | |
| fk_pays | countryId | INT | |
| fk_departement | provinceId | INT | |
| client | isClient | SMALLINT | 1=cliente, 2=prospect |
| fournisseur | isSupplier | SMALLINT | |
| status | status | SMALLINT | |
| datec | createdAt | TIMESTAMP | |
| tms | updatedAt | TIMESTAMP | |
| note_public | notes | TEXT | |
| url | website | VARCHAR(255) | |

**Terceros activos:** Corteva (id=1), Stoller (id=2), PRUEBA GABY 1 (id=3)

**Nota:** llx_societe_commerciaux vincula vendedores (usuarios) a un tercero. Corteva tiene múltiples vendedores asignados. Crear tabla SalesRepresentative (userId, thirdPartyId).

---

### 4. CONTACTOS (llx_socpeople)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| fk_soc | thirdPartyId | INT FK | empresa a la que pertenece |
| firstname | firstName | VARCHAR(100) | |
| lastname | lastName | VARCHAR(100) | |
| email | email | VARCHAR(255) | |
| phone_pro | phonePro | VARCHAR(20) | |
| phone_mobile | phoneMobile | VARCHAR(20) | |
| zip | postalCode | VARCHAR(25) | |
| address | address | TEXT | |
| town | city | VARCHAR(50) | |
| statut | status | SMALLINT | 1=activo |
| datec | createdAt | TIMESTAMP | |
| tms | updatedAt | TIMESTAMP | |
| note_public | notes | TEXT | |
| canvas | alias | VARCHAR(20) | campo "Alias" en lista |

**Datos reales:** 169 contactos


---

### 5. PRODUCTOS (llx_product)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| ref | ref | VARCHAR(128) | UNIQUE, código producto (ej: BI000032) |
| label | label | VARCHAR(255) | nombre/etiqueta |
| description | description | TEXT | |
| barcode | barcode | VARCHAR(180) | código de barras |
| fk_barcode_type | barcodeTypeId | INT | |
| tobuy | isBuyable | SMALLINT | |
| tosell | isSellable | SMALLINT | |
| fk_product_type | productType | SMALLINT | 0=producto, 1=servicio |
| price | price | DECIMAL(24,8) | precio de venta base |
| price_ttc | priceTTC | DECIMAL(24,8) | precio con impuestos |
| tva_tx | vatRate | DECIMAL(6,3) | tasa IVA |
| stock | stock | REAL | stock total (suma de almacenes) |
| seuil_stock_alerte | stockAlertThreshold | REAL | límite alerta |
| desiredstock | desiredStock | REAL | stock deseado |
| weight | weight | REAL | |
| weight_units | weightUnits | TINYINT | |
| fk_country | countryId | INT | |
| datec | createdAt | TIMESTAMP | |
| tms | updatedAt | TIMESTAMP | |
| status | status | SMALLINT | 1=activo en venta |
| status_buy | statusBuy | SMALLINT | 1=activo en compra |
| entity | entity | INT | |
| note_public | notes | TEXT | |
| fk_unit | unitId | INT FK | unidad de medida |
| accountancy_code_sell | accountancyCodeSell | VARCHAR(32) | |
| accountancy_code_buy | accountancyCodeBuy | VARCHAR(32) | |

**Datos reales:** 5.888 productos

---

### 6. PRECIOS DE PRODUCTO (llx_product_price)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| fk_product | productId | INT FK | |
| price | price | DECIMAL(24,8) | |
| price_ttc | priceTTC | DECIMAL(24,8) | |
| tva_tx | vatRate | DECIMAL(6,3) | |
| price_base_type | priceBaseType | VARCHAR(3) | HT o TTC |
| datec | createdAt | TIMESTAMP | |
| tms | updatedAt | TIMESTAMP | |
| fk_user_author | createdByUserId | INT FK | |
| entity | entity | INT | |

---

### 7. ALMACENES (llx_entrepot)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| ref | name | VARCHAR(128) | "Almacen general" |
| description | description | TEXT | |
| lieu | location | VARCHAR(255) | dirección física |
| fk_parent | parentId | INT FK | jerarquía almacenes |
| statut | status | SMALLINT | 1=abierto |
| datec | createdAt | TIMESTAMP | |
| tms | updatedAt | TIMESTAMP | |
| entity | entity | INT | |
| fk_user_author | createdByUserId | INT FK | |

**Datos reales:** 660 entradas en product_stock pero todas apuntan a "Almacen general" (id=1). Solo 1 almacén real.

---

### 8. STOCK POR PRODUCTO-ALMACÉN (llx_product_stock)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| fk_entrepot | warehouseId | INT FK | |
| fk_product | productId | INT FK | |
| reel | quantity | REAL | stock físico actual |
| rowid | — | — | PK |
| tms | updatedAt | TIMESTAMP | |

**Índice UNIQUE:** (fk_entrepot, fk_product)

---

### 9. MOVIMIENTOS DE STOCK (llx_stock_mouvement)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| fk_entrepot | warehouseId | INT FK | |
| fk_product | productId | INT FK | |
| value | quantity | REAL | positivo=entrada, negativo=salida |
| type | movementType | SMALLINT | 0=manual, 1=pedido, 2=factura, 3=inventario |
| fk_user_author | createdByUserId | INT FK | |
| datem | movedAt | TIMESTAMP | |
| origintype | originType | VARCHAR(128) | "commande" |
| fk_origin | originId | INT | FK a llx_commande |
| batch | batchNumber | VARCHAR(255) | lote |
| label | label | VARCHAR(255) | descripción del movimiento |
| inventorycode | inventoryCode | VARCHAR(30) | código de inventario |
| datec | createdAt | TIMESTAMP | |
| price | price | DECIMAL(24,8) | costo del movimiento |
| entity | entity | INT | |

**Datos reales:** 5.791 movimientos

---

### 10. PEDIDOS (llx_commande)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| ref | ref | VARCHAR(30) | UNIQUE, ej: SO2511-0641 |
| ref_client | clientRef | VARCHAR(255) | referencia del cliente |
| fk_soc | thirdPartyId | INT FK | empresa cliente |
| fk_user_author | createdByUserId | INT FK | |
| fk_user_valid | validatedByUserId | INT FK | |
| date_commande | orderDate | DATE | |
| date_livraison | deliveryDate | DATE | |
| fk_statut | status | SMALLINT | 0=borrador,1=validado,2=en proceso,3=entregado,-1=cancelado |
| total_ht | totalHT | DECIMAL(24,8) | total sin impuestos |
| total_tva | totalTax | DECIMAL(24,8) | |
| total_ttc | totalTTC | DECIMAL(24,8) | total con impuestos |
| note_public | publicNote | TEXT | |
| note_private | privateNote | TEXT | |
| fk_warehouse | warehouseId | INT FK | almacén de despacho |
| source | source | SMALLINT | origen del pedido |
| model_pdf | pdfTemplate | VARCHAR(255) | plantilla PDF |
| last_main_doc | lastMainDoc | VARCHAR(255) | ruta al PDF generado |
| datec | createdAt | TIMESTAMP | |
| tms | updatedAt | TIMESTAMP | |
| entity | entity | INT | |
| import_key | importKey | VARCHAR(14) | para importaciones |
| extraparams | extraParams | TEXT | JSON con params extra |
| fk_account | accountId | INT | |
| fk_input_method | inputMethod | INT | |
| fk_cond_reglement | paymentConditionId | INT | |
| fk_mode_reglement | paymentMethodId | INT | |
| fk_projet | projectId | INT FK | NULL en este caso |
| brouillon | isDraft | TINYINT | 1=borrador |
| facture | isBilled | TINYINT | |
| date_valid | validatedAt | TIMESTAMP | |
| tms | updatedAt | TIMESTAMP | |

**Estados de pedido (fk_statut):**
- 0 = Borrador (Brouillon)
- 1 = Validado/Aprobado
- 2 = En proceso (parcialmente entregado)
- 3 = Entregado/Despachado
- -1 = Cancelado

**Numeración automática:** Formato `SOyymm-nnnn` (ej: SO2511-0641 = noviembre 2025, orden 641). Usa módulo Marbre de Dolibarr.

**Datos reales:** 818 pedidos


---

### 11. LÍNEAS DE PEDIDO (llx_commandedet)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| fk_commande | orderId | INT FK | |
| fk_product | productId | INT FK | NULL si línea libre |
| label | label | VARCHAR(255) | descripción línea |
| description | description | TEXT | |
| qty | quantity | REAL | cantidad |
| subprice | unitPrice | DECIMAL(24,8) | precio unitario HT |
| total_ht | totalHT | DECIMAL(24,8) | |
| total_tva | totalTax | DECIMAL(24,8) | |
| total_ttc | totalTTC | DECIMAL(24,8) | |
| tva_tx | vatRate | DECIMAL(6,3) | |
| remise_percent | discountPercent | REAL | descuento % |
| remise | discount | DECIMAL(24,8) | descuento absoluto |
| rang | position | INT | orden/posición en el pedido |
| fk_unit | unitId | INT FK | |
| product_type | productType | SMALLINT | 0=prod, 1=serv |
| date_start | startDate | DATE | |
| date_end | endDate | DATE | |
| info_bits | infoBits | INT | |
| buy_price_ht | buyPriceHT | DECIMAL(24,8) | costo de compra |
| special_code | specialCode | INT | |
| fk_parent_line | parentLineId | INT FK | para sub-líneas |
| fk_multicurrency_code | currencyCode | VARCHAR(3) | |

**Nota:** No hay campos extra en líneas de pedido (confirmado: llx_commandedet_extrafields no tiene registros).

---

### 12. INVENTARIOS (llx_inventory)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| ref | ref | VARCHAR(64) | |
| label | label | VARCHAR(255) | |
| fk_warehouse | warehouseId | INT FK | |
| date_inventory | inventoryDate | DATE | |
| status | status | SMALLINT | 0=borrador, 1=validado |
| fk_user_author | createdByUserId | INT FK | |
| datec | createdAt | TIMESTAMP | |
| tms | updatedAt | TIMESTAMP | |
| entity | entity | INT | |

---

### 13. ARCHIVOS ECM (llx_ecm_files)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|-----------------|------|-------|
| rowid | id | SERIAL PK | |
| label | label | VARCHAR(255) | nombre de archivo |
| filename | filename | VARCHAR(255) | |
| filepath | filepath | VARCHAR(512) | ruta en servidor |
| fullpath_orig | originalPath | VARCHAR(512) | |
| fk_user_c | uploadedByUserId | INT FK | |
| datec | createdAt | TIMESTAMP | |
| tms | updatedAt | TIMESTAMP | |
| src_object_type | entityType | VARCHAR(64) | commande, product, etc. |
| src_object_id | entityId | INT | ID del objeto relacionado |
| entity | entity | INT | |
| share | shareToken | VARCHAR(128) | token público (si aplica) |
| comment | comment | TEXT | |

---

### 14. NOTIFICACIONES (llx_notify / llx_notify_def)

**llx_notify_def** — Define qué notificaciones están activas por evento:

| Campo | Tipo | Notas |
|-------|------|-------|
| rowid | SERIAL PK | |
| datec | TIMESTAMP | |
| fk_action | INT FK | ID del evento (ref a llx_c_action_trigger) |
| fk_soc | INT FK | empresa (NULL = global) |
| fk_contact | INT FK | contacto destino |
| type | VARCHAR(32) | "email" |
| fk_user | INT FK | usuario destino |
| entity | INT | |

**Eventos configurados:**
- ORDER_VALIDATE → Email al validar pedido
- ORDER_CLOSE → Email al cerrar/despachar pedido

**Email remitente:** f.depositomails@gmail.com

**llx_notify** — Log de notificaciones enviadas:

| Campo | Tipo | Notas |
|-------|------|-------|
| rowid | SERIAL PK | |
| datec | TIMESTAMP | |
| fk_action | INT FK | |
| fk_soc | INT FK | |
| fk_contact | INT FK | |
| type | VARCHAR(32) | |
| objet_type | VARCHAR(32) | tipo objeto origen |
| objet_id | INT | ID objeto origen |
| email | VARCHAR(255) | email destino |
| reponse | TEXT | respuesta SMTP |
| entity | INT | |

---

## CAMPOS EXTRA (ATRIBUTOS COMPLEMENTARIOS)

Estos campos son **CRÍTICOS** — son la personalización central del negocio y deben migrarse como columnas regulares en el nuevo esquema MySQL (no como EAV).

### Campos Extra en PRODUCTOS (llx_product_extrafields)

| Nombre interno | Label visible | Tipo MySQL | Tipo destino | Notas |
|----------------|--------------|------------|-----------------|-------|
| talle | Talle | varchar(255) | VARCHAR(255) | talla de ropa/calzado |
| rubro | Rubro | varchar(255) | VARCHAR(255) | categoría principal |
| subrubro | SubRubro | varchar(255) | VARCHAR(255) | subcategoría |
| marca | Marca | varchar(255) | VARCHAR(255) | marca del producto |
| color | Color | varchar(255) | VARCHAR(255) | color |
| posicion | Posicion | varchar(255) | VARCHAR(255) | posición en depósito |
| nivel_economico | Nivel económico | varchar(255) | VARCHAR(255) | segmento económico |
| imagen | Imagen | varchar(255) | VARCHAR(255) | URL/ruta de imagen |
| descripcion_corta | Descripción corta | text | TEXT | descripción breve |
| keywords | Keywords | varchar(255) | VARCHAR(255) | palabras clave para búsqueda |
| ean_interno | EAN Interno | varchar(255) | VARCHAR(255) | código EAN alternativo |

> **Estrategia de migración:** Hacer JOIN entre llx_product y llx_product_extrafields en la ETL y guardar en una sola tabla `products` en MySQL con todos estos campos como columnas regulares.

---

### Campos Extra en CONTACTOS (llx_socpeople_extrafields)

| Nombre interno | Label visible | Tipo MySQL | Tipo destino | Notas |
|----------------|--------------|------------|-----------------|-------|
| marca | Marca | varchar(255) | VARCHAR(255) | marca con la que trabaja el contacto |
| dni | DNI | int | INTEGER | UNIQUE, documento nacional identidad |
| lugardeentrega | Lugar de entrega | varchar(255) | VARCHAR(255) | dirección alternativa de entrega |
| nombrefantasia | Nombre Fantasía | varchar(255) | VARCHAR(255) | nombre comercial |

> **Nota:** DNI tiene restricción UNIQUE en Dolibarr — mantenerla en el nuevo esquema.

---

### Campos Extra en PEDIDOS (llx_commande_extrafields)

| Nombre interno | Label visible | Tipo MySQL | Tipo destino | Notas |
|----------------|--------------|------------|-----------------|-------|
| nrodeseguimiento | Nro de seguimiento | varchar(255) | VARCHAR(255) | número de tracking logístico |
| agencia | Agencia | varchar(255) | VARCHAR(255) | agencia de envío (ej: Andreani, OCA) |

---

### Campos Extra en ALMACENES (llx_entrepot_extrafields)

| Nombre interno | Label visible | Tipo MySQL | Tipo destino | Notas |
|----------------|--------------|------------|-----------------|-------|
| lowstock | Alerta Stock Bajo | tinyint | BOOLEAN | flag para alerta de stock insuficiente |

---

## LÓGICA DE NEGOCIO CRÍTICA

### 1. Ciclo de Vida de un Pedido

```
BORRADOR (0) → VALIDADO (1) → EN PROCESO (2) → DESPACHADO/ENTREGADO (3)
                    ↓
               CANCELADO (-1)
```

- **BORRADOR:** Se puede editar libremente. No afecta el stock.
- **VALIDADO:** Dispara decremento de stock automáticamente (transacción atómica). Genera número de pedido definitivo. Envía notificación email.
- **EN PROCESO:** Estado intermedio opcional.
- **DESPACHADO:** Pedido finalizado. Envía notificación email (ORDER_CLOSE).
- **CANCELADO:** Revierte el stock decrementado.

### 2. Reglas de Stock

- ✅ **Stock se decrementa al validar el pedido** (no al crear ni al despachar)
- ✅ **El stock no puede quedar en negativo** — si no hay suficiente, el sistema lo bloquea
- ✅ **Para agregar un producto a un pedido, debe haber stock suficiente**
- El movimiento de stock se registra en llx_stock_mouvement con `type=1`, `origintype='commande'`, `fk_origin=orderId`
- Si se cancela el pedido → movimiento inverso (positivo) en stock_mouvement

### 3. Numeración de Pedidos

- Formato: `SOyymm-nnnn`
- yy = año 2 dígitos, mm = mes 2 dígitos, nnnn = número secuencial del mes
- Ejemplo: SO2511-0641 = noviembre 2025, pedido número 641 del mes
- Se reinicia la secuencia cada mes
- Implementar en NestJS con una tabla de secuencias por año-mes (MySQL no tiene sequences como PostgreSQL; usar tabla + transacción con lock)

### 4. Vendedores por Tercero

- Un tercero (empresa) puede tener múltiples vendedores (usuarios) asignados
- Tabla llx_societe_commerciaux (fk_soc, fk_user) → tabla pivot SalesRep en el nuevo esquema
- Un contacto puede tener un campo "Contacto de la orden" (llx_element_contact con source_type='commande') — vincula contactos a pedidos

### 5. Contactos vinculados a Pedidos

- Tabla llx_element_contact: (element_id=orderId, fk_socpeople=contactId, source_type='commande')
- Permite vincular múltiples contactos a un pedido en distintos roles (comprador, receptor, etc.)

### 6. Notificaciones por Email

- Solo 2 eventos: ORDER_VALIDATE, ORDER_CLOSE
- Sin plantillas HTML personalizadas (usa las por defecto de Dolibarr)
- Remitente: f.depositomails@gmail.com (configurar SMTP en NestJS con nodemailer)
- En NestJS: usar Bull/BullMQ para queue de emails, o @nestjs/mailer directamente

### 7. Permisos por Módulo

Dolibarr usa permisos granulares por módulo. Grupos actuales:
- **Clientes** (11 permisos): Solo lectura de pedidos, productos, stock
- **Comercial** (2 usuarios, 5 permisos): Crear/editar pedidos
- **Comunicacion** (8 usuarios, 19 permisos): Acceso más amplio
- **Corteva** (0 usuarios): Grupo especial sin miembros activos
- **Regiones** (4 usuarios): Por zona geográfica

En NestJS implementar con **RBAC** (Role-Based Access Control) usando Guards y Decorators de NestJS.

---

## VOLÚMENES DE DATOS REALES

| Entidad | Cantidad |
|---------|----------|
| Usuarios | 12 |
| Grupos | 5 |
| Terceros (empresas) | 3 |
| Contactos | 169 |
| Productos | 5.888 |
| Almacenes | 1 (Almacen general) |
| Entradas stock (product_stock) | 660 |
| Movimientos de stock | 5.791 |
| Pedidos | 818 |
| Archivos ECM | desconocido (tabla existe) |
| Notificaciones enviadas | desconocido (tabla existe) |


---

## DECISIONES DE STACK Y CONVENIONES

> **Documento base:** A partir de este análisis se creará todo el proyecto. Las siguientes decisiones quedan fijadas para toda la migración.

### Base de datos: MySQL
- **Se mantiene MySQL** como base de datos. No se migra a PostgreSQL.
- El esquema destino (nuevas tablas y nombres de columnas) se aplica sobre MySQL. La ETL copia/transforma desde las tablas Dolibarr (MySQL) hacia las tablas del nuevo sistema (también MySQL, en la misma o otra instancia).

### Frontend: estilos y componentes
- **Tailwind CSS** para todo lo que sea estilos (utility-first, diseño responsive, temas).
- **PrimeReact** como librería de componentes: se instala y usa para inputs, tablas, modales, dropdowns, etc. No se desarrollan componentes propios para elementos estándar (evita reinventar inputs, DataTable, etc.).

### Backend: tests y criterio de avance
- **Cada módulo desarrollado debe tener tests en Jest** (unitarios y/o integración según corresponda).
- **Criterio de avance entre fases:** cada vez que se pasa de fase hay que **ejecutar los tests**; **deben pasar**. Si no pasan, se itera hasta que pasen antes de continuar a la siguiente fase.
- No se considera completa una fase si los tests del backend no están en verde.

---

## MAPEO DE ESQUEMA (TABLAS DESTINO)

*Origen: tablas Dolibarr (MySQL). Destino: tablas del nuevo sistema (MySQL).*

### Tablas a MIGRAR (con datos de negocio)

| Tabla MySQL (origen) | Tabla destino (MySQL) | Observaciones |
|------------|-----------------|---------------|
| llx_user | users | Quitar campos Dolibarr-internal (canvas, api_key, etc.) |
| llx_usergroup | groups | |
| llx_usergroup_user | user_group_memberships | Tabla pivot |
| llx_usergroup_rights | group_permissions | Adaptar a RBAC propio |
| llx_user_rights | user_permissions | Permisos individuales extra |
| llx_societe | third_parties | |
| llx_societe_commerciaux | sales_representatives | userId + thirdPartyId |
| llx_socpeople | contacts | |
| llx_socpeople_extrafields | — | JOIN con contacts al migrar |
| llx_product | products | |
| llx_product_extrafields | — | JOIN con products al migrar |
| llx_product_price | product_prices | Historial de precios |
| llx_entrepot | warehouses | |
| llx_entrepot_extrafields | — | JOIN con warehouses al migrar |
| llx_product_stock | product_stocks | Stock actual por producto-almacén |
| llx_stock_mouvement | stock_movements | Historial completo |
| llx_commande | orders | |
| llx_commande_extrafields | — | JOIN con orders al migrar |
| llx_commandedet | order_lines | |
| llx_element_contact | order_contacts | Contactos vinculados a pedidos |
| llx_ecm_files | files | Archivos adjuntos |
| llx_inventory | inventories | Ajustes de inventario |
| llx_notify | notification_logs | Log de emails enviados |
| llx_notify_def | notification_settings | Config de notificaciones |

### Tablas de CATÁLOGO a migrar (llx_c_*)

| Tabla MySQL (origen) | Tabla destino (MySQL) | Contenido |
|------------|-----------------|-----------|
| llx_c_country | countries | Países |
| llx_c_departements | provinces | Provincias (Argentina) |
| llx_c_regions | regions | Regiones |
| llx_c_currency | currencies | Monedas |
| llx_c_typent | third_party_types | Tipos de terceros |
| llx_c_paiement | payment_methods | Modos de pago |
| llx_c_payment_term | payment_terms | Condiciones de pago |
| llx_c_input_reason | order_sources | Orígenes de pedido |
| llx_c_units | measurement_units | Unidades de medida |
| llx_c_product_nature | product_natures | Naturaleza del producto |
| llx_c_barcode_type | barcode_types | Tipos de código de barras |

### Tablas a DESCARTAR (infraestructura Dolibarr)

Estas tablas son internas de Dolibarr y NO tienen equivalente en la nueva aplicación:

`llx_accounting_journal`, `llx_boxes`, `llx_boxes_def`, `llx_const`, `llx_menu`, `llx_rights_def`, `llx_user_param`, `llx_action_trigger`, `llx_c_action_trigger`, `llx_c_format_cards`, `llx_c_paper_format`, `llx_cronjob`, `llx_document_model`, `llx_extrafields`, `llx_fieldsrecord`, `llx_import_model`, `llx_export_model`, `llx_c_email_senderprofile`, `llx_oauth_token`, `llx_printer_def`, `llx_session`, `llx_token`, `llx_translation`

---

## ESQUEMA TYPEORM PROPUESTO

Las entidades se definen como clases TypeScript con decoradores de TypeORM. Se asume configuración en `ormconfig.ts` o `data-source.ts` con `synchronize: false` y migraciones habilitadas.

### Configuración de TypeORM (NestJS)

En `app.module.ts` se registra el módulo:

```typescript
// app.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    }),
    // ... otros módulos
  ],
})
export class AppModule {}
```

### Entidades (src/entities/)

#### Users & Auth

```typescript
// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'boolean', default: false })
  isAdmin: boolean;

  @Column({ type: 'int', default: 1 }) // 1=active, 0=inactive
  status: number;

  @Column({ type: 'varchar', length: 6, default: 'es_AR', nullable: true })
  language: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', nullable: true })
  supervisorId: number | null;

  @Column({ type: 'int', nullable: true })
  thirdPartyId: number | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (u) => u.subordinates)
  supervisor: User | null;

  @OneToMany(() => User, (u) => u.supervisor)
  subordinates: User[];

  @OneToMany(() => UserGroupMembership, (m) => m.user)
  groups: UserGroupMembership[];

  @OneToMany(() => Order, (o) => o.createdBy)
  createdOrders: Order[];

  @OneToMany(() => Order, (o) => o.validatedBy)
  validatedOrders: Order[];

  @OneToMany(() => SalesRepresentative, (s) => s.user)
  salesReps: SalesRepresentative[];

  @OneToMany(() => StockMovement, (m) => m.createdBy)
  stockMovements: StockMovement[];

  @OneToMany(() => Product, (p) => p.createdBy)
  createdProducts: Product[];

  @OneToMany(() => File, (f) => f.uploadedBy)
  uploadedFiles: File[];
}
```

```typescript
// group.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserGroupMembership, (m) => m.group)
  members: UserGroupMembership[];

  @OneToMany(() => GroupPermission, (p) => p.group)
  permissions: GroupPermission[];
}
```

```typescript
// user-group-membership.entity.ts
import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';

@Entity('user_group_memberships')
export class UserGroupMembership {
  @PrimaryColumn()
  userId: number;

  @PrimaryColumn()
  groupId: number;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @ManyToOne(() => User, (u) => u.groups, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Group, (g) => g.members, { onDelete: 'CASCADE' })
  group: Group;
}
```

```typescript
// group-permission.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity('group_permissions')
export class GroupPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column({ type: 'varchar', length: 50 })
  module: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @ManyToOne(() => Group, (g) => g.permissions, { onDelete: 'CASCADE' })
  group: Group;
}
```

#### Third Parties & Contacts

```typescript
// third-party.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('third_parties')
export class ThirdParty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 24, nullable: true })
  clientCode: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true }) // CUIT
  taxId: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 25, nullable: true })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  city: string | null;

  @Column({ type: 'int', nullable: true })
  countryId: number | null;

  @Column({ type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ type: 'int', default: 1 }) // 1=client, 2=prospect
  isClient: number;

  @Column({ type: 'int', default: 0 })
  isSupplier: number;

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Contact, (c) => c.thirdParty)
  contacts: Contact[];

  @OneToMany(() => Order, (o) => o.thirdParty)
  orders: Order[];

  @OneToMany(() => SalesRepresentative, (s) => s.thirdParty)
  salesReps: SalesRepresentative[];
}
```

```typescript
// sales-representative.entity.ts
import { Entity, PrimaryColumn, ManyToOne } from 'typeorm';

@Entity('sales_representatives')
export class SalesRepresentative {
  @PrimaryColumn()
  userId: number;

  @PrimaryColumn()
  thirdPartyId: number;

  @ManyToOne(() => User, (u) => u.salesReps, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => ThirdParty, (t) => t.salesReps, { onDelete: 'CASCADE' })
  thirdParty: ThirdParty;
}
```

```typescript
// contact.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  thirdPartyId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phonePro: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneMobile: string | null;

  @Column({ type: 'varchar', length: 25, nullable: true })
  postalCode: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  alias: string | null;

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Extra fields (llx_socpeople_extrafields)
  @Column({ type: 'varchar', length: 255, nullable: true })
  marca: string | null;

  @Column({ type: 'int', unique: true, nullable: true })
  dni: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lugarDeEntrega: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nombreFantasia: string | null;

  @ManyToOne(() => ThirdParty, (t) => t.contacts)
  thirdParty: ThirdParty | null;

  @OneToMany(() => OrderContact, (oc) => oc.contact)
  orderContacts: OrderContact[];
}
```

#### Products & Stock

```typescript
// product.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 128, unique: true })
  ref: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  barcode: string | null;

  @Column({ type: 'int', nullable: true })
  barcodeTypeId: number | null;

  @Column({ type: 'int', default: 1 })
  isBuyable: number;

  @Column({ type: 'int', default: 1 })
  isSellable: number;

  @Column({ type: 'int', default: 0 }) // 0=product, 1=service
  productType: number;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  price: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  priceTTC: string | null;

  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true })
  vatRate: string | null;

  @Column({ type: 'float', default: 0, nullable: true })
  stock: number | null;

  @Column({ type: 'float', default: 0, nullable: true })
  stockAlertThreshold: number | null;

  @Column({ type: 'float', default: 0, nullable: true })
  desiredStock: number | null;

  @Column({ type: 'float', nullable: true })
  weight: number | null;

  @Column({ type: 'int', nullable: true })
  weightUnits: number | null;

  @Column({ type: 'int', nullable: true })
  unitId: number | null;

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'int', default: 1 })
  statusBuy: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Extra fields (llx_product_extrafields)
  @Column({ type: 'varchar', length: 255, nullable: true })
  talle: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  rubro: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subrubro: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  marca: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  posicion: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nivelEconomico: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imagen: string | null;

  @Column({ type: 'text', nullable: true })
  descripcionCorta: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  keywords: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  eanInterno: string | null;

  @ManyToOne(() => User, (u) => u.createdProducts)
  createdBy: User | null;

  @OneToMany(() => ProductPrice, (p) => p.product)
  prices: ProductPrice[];

  @OneToMany(() => ProductStock, (s) => s.product)
  stocks: ProductStock[];

  @OneToMany(() => StockMovement, (m) => m.product)
  stockMovements: StockMovement[];

  @OneToMany(() => OrderLine, (l) => l.product)
  orderLines: OrderLine[];
}
```

```typescript
// product-price.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';

@Entity('product_prices')
export class ProductPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @Column({ type: 'decimal', precision: 24, scale: 8 })
  price: string;

  @Column({ type: 'decimal', precision: 24, scale: 8 })
  priceTTC: string;

  @Column({ type: 'decimal', precision: 6, scale: 3 })
  vatRate: string;

  @Column({ type: 'varchar', length: 3, default: 'HT' })
  priceBaseType: string;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Product, (p) => p.prices, { onDelete: 'CASCADE' })
  product: Product;
}
```

```typescript
// warehouse.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ type: 'int', nullable: true })
  parentId: number | null;

  @Column({ type: 'int', default: 1 }) // 1=open
  status: number;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'boolean', default: false }) // llx_entrepot_extrafields lowstock
  lowStock: boolean;

  @ManyToOne(() => Warehouse, (w) => w.children)
  parent: Warehouse | null;

  @OneToMany(() => Warehouse, (w) => w.parent)
  children: Warehouse[];

  @OneToMany(() => ProductStock, (ps) => ps.warehouse)
  productStocks: ProductStock[];

  @OneToMany(() => StockMovement, (m) => m.warehouse)
  stockMovements: StockMovement[];

  @OneToMany(() => Order, (o) => o.warehouse)
  orders: Order[];

  @OneToMany(() => Inventory, (i) => i.warehouse)
  inventories: Inventory[];
}
```

```typescript
// product-stock.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, ManyToOne, Unique } from 'typeorm';

@Entity('product_stocks')
@Unique(['warehouseId', 'productId'])
export class ProductStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  warehouseId: number;

  @Column()
  productId: number;

  @Column({ type: 'float', default: 0 })
  quantity: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Warehouse, (w) => w.productStocks, { onDelete: 'CASCADE' })
  warehouse: Warehouse;

  @ManyToOne(() => Product, (p) => p.stocks, { onDelete: 'CASCADE' })
  product: Product;
}
```

```typescript
// stock-movement.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  warehouseId: number;

  @Column()
  productId: number;

  @Column({ type: 'float' }) // positivo=entrada, negativo=salida
  quantity: number;

  @Column({ type: 'int', default: 0 }) // 0=manual, 1=order, 2=invoice, 3=inventory
  movementType: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  inventoryCode: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  batchNumber: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  price: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true }) // "order", "inventory"
  originType: string | null;

  @Column({ type: 'int', nullable: true })
  originId: number | null;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  movedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @ManyToOne(() => Warehouse, (w) => w.stockMovements)
  warehouse: Warehouse;

  @ManyToOne(() => Product, (p) => p.stockMovements)
  product: Product;

  @ManyToOne(() => User, (u) => u.stockMovements)
  createdBy: User | null;
}
```

#### Orders

```typescript
// order.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true }) // SOyymm-nnnn
  ref: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientRef: string | null;

  @Column()
  thirdPartyId: number;

  @Column({ type: 'int', nullable: true })
  warehouseId: number | null;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'int', nullable: true })
  validatedByUserId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  orderDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveryDate: Date | null;

  @Column({ type: 'int', default: 0 }) // 0=draft,1=validated,2=in_progress,3=delivered,-1=cancelled
  status: number;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  totalHT: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  totalTax: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  totalTTC: string | null;

  @Column({ type: 'text', nullable: true })
  publicNote: string | null;

  @Column({ type: 'text', nullable: true })
  privateNote: string | null;

  @Column({ type: 'int', nullable: true })
  source: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pdfTemplate: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastMainDoc: string | null;

  @Column({ type: 'int', nullable: true })
  paymentConditionId: number | null;

  @Column({ type: 'int', nullable: true })
  paymentMethodId: number | null;

  @Column({ type: 'boolean', default: true })
  isDraft: boolean;

  @Column({ type: 'boolean', default: false })
  isBilled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  validatedAt: Date | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', length: 14, nullable: true })
  importKey: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nroSeguimiento: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  agencia: string | null;

  @ManyToOne(() => ThirdParty, (t) => t.orders)
  thirdParty: ThirdParty;

  @ManyToOne(() => Warehouse, (w) => w.orders)
  warehouse: Warehouse | null;

  @ManyToOne(() => User, (u) => u.createdOrders)
  createdBy: User | null;

  @ManyToOne(() => User, (u) => u.validatedOrders)
  validatedBy: User | null;

  @OneToMany(() => OrderLine, (l) => l.order, { cascade: true })
  lines: OrderLine[];

  @OneToMany(() => OrderContact, (oc) => oc.order)
  contacts: OrderContact[];

  @OneToMany(() => File, (f) => f.order)
  files: File[];
}
```

```typescript
// order-line.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity('order_lines')
export class OrderLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @Column({ type: 'int', nullable: true })
  productId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'float', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  unitPrice: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  totalHT: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  totalTax: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  totalTTC: string | null;

  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true })
  vatRate: string | null;

  @Column({ type: 'float', default: 0, nullable: true })
  discountPercent: number | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  discount: string | null;

  @Column({ type: 'int', default: 0, nullable: true })
  position: number | null;

  @Column({ type: 'int', nullable: true })
  unitId: number | null;

  @Column({ type: 'int', default: 0, nullable: true })
  productType: number | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  buyPriceHT: string | null;

  @Column({ type: 'int', nullable: true })
  parentLineId: number | null;

  @Column({ type: 'int', default: 0, nullable: true })
  specialCode: number | null;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @ManyToOne(() => Order, (o) => o.lines, { onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Product, (p) => p.orderLines)
  product: Product | null;
}
```

```typescript
// order-contact.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity('order_contacts')
export class OrderContact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @Column()
  contactId: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  role: string | null;

  @ManyToOne(() => Order, (o) => o.contacts, { onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Contact, (c) => c.orderContacts, { onDelete: 'CASCADE' })
  contact: Contact;
}
```

#### Files, Inventory, Notifications

```typescript
// file.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 512 })
  filepath: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  entityType: string | null;

  @Column({ type: 'int', nullable: true })
  entityId: number | null;

  @Column({ type: 'int', nullable: true })
  uploadedByUserId: number | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  shareToken: string | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (u) => u.uploadedFiles)
  uploadedBy: User | null;

  @ManyToOne(() => Order, (o) => o.files, { nullable: true })
  @JoinColumn({ name: 'entityId' }) // cuando entityType='commande', entityId = order.id
  order: Order | null;
}
```

```typescript
// inventory.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';

@Entity('inventories')
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  ref: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'int', nullable: true })
  warehouseId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  inventoryDate: Date | null;

  @Column({ type: 'int', default: 0 }) // 0=draft, 1=validated
  status: number;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Warehouse, (w) => w.inventories)
  warehouse: Warehouse | null;
}
```

```typescript
// notification-setting.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notification_settings')
export class NotificationSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 }) // ORDER_VALIDATE, ORDER_CLOSE
  event: string;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'int', nullable: true })
  contactId: number | null;

  @Column({ type: 'int', nullable: true })
  thirdPartyId: number | null;

  @Column({ type: 'varchar', length: 32, default: 'email' })
  type: string;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

```typescript
// notification-log.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  event: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  entityType: string | null;

  @Column({ type: 'int', nullable: true })
  entityId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  response: string | null;

  @Column({ type: 'int', nullable: true })
  thirdPartyId: number | null;

  @Column({ type: 'int', nullable: true })
  contactId: number | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

#### Catálogos

```typescript
// country.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 2, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
```

```typescript
// province.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('provinces')
export class Province {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column()
  countryId: number;

  @Column({ type: 'int', nullable: true })
  regionId: number | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
```

```typescript
// measurement-unit.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('measurement_units')
export class MeasurementUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 3 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unitType: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
```

```typescript
// payment-method.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
```

```typescript
// payment-term.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('payment_terms')
export class PaymentTerm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
```

```typescript
// order-source.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('order_sources')
export class OrderSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
```

**Nota:** En las entidades que referencian `Order`, `User`, `Product`, etc., deben importarse las clases correspondientes para evitar referencias circulares; se puede usar `() => EntityName` en los decoradores de relación. La relación `File.order` asume que solo se vincula a pedidos cuando `entityType === 'commande'`; si se necesita polimorfismo estricto, puede usarse una tabla separada `order_files` con `orderId` y `fileId`.


---

## ARQUITECTURA NESTJS PROPUESTA

### Estructura de Módulos

```
src/
├── main.ts
├── app.module.ts
├── config/
│   └── database.ts              # TypeORM DataSource o configuración
├── entities/                    # Entidades TypeORM (ver esquema anterior)
│   ├── user.entity.ts
│   ├── group.entity.ts
│   ├── order.entity.ts
│   └── ...
├── database/
│   └── migrations/              # Migraciones TypeORM
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   └── local.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── decorators/
│       └── roles.decorator.ts
│
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
│       ├── create-user.dto.ts
│       └── update-user.dto.ts
│
├── groups/
│   ├── groups.module.ts
│   ├── groups.controller.ts
│   └── groups.service.ts
│
├── third-parties/
│   ├── third-parties.module.ts
│   ├── third-parties.controller.ts
│   └── third-parties.service.ts
│
├── contacts/
│   ├── contacts.module.ts
│   ├── contacts.controller.ts
│   └── contacts.service.ts
│
├── products/
│   ├── products.module.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── dto/
│       ├── create-product.dto.ts
│       └── product-filter.dto.ts
│
├── warehouses/
│   ├── warehouses.module.ts
│   ├── warehouses.controller.ts
│   └── warehouses.service.ts
│
├── stock/
│   ├── stock.module.ts
│   ├── stock.controller.ts
│   ├── stock.service.ts
│   └── dto/
│       └── stock-movement.dto.ts
│
├── orders/
│   ├── orders.module.ts
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   └── dto/
│       ├── create-order.dto.ts
│       ├── update-order.dto.ts
│       └── validate-order.dto.ts
│
├── notifications/
│   ├── notifications.module.ts
│   └── notifications.service.ts
│
├── files/
│   ├── files.module.ts
│   ├── files.controller.ts
│   └── files.service.ts
│
└── common/
    ├── filters/
    │   └── http-exception.filter.ts
    ├── interceptors/
    │   └── transform.interceptor.ts
    ├── pipes/
    │   └── validation.pipe.ts
    └── decorators/
        └── current-user.decorator.ts
```

### Endpoints REST Principales

#### Auth
```
POST   /auth/login              → JWT token
POST   /auth/logout
GET    /auth/me                 → current user profile
POST   /auth/refresh            → refresh JWT
```

#### Users
```
GET    /users                   → list users (paginated)
GET    /users/:id               → user detail
POST   /users                   → create user
PATCH  /users/:id               → update user
DELETE /users/:id               → deactivate user
GET    /users/:id/groups        → user's groups
```

#### Groups
```
GET    /groups                  → list groups
GET    /groups/:id              → group detail with members
POST   /groups                  → create group
PATCH  /groups/:id              → update group
POST   /groups/:id/members      → add user to group
DELETE /groups/:id/members/:userId → remove user from group
```

#### Third Parties
```
GET    /third-parties           → list (paginated, searchable)
GET    /third-parties/:id       → detail
POST   /third-parties           → create
PATCH  /third-parties/:id       → update
GET    /third-parties/:id/contacts  → contacts of this company
GET    /third-parties/:id/orders    → orders of this company
POST   /third-parties/:id/sales-reps → assign sales rep
DELETE /third-parties/:id/sales-reps/:userId → remove sales rep
```

#### Contacts
```
GET    /contacts                → list (paginated, search by name/dni/marca)
GET    /contacts/:id            → detail
POST   /contacts                → create
PATCH  /contacts/:id            → update
DELETE /contacts/:id            → deactivate
```

#### Products
```
GET    /products                → list (paginated, filter by rubro/subrubro/marca/talle/color)
GET    /products/:id            → detail
GET    /products/ref/:ref       → by reference code
POST   /products                → create
PATCH  /products/:id            → update
DELETE /products/:id            → deactivate
GET    /products/:id/stock      → stock by warehouse
GET    /products/:id/movements  → stock movement history
GET    /products/low-stock      → products below alert threshold
```

#### Warehouses
```
GET    /warehouses              → list
GET    /warehouses/:id          → detail
POST   /warehouses              → create
PATCH  /warehouses/:id          → update
GET    /warehouses/:id/stock    → all product stocks in this warehouse
```

#### Stock
```
GET    /stock/movements         → list all movements (paginated, filterable)
POST   /stock/movements         → manual stock correction
GET    /stock/movements/:id     → movement detail
POST   /stock/transfer          → transfer between warehouses
```

#### Orders
```
GET    /orders                  → list (paginated, filter by status/date/tercero)
GET    /orders/:id              → detail with lines
POST   /orders                  → create (draft)
PATCH  /orders/:id              → update draft
POST   /orders/:id/validate     → validate order (decrements stock, sends email)
POST   /orders/:id/ship         → mark as shipped/dispatched (sends email)
POST   /orders/:id/cancel       → cancel (reverses stock)
DELETE /orders/:id/lines/:lineId → remove line from draft
POST   /orders/:id/lines        → add line to draft
PATCH  /orders/:id/lines/:lineId → update line quantity/price
GET    /orders/:id/pdf          → generate/download PDF
POST   /orders/:id/contacts     → link contact to order
```

### Lógica de Validación de Pedido (Orders Service)

```typescript
// orders/orders.service.ts
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  async validateOrder(orderId: number, userId: number): Promise<Order> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const orderRepo = qr.manager.getRepository(Order);
      const orderLineRepo = qr.manager.getRepository(OrderLine);
      const productStockRepo = qr.manager.getRepository(ProductStock);
      const productRepo = qr.manager.getRepository(Product);
      const stockMovementRepo = qr.manager.getRepository(StockMovement);

      const order = await orderRepo.findOne({
        where: { id: orderId },
        relations: { lines: { product: true } },
      });

      if (!order || order.status !== 0) {
        throw new BadRequestException('Order must be in draft status');
      }

      // Check stock availability for all lines
      for (const line of order.lines) {
        if (!line.productId || !line.product) continue;

        const productStock = await productStockRepo.findOne({
          where: {
            warehouseId: order.warehouseId!,
            productId: line.productId,
          },
        });

        const available = productStock?.quantity ?? 0;
        if (available < line.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${line.product.ref}: available ${available}, required ${line.quantity}`,
          );
        }
      }

      // Decrement stock for all lines
      for (const line of order.lines) {
        if (!line.productId) continue;

        const ps = await productStockRepo.findOneOrFail({
          where: {
            warehouseId: order.warehouseId!,
            productId: line.productId,
          },
        });
        ps.quantity -= line.quantity;
        await productStockRepo.save(ps);

        const product = await productRepo.findOneByOrFail({ id: line.productId });
        product.stock = (product.stock ?? 0) - line.quantity;
        await productRepo.save(product);

        await stockMovementRepo.insert({
          warehouseId: order.warehouseId!,
          productId: line.productId,
          quantity: -line.quantity,
          movementType: 1,
          originType: 'order',
          originId: orderId,
          createdByUserId: userId,
          label: `Pedido ${order.ref}`,
          movedAt: new Date(),
        });
      }

      const ref = await this.generateOrderRef(qr);

      await orderRepo.update(orderId, {
        status: 1,
        isDraft: false,
        ref,
        validatedByUserId: userId,
        validatedAt: new Date(),
      });

      const updatedOrder = await orderRepo.findOneByOrFail({ id: orderId });

      await qr.commitTransaction();

      // Trigger notification (async, non-blocking)
      this.notificationsService.sendOrderEvent('ORDER_VALIDATE', updatedOrder);

      return updatedOrder;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  private async generateOrderRef(qr: QueryRunner): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `SO${yy}${mm}-`;

    const orderRepo = qr.manager.getRepository(Order);
    const lastOrder = await orderRepo
      .createQueryBuilder('o')
      .where('o.ref LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('o.ref', 'DESC')
      .getOne();

    let seq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.ref.split('-')[1], 10);
      seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }
}
```

Para evitar condiciones de carrera en la numeración de pedidos, se puede usar una tabla de secuencias con bloqueo (ver nota en sección *Numeración de Pedidos Concurrente*).

---

## DASHBOARD (Pantalla Inicio)

El dashboard de Dolibarr tiene 2 widgets activos:

1. **Productos: Alerta de Stock** — Lista de productos con stock físico por debajo del límite de alerta (`stock < seuil_stock_alerte`)
2. **Productos/Servicios: Últimos 10 modificados** — Los 10 productos con mayor `updatedAt`

### Endpoints para Dashboard

```
GET /dashboard/stock-alerts     → products where stock < stockAlertThreshold
GET /dashboard/recent-products  → last 10 products by updatedAt
GET /dashboard/stats            → general counters (orders by status, etc.)
```

---

## PANTALLAS FRONTEND (ReactJS)

### Pantallas requeridas

| Pantalla | Ruta React | Descripción |
|----------|-----------|-------------|
| Login | /login | Autenticación JWT |
| Dashboard | / | Widgets de stock y productos recientes |
| Lista Terceros | /third-parties | Búsqueda, filtros, paginación |
| Detalle Tercero | /third-parties/:id | Tabs: Info, Contactos, Pedidos, Vendedores |
| Lista Contactos | /contacts | Búsqueda por nombre, DNI, marca |
| Detalle Contacto | /contacts/:id | Todos los campos incluyendo extras |
| Lista Productos | /products | Filtros: rubro, subrubro, marca, talle, color |
| Detalle Producto | /products/:id | Tabs: Info, Precios, Stock, Movimientos |
| Lista Pedidos | /orders | Filtros: estado, fecha, tercero, agencia |
| Detalle Pedido | /orders/:id | Líneas, campos extra (tracking, agencia), botones acción |
| Crear Pedido | /orders/new | Formulario completo |
| Lista Almacenes | /warehouses | Ver stock por almacén |
| Movimientos Stock | /stock/movements | Historial completo con filtros |
| Lista Usuarios | /users | Admin only |
| Lista Grupos | /groups | Admin only |
| Configuración | /settings | Notificaciones, empresa |

### Columnas de Lista de Productos (replicar de Dolibarr)

Las columnas visibles en la lista de productos son:
- Ref (ref)
- Etiqueta (label)
- Código de Barras (barcode)
- Stock deseado (desiredStock)
- Stock físico (stock)
- Posicion (posicion — campo extra)
- Color (color — campo extra)
- Nivel económico (nivelEconomico — campo extra)
- Marca (marca — campo extra)
- SubRubro (subrubro — campo extra)
- Rubro (rubro — campo extra)
- Talle (talle — campo extra)

### Columnas de Lista de Contactos

- Apellido (lastName)
- Nombre (firstName)
- Código postal (postalCode)
- Teléfono (phonePro)
- Celular (phoneMobile)
- Correo (email)
- Tercero (thirdParty.name)
- Alias (alias)
- Visibilidad (status)

### Columnas de Lista de Pedidos

- Ref (ref)
- Ref Cliente (clientRef)
- Tercero (thirdParty.name)
- Fecha (orderDate)
- Fecha entrega (deliveryDate)
- Nro Seguimiento (nroSeguimiento — campo extra)
- Agencia (agencia — campo extra)
- Total HT
- Estado (status)

---

## ROADMAP DE MIGRACIÓN

### FASE 1 — Backend Core (Semana 1-2)

1. Crear proyecto NestJS con TypeORM + **MySQL**
2. Implementar entidades TypeORM completas (ver esquema anterior)
3. Configurar y generar migraciones de TypeORM
4. Módulo Auth (JWT + bcrypt + Guards + RBAC)
5. Módulo Users + Groups
6. Módulo Third Parties + Contacts
7. **Tests en Jest por cada módulo.** Al finalizar la fase: ejecutar tests; no avanzar a Fase 2 hasta que pasen.

### FASE 2 — Catálogo y Stock (Semana 2-3)

1. Módulo Products (CRUD completo + filtros)
2. Módulo Warehouses
3. Módulo Stock (ProductStock + StockMovements + correcciones manuales)
4. Módulo Orders (CRUD + lógica de validación con transacción atómica)
5. Lógica de numeración SOyymm-nnnn
6. Notificaciones email (NestJS Mailer / Nodemailer)
7. **Tests Jest para los nuevos módulos. Ejecutar tests y no avanzar a Fase 3 hasta que pasen.**

### FASE 3 — ETL / Migración de Datos (Semana 3-4)

1. Script MySQL → CSV/JSON de cada tabla
2. Normalización: JOIN llx_product + llx_product_extrafields → products
3. Normalización: JOIN llx_socpeople + llx_socpeople_extrafields → contacts
4. Normalización: JOIN llx_commande + llx_commande_extrafields → orders
5. Normalización: JOIN llx_entrepot + llx_entrepot_extrafields → warehouses
6. Migrar catálogos (countries, provinces, units, etc.)
7. Migrar en orden de FK: users → groups → third_parties → contacts → products → warehouses → product_stocks → orders → order_lines → stock_movements
8. Validación de integridad post-migración (conteos, checksums)
9. **Ejecutar suite de tests del backend (Jest). No avanzar a Fase 4 hasta que pasen.**

### FASE 4 — Frontend ReactJS (Semana 4-6)

1. Setup React + TypeScript + Vite + TanStack Query + React Router + **Tailwind CSS** + **PrimeReact** (librería de componentes: inputs, DataTable, modales, etc.)
2. Layout base + Sidebar + Navbar
3. Login page + JWT storage
4. Dashboard
5. Products: lista con todos los filtros de campos extra (componentes PrimeReact + estilos Tailwind)
6. Orders: lista + detalle + creación + validación
7. Contacts: lista + detalle
8. Third Parties: lista + detalle con tabs
9. Stock: movimientos + alertas
10. Admin: Usuarios y Grupos

### FASE 5 — Testing y Deploy (Semana 6-7)

1. Tests unitarios NestJS (Jest) — completar cobertura; **gate:** todos los tests deben pasar antes de deploy
2. Tests e2e con Supertest
3. Documentación Swagger (decorators NestJS)
4. Docker Compose (NestJS + **MySQL** + Redis para queue)
5. CI/CD pipeline
6. Deploy + validación con datos reales migrados

---

## NOTAS DE MIGRACIÓN IMPORTANTES

### 1. Passwords de Usuarios
- Dolibarr almacena en `pass_crypted` con MD5 o SHA1 (inseguro)
- En el nuevo sistema (MySQL + NestJS) usar bcrypt con salt rounds 12
- Opciones: (a) forzar reset de password a todos los usuarios en primer login, (b) migrar con flag `mustChangePassword=true`

### 2. Archivos Adjuntos
- Dolibarr guarda archivos en el filesystem del servidor en `/home/dolibarr_documents/`
- En migración: copiar archivos al nuevo storage (S3, MinIO, o filesystem) y actualizar rutas en tabla files

### 3. IDs y Secuencias
- MySQL usa `AUTO_INCREMENT` en las columnas PK. Al migrar datos existentes, después de cargar cada tabla ajustar el siguiente valor de auto-increment para evitar choques (ej. desde un script o migración):
```sql
-- Ejemplo: después de cargar orders
SELECT COALESCE(MAX(id), 0) + 1 INTO @next FROM orders;
ALTER TABLE orders AUTO_INCREMENT = @next;
-- Repetir para cada tabla con AUTO_INCREMENT (users, products, etc.)
```
- Con TypeORM, las migraciones pueden crear las tablas; si se importan datos desde el MySQL de Dolibarr, ejecutar los `ALTER TABLE ... AUTO_INCREMENT` después de la carga.

### 4. Zona Horaria
- Argentina usa ARA (UTC-3, sin cambio de horario)
- Configurar MySQL con timezone (ej. `default-time-zone = 'America/Argentina/Buenos_Aires'` o en sesión)
- Configurar NestJS con date-fns-tz o dayjs con timezone

### 5. Extra Fields como Columnas
- **NO usar patrón EAV** — en Dolibarr los extra fields están en tablas separadas (*_extrafields) pero en el nuevo sistema (MySQL) deben ser columnas regulares en la tabla principal
- Esto mejora enormemente la performance de búsqueda y filtrado

### 6. Numeración de Pedidos Concurrente
- La función `generateOrderRef()` necesita protección contra condición de carrera en alta concurrencia
- Usar `SELECT ... FOR UPDATE` o una tabla de secuencias con lock:
```sql
CREATE TABLE order_sequences (
  year_month  VARCHAR(4) PRIMARY KEY,  -- ej: '2511'
  current_seq INTEGER DEFAULT 0
);
-- En la transacción:
UPDATE order_sequences SET current_seq = current_seq + 1 WHERE year_month = '2511' RETURNING current_seq;
```

### 7. Stock Negativo
- Configuración Dolibarr: stock no puede quedar negativo
- Implementar check en la transacción de validación de pedido
- Si el stock resultante sería < 0, lanzar excepción y rollback toda la transacción

### 8. Configuración Email
- Remitente actual: f.depositomails@gmail.com
- Configurar con SMTP de Gmail o migrar a SendGrid/SES para producción
- En NestJS: `@nestjs-modules/mailer` con Handlebars para templates HTML

---

## DICCIONARIOS (CATÁLOGOS)

Datos de los catálogos de Dolibarr que deben migrarse:

### Orígenes de Pedido (llx_c_input_reason)
Los distintos canales/fuentes por donde llegan los pedidos. Migrar como tabla `order_sources`.

### Condiciones de Pago (llx_c_payment_term)
- Al contado, 30 días, 60 días, etc. Migrar como tabla `payment_terms`.

### Modos de Pago (llx_c_paiement)
- Efectivo, Transferencia, Cheque, etc. Migrar como tabla `payment_methods`.

### Unidades de Medida (llx_c_units)
- Unidad, Par, Docena, etc. Migrar como tabla `measurement_units`.

### Tipos de Terceros (llx_c_typent)
- Cliente, Proveedor, etc. Migrar como columna enum o FK en `third_parties`.

---

## MÓDULOS Y FUNCIONALIDADES ADICIONALES IDENTIFICADAS (Revisión Marzo 2026)

> **Contexto:** Exploración en vivo del sistema Dolibarr en http://137.184.15.234 en Marzo 2026 reveló funcionalidades de stock, inventarios y pedidos que no estaban completamente documentadas. Esta sección detalla todo lo que falta desarrollar en Backend (Fase 2) y Frontend (Fase 4).

---

### A. INVENTARIOS FÍSICOS — Módulo completo

El módulo de inventarios físicos permite contar el stock real en depósito y ajustarlo automáticamente generando movimientos de stock.

#### Flujo en Dolibarr
```
BORRADOR → APROBADO (Pago parcial) → VALIDADO (genera movimientos y cierra)
```
- Se crea con: Ref., Etiqueta, Almacén, Producto (opcional para filtrar), etiquetas/categorías
- Se agregan líneas con: Almacén + Producto + Cant. Esperada (calculada del sistema) + Cant. Real (conteo físico)
- Acciones auxiliares: "Llenar cant. real con cant. esperada", "Borrar todas las cantidades", "Cantidad real completa escaneando"
- Al hacer "GENERAR MOVIMIENTOS Y CERRAR": se crean movimientos de stock (tipo 3=inventario) para cada diferencia entre Cant.Esperada y Cant.Real

#### Tabla faltante: llx_inventorydet (InventoryLine)

| Campo MySQL | Campo destino | Tipo | Notas |
|-------------|---------------|------|-------|
| rowid | id | SERIAL PK | |
| fk_inventory | inventoryId | INT FK | |
| fk_warehouse | warehouseId | INT FK | |
| fk_product | productId | INT FK | |
| qty | expectedQuantity | REAL | cantidad esperada (stock actual) |
| qty_stock | realQuantity | REAL | cantidad contada físicamente |
| fk_user_author | createdByUserId | INT FK | |
| datec | createdAt | TIMESTAMP | |
| tms | updatedAt | TIMESTAMP | |

#### Actualización entidad Inventory (agregar campo product filter)

```typescript
// Agregar a inventory.entity.ts
@Column({ type: 'int', nullable: true })
productId: number | null; // filtro opcional: solo contar este producto
```

#### Nueva entidad InventoryLine

```typescript
// inventory-line.entity.ts
@Entity('inventory_lines')
export class InventoryLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  inventoryId: number;

  @Column({ type: 'int', nullable: true })
  warehouseId: number | null;

  @Column({ type: 'int', nullable: true })
  productId: number | null;

  @Column({ type: 'float', nullable: true })
  expectedQuantity: number | null;

  @Column({ type: 'float', nullable: true })
  realQuantity: number | null;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Inventory, (i) => i.lines, { onDelete: 'CASCADE' })
  inventory: Inventory;

  @ManyToOne(() => Product)
  product: Product | null;

  @ManyToOne(() => Warehouse)
  warehouse: Warehouse | null;
}
```

#### Nuevos endpoints — Inventarios

```
GET    /inventories                       → lista paginada (filtros: estado, almacén, fecha)
POST   /inventories                       → crear inventario (ref, label, warehouseId, productId)
GET    /inventories/:id                   → detalle con líneas y expected qty calculada
POST   /inventories/:id/lines             → agregar línea (warehouseId, productId, realQuantity)
PATCH  /inventories/:id/lines/:lineId     → actualizar cantidad real
DELETE /inventories/:id/lines/:lineId     → eliminar línea
POST   /inventories/:id/validate          → generar movimientos y cerrar (transacción atómica)
POST   /inventories/:id/reset             → volver a borrador
DELETE /inventories/:id                   → eliminar inventario borrador
```

#### Lógica de validación de inventario (transacción atómica)

Al ejecutar `POST /inventories/:id/validate`:
1. Para cada línea: calcular diferencia `delta = realQuantity - expectedQuantity`
2. Si delta ≠ 0: crear StockMovement (type=3, inventoryCode=inventory.ref, quantity=delta)
3. Actualizar ProductStock con el nuevo quantity (real)
4. Actualizar product.stock (suma global)
5. Marcar inventory.status = 1 (validado)
6. Todo en una única transacción QueryRunner

---

### B. CORRECCIÓN DE STOCK INDIVIDUAL

Desde la ficha del almacén (y desde cada producto en la lista del almacén) se puede hacer una corrección manual de stock para un producto específico.

Campos del formulario:
- Almacén (dropdown)
- Producto (autocomplete)
- Cantidad (positivo=entrada, negativo=salida)
- Código de movimiento / Etiqueta (texto libre)
- Fecha

Esto ya existe parcialmente en el backend (`POST /stock/movements`), pero el endpoint debe soportar también un `inventoryCode` para los ajustes manuales.

#### Actualización al DTO de movimiento manual

```typescript
// stock-correction.dto.ts
export class StockCorrectionDto {
  @IsInt()
  warehouseId: number;

  @IsInt()
  productId: number;

  @IsNumber()
  quantity: number; // positivo=entrada, negativo=salida

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  inventoryCode?: string; // código de inventario/referencia manual

  @IsDateString()
  @IsOptional()
  movedAt?: string;
}
```

---

### C. TRANSFERENCIA DE STOCK ENTRE ALMACENES

Formulario "Cambio de existencias a granel" (`/product/stock/massstockmove.php`):
- **Almacén origen** (opcional — si vacío, es una entrada de stock)
- **Almacén destino** (requerido)
- **Producto** (requerido)
- **Cantidad** (número)
- Alternativamente: **Importar CSV** con múltiples movimientos en lote

En Dolibarr genera 2 movimientos de stock: uno negativo en el almacén origen y uno positivo en el destino.

#### Endpoint de transferencia (ya definido, ampliar con CSV)

```
POST /stock/transfer              → { fromWarehouseId?, toWarehouseId, productId, quantity, label }
POST /stock/transfer/bulk-csv     → importar CSV de movimientos masivos
```

---

### D. REPORTE STOCK A FECHA

Pantalla `/product/stock/stockatdate.php`:
- Permite consultar el stock histórico de todos los productos en una fecha pasada o futura
- Calcula: stock_actual + sum(movimientos posteriores a la fecha) = stock en esa fecha

Tabs: "Fecha en el pasado" / "Fecha en el futuro"

Filtros: Fecha (requerida), Producto (opcional), Almacén (multi-select, default: todos)

Columnas resultado:
| Columna | Descripción |
|---------|-------------|
| Ref. | Referencia del producto |
| Etiqueta | Nombre del producto |
| Stock a fecha | Stock calculado para esa fecha |
| Valor de compra (PMP) | Precio medio ponderado de compra |
| Valor de venta | Precio de venta × stock |
| Stock actual | Stock actual en el sistema |

#### Nuevo endpoint — Stock a fecha

```
GET /stock/at-date?date=2026-01-01&warehouseId=1&productId=5   → stock histórico
  Respuesta: [{ productId, ref, label, stockAtDate, currentStock, pmpValue, saleValue }]
```

**Lógica de cálculo (pasado):**
```sql
-- Stock en fecha X = stock_actual + SUM(qty de movimientos con movedAt > X)
SELECT ps.productId, ps.quantity AS currentStock,
       ps.quantity + COALESCE(SUM(sm.quantity), 0) AS stockAtDate
FROM product_stocks ps
LEFT JOIN stock_movements sm ON sm.productId = ps.productId
  AND sm.warehouseId = ps.warehouseId
  AND sm.movedAt > :targetDate
WHERE ps.warehouseId = :warehouseId
GROUP BY ps.productId, ps.quantity
```

---

### E. ESTADÍSTICAS DE PRODUCTOS

Pantalla `/product/stats/card.php`:

Tabs:
1. **Gráfico** — gráfico de barras por mes del año seleccionado
2. **Productos/Servicios por popularidad** — ranking de productos

Filtros:
- Tipo: Producto / Servicio
- Producto o servicio (opcional, para ver un solo producto)
- Año (selector, default: año actual)
- Tercero (opcional, para ver ventas a un cliente específico)

Sub-vistas (links dentro del gráfico):
- "Estadísticas en número de **unidades** de producto/servicio"
- "Estadísticas por número de **entidades referentes** (no. de facturas, pedidos...)"
- "Estadísticas sobre **cantidad** de productos/servicios"

#### Nuevo endpoint — Estadísticas de Productos

```
GET /products/stats?year=2026&thirdPartyId=1&productId=5
  Respuesta: {
    byMonth: [{ month: 1, units: 150, orders: 5 }, ...],
    topProducts: [{ productId, ref, label, totalUnits, totalOrders }]
  }

GET /products/stats/popularity?year=2026&type=product
  Respuesta: [{ productId, ref, label, totalUnits, totalOrders, rank }]
```

---

### F. ESTADÍSTICAS DE PEDIDOS

Pantalla `/commande/stats/index.php`:

Tab: **Por mes/año**

Filtros:
- Tercero (cliente)
- Tipo de Tercero
- Etiqueta/categoría cliente
- Creado por (usuario)
- Estado del pedido
- Año

Tabla resultado:
| Columna | Descripción |
|---------|-------------|
| Año | Año |
| Número de pedidos | Total pedidos en ese año |
| % | Variación respecto al año anterior |
| Monto total | Suma totalHT |
| % | Variación |
| Monto promedio | Promedio por pedido |

Gráficos:
1. Número de pedidos por mes (barras multicolor por año)
2. Importe total por mes
3. Monto promedio por mes

Datos reales: 2026=69 pedidos, 2025=499, 2024=250 (total ~818)

#### Nuevo endpoint — Estadísticas de Pedidos

```
GET /orders/stats?year=2026&thirdPartyId=1&status=3&createdByUserId=2
  Respuesta: {
    byYear: [{ year: 2026, count: 69, total: 0, avg: 0 }, ...],
    byMonth: [{ month: 1, count: 15, total: 0, avg: 0 }, ...],
    byStatus: [{ status: 0, label: 'Borrador', count: 100 }, ...]
  }
```

---

### G. FORMULARIO COMPLETO DE ALMACÉN (Nuevo Almacén)

El formulario de creación de almacén tiene más campos de los documentados originalmente:

| Campo Dolibarr | Campo destino | Tipo | Notas |
|----------------|---------------|------|-------|
| ref (Ref.) | name | VARCHAR(128) | requerido, identificador único |
| lieu (Nombre corto ubicación) | shortName | VARCHAR(255) | nombre corto de la zona |
| fk_parent (Añadir en) | parentId | INT FK | almacén padre (jerarquía) |
| description | description | TEXT | rich text |
| address | address | TEXT | dirección física |
| zip | postalCode | VARCHAR(25) | código postal |
| town | city | VARCHAR(50) | ciudad |
| fk_pays | countryId | INT | país (default: Argentina) |
| phone | phone | VARCHAR(20) | teléfono |
| fax | fax | VARCHAR(20) | fax |
| statut | status | SMALLINT | 1=Abierto, 0=Cerrado |
| (extra) lowstock | lowstockAlarm | BOOLEAN | alarma si no hay stock (checkbox) |

> **Nota:** El campo `lowstock` ya estaba documentado como campo extra, pero ahora queda confirmado que es la opción "Alarma si no hay stock" del formulario, checkbox activado por defecto.

#### Actualizar entidad Warehouse para agregar campos faltantes

```typescript
// Agregar a warehouse.entity.ts
@Column({ type: 'varchar', length: 255, nullable: true })
shortName: string | null; // nombre corto de ubicación

@Column({ type: 'text', nullable: true })
address: string | null;

@Column({ type: 'varchar', length: 25, nullable: true })
postalCode: string | null;

@Column({ type: 'varchar', length: 50, nullable: true })
city: string | null;

@Column({ type: 'int', nullable: true })
countryId: number | null;

@Column({ type: 'varchar', length: 20, nullable: true })
phone: string | null;

@Column({ type: 'varchar', length: 20, nullable: true })
fax: string | null;

@Column({ type: 'boolean', default: true })
lowstockAlarm: boolean;
```

---

### H. DATOS ADICIONALES DE PEDIDOS

#### Ficha de pedido — tabs completos

| Tab | Descripción |
|-----|-------------|
| Ordenes de venta | Cabecera + líneas del pedido |
| Contactos/Direcciones | Contactos vinculados al pedido |
| Notas | Nota pública + nota privada |
| Archivos enlazados | PDFs generados y archivos adjuntos |
| Eventos | Log de eventos (validación, despacho, etc.) |

#### Campo adicional en pedido: Fuente

En la ficha del pedido existe un campo **"Fuente"** (source) que no estaba en el formulario de creación inicial pero sí aparece en la vista de detalle del borrador. Mapea a `llx_c_input_reason` (ya documentado como `order_sources`).

#### Flujo real de estados en Dolibarr

```
BORRADOR → [botón: PEDIR APROBACION] → APROBADO (status=1)
APROBADO → [botón: VALIDAR] → EN PROCESO (status=2)   ← stock se decrementa aquí
EN PROCESO → [botón: DESPACHAR] → DESPACHADO (status=3) ← email ORDER_CLOSE
APROBADO / EN PROCESO → [botón: CANCELAR] → CANCELADO (-1) ← revierte stock
DESPACHADO / CANCELADO → [botón: REABRIR] → BORRADOR (status=0)
```

> **Nota importante:** En Dolibarr, "PEDIR APROBACION" lleva al estado 1 (Aprobado), que en nuestro sistema es "VALIDADO". El decremento de stock ocurre al pasar a APROBADO (status=1), no a EN PROCESO (status=2). El botón en Dolibarr se llama "PEDIR APROBACION" pero semánticamente es la validación del pedido.

#### Líneas de pedido — campos adicionales

Las líneas de pedido (llx_commandedet) en el formulario de edición muestran: **P.U.(neto)**, **Ctd**, **Dto.**. En los pedidos despachados solo se muestra Descripción + Ctd (los precios son 0.00 en este sistema logístico).

---

### I. FICHA DE ALMACÉN — DETALLES ADICIONALES

La ficha de un almacén tiene 3 tabs:
1. **Almacén** — stock actual: lista de todos los productos con "Número de piezas", acciones "Transferir stock" y "Corrección stock" por producto
2. **Movimientos de stock** — lista de todos los movimientos del almacén (con filtro de fecha)
3. **Log** — log de auditoría del almacén

Datos del almacén "Almacen general":
- Valor compra (PMP): 0.00 $ (sin valorización)
- Último movimiento: 26/02/2026 03:58 PM
- Nro productos únicos: 660
- Nro total de unidades: 73.448

---

### J. RESUMEN DE ENDPOINTS FALTANTES A IMPLEMENTAR

Agregar a la lista de endpoints existentes:

```
# Inventarios Físicos
GET    /inventories                          → lista paginada
POST   /inventories                          → crear
GET    /inventories/:id                      → detalle con líneas
POST   /inventories/:id/lines               → agregar línea
PATCH  /inventories/:id/lines/:lineId       → actualizar real qty
DELETE /inventories/:id/lines/:lineId       → eliminar línea
POST   /inventories/:id/validate            → generar movimientos + cerrar
POST   /inventories/:id/reset              → volver a borrador
DELETE /inventories/:id                     → eliminar borrador

# Stock adicional
GET    /stock/at-date                        → stock en fecha histórica (?date&warehouseId)
POST   /stock/transfer/bulk                  → movimientos masivos en lote

# Estadísticas
GET    /products/stats                       → stats productos por mes/año
GET    /products/stats/popularity            → productos por popularidad
GET    /orders/stats                         → stats pedidos por mes/año/estado

# Dashboard (actualizar)
GET    /dashboard/order-stats               → conteo de pedidos por estado para gráfico torta
```

---

### K. RESUMEN DE PANTALLAS FRONTEND FALTANTES

Agregar a la tabla de pantallas de la Fase 4:

| Pantalla | Ruta React | Descripción |
|----------|------------|-------------|
| Lista Inventarios | /inventories | Lista con ref, etiqueta, almacén, estado |
| Nuevo Inventario | /inventories/new | Formulario: ref, etiqueta, almacén, producto (filtro) |
| Detalle Inventario | /inventories/:id | Tabs: Tarjeta (info) + Inventario (líneas con conteo) |
| Stock a Fecha | /stock/at-date | Reporte: filtros fecha/almacén, tabla con stock histórico |
| Cambio Masivo Stock | /stock/mass-move | Form: origen, destino, producto, qty (o CSV import) |
| Estadísticas Productos | /products/stats | Gráficos de barras por mes + ranking popularidad |
| Estadísticas Pedidos | /orders/stats | Gráfico torta estados + barras por mes + tabla resumen |
| Corrección Stock | Modal/drawer desde almacén | Desde ficha almacén: producto + qty + label + fecha |

---

### L. MÓDULOS NestJS NUEVOS A DESARROLLAR

| Módulo | Archivo | Descripción |
|--------|---------|-------------|
| `inventories` | `src/inventories/` | CRUD + validación con transacción atómica |
| `inventory-lines` | (dentro de inventories) | Líneas del inventario físico |

Módulos existentes a **extender**:
| Módulo | Extensión |
|--------|-----------|
| `stock` | Agregar: `GET /stock/at-date`, `POST /stock/transfer/bulk` |
| `warehouses` | Agregar campos: shortName, address, postalCode, city, countryId, phone, fax, lowstockAlarm |
| `orders` | Agregar: `GET /orders/stats` |
| `products` | Agregar: `GET /products/stats`, `GET /products/stats/popularity` |
| `dashboard` | Agregar: `GET /dashboard/order-stats` |

---

### M. ACTUALIZACIÓN DE ROADMAP

#### Fase 2 — Revisión y Expansión (revisar antes de Fase 4)

Los siguientes ítems deben agregarse o verificarse en la Fase 2:

1. ✅ Módulo Products, Warehouses, Stock, Orders (ya implementados)
2. **NUEVO** — Módulo Inventories (CRUD + lógica de validación atómica con QueryRunner)
3. **NUEVO** — Endpoint `GET /stock/at-date` con cálculo histórico SQL
4. **NUEVO** — Endpoint `POST /stock/transfer/bulk` para movimientos masivos
5. **NUEVO** — Endpoint `GET /products/stats` y `GET /orders/stats`
6. **AMPLIAR** — Entidad Warehouse con campos: shortName, address, postalCode, city, countryId, phone, fax, lowstockAlarm
7. **AMPLIAR** — Entidad Inventory con relación `OneToMany` → InventoryLine
8. Tests Jest para todos los nuevos endpoints/servicios

#### Fase 4 — Frontend nuevas pantallas

1. Pantalla `/inventories` — lista + nuevo + detalle con conteo de líneas
2. Pantalla `/stock/at-date` — reporte histórico
3. Pantalla `/stock/mass-move` — transferencias masivas
4. Pantalla `/products/stats` — estadísticas con gráficos PrimeReact Chart
5. Pantalla `/orders/stats` — estadísticas con gráficos PrimeReact Chart
6. Modal de "Corrección Stock" accesible desde la ficha de almacén

---

*Fin del documento de análisis y migración.*
*Generado: Marzo 2026 | Revisado: Marzo 2026 (exploración en vivo)*
