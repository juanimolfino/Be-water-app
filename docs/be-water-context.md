# Be Water app: contexto para cambios visuales

Este documento resume las reglas de negocio y los archivos que conviene respetar cuando se hagan ajustes visuales. La app es Next.js App Router con React, Tailwind y componentes simples en `components/ui`.

## Cómo verificar antes de commitear

Comandos mínimos después de tocar UI o lógica:

```bash
npm test -- --run lib/activities/pricing.test.ts lib/reports/date.test.ts lib/reports/payment-period.test.ts lib/reports/money.test.ts lib/sales/status.test.ts
npm run build
git diff --check
```

Si hay cambios de schema:

```bash
npm run db:generate
npm run db:migrate
```

## Rutas principales

- `/admin`: inicio admin.
- `/admin/activities`: actividades propias y de terceros.
- `/admin/sellers`: empleados. Incluye vendedores e instructores/DM.
- `/admin/sales`: ventas y validación de comisiones.
- `/admin/agenda`: agenda semanal.
- `/admin/report`: ingresos.
- `/admin/expenses`: gastos.
- `/admin/profits`: ganancias.
- `/admin/settings`: días de cierre/pago.
- `/seller`: vendedor carga ventas.
- `/seller/agenda`: vendedor ve agenda y puede agregar avisos.

## Navegación admin

Archivo: `components/admin/admin-nav.tsx`.

- La solapa activa se pinta con `bg-primary/10 text-primary ring-1 ring-primary/20`.
- “Ventas” muestra alerta si hay comisiones pendientes por validar.
- “Ingresos” muestra alerta si hay pagos pendientes a proveedores.
- La ruta `/admin/report` se llama visualmente “Ingresos”. No renombrar el contenido interno sin revisar reportes.

El layout que alimenta esos contadores está en `app/admin/layout.tsx`.

## Ventas

Archivos principales:

- `app/admin/sales/page.tsx`
- `components/seller/sale-form.tsx`
- `app/api/admin/sales/route.ts`
- `app/api/seller/sales/route.ts`
- `lib/activities/pricing.ts`
- `lib/db/queries.ts`

Reglas:

- Los medios de pago visibles son:
  - `cash`: Efectivo.
  - `card`: Tarjeta, suma 13%.
  - `via_link`: Vía link, suma 3%.
  - `referral`: Referenciado, el monto se carga a mano.
- `tour_operator` todavía existe en el enum por compatibilidad histórica, pero no debe ofrecerse como opción nueva en los formularios.
- Si la venta la carga un admin, no corresponde comisión de vendedor en tablas: mostrar `—`.
- Si la venta la carga un vendedor, la comisión puede estar `pending`, `approved` o `rejected`.
- Una venta cancelada/anulada tiene `reservationStatus = "cancelled"` y no debe contar como ingreso, comisión ni deuda pendiente activa.
- La tabla historial de ventas del admin muestra de a 10 ventas y tiene filtro por mes.

## Estados de reservas y agenda

Archivo de helpers: `lib/sales/status.ts`.

- `reservationStatus = "cancelled"` siempre gana: se muestra anulada/cancelada.
- En agenda, el color de una reserva depende de si el cliente pagó:
  - `paymentStatus = "paid"`: confirmada/verde.
  - `paymentStatus = "unpaid"`: debe/rojo.
- Esto es independiente del estado de comisión del vendedor.

## Actividades

Archivos principales:

- `app/admin/activities/page.tsx`
- `components/admin/activity-manager.tsx`
- `components/admin/activity-form.tsx`
- `lib/db/schema.ts`

Reglas:

- Actividad propia: `isOwnActivity = true`.
- Actividad de terceros: `isOwnActivity = false`.
- Para terceros, `netPrice` es lo que se debe pagar al proveedor por unidad.
- Para propias, se pueden asignar responsables en agenda.
- Para terceros, no se asignan responsables/instructores en agenda.

## Agenda

Archivos principales:

- `app/admin/agenda/page.tsx`
- `app/seller/agenda/page.tsx`
- `components/agenda/weekly-agenda.tsx`
- `components/agenda/agenda-controls.tsx`
- `components/agenda/responsible-select.tsx`
- `app/api/admin/agenda/items/route.ts`
- `app/api/admin/agenda/items/[id]/route.ts`
- `app/api/admin/agenda/items/[id]/responsible/route.ts`
- `app/api/admin/agenda/notices/route.ts`
- `app/api/seller/agenda/notices/route.ts`

Secciones visuales dentro de cada día:

1. “Ventas por fuera”: actividades agregadas manualmente a agenda, no nacen de una venta normal.
2. “Propias”: ventas de actividades Be Water.
3. “Terceros”: ventas de proveedores externos.
4. Avisos/alertas: tarjetas amarillas al final del día.

Reglas:

- Al agregar una venta por fuera o un aviso, el formulario debe cerrarse.
- Las ventas por fuera se crean desde actividades cargadas por admin, no texto libre.
- Si la actividad manual es de terceros, no se asigna responsable.
- Las ventas por fuera se pueden quitar desde agenda, pero el borrado es lógico: `agenda_items.active = false`.
- Los avisos son mensajes informativos por día; se muestran en amarillo y abajo de todo.
- El botón “Marcar pagado” en terceros impagos debe verse rojo porque es una deuda pendiente.

## Empleados

Archivos principales:

- `app/admin/sellers/page.tsx`
- `components/admin/employee-tables.tsx`
- `components/admin/seller-form.tsx`
- `components/admin/staff-form.tsx`
- `app/api/admin/sellers/route.ts`
- `app/api/admin/sellers/[id]/route.ts`
- `app/api/admin/staff/route.ts`
- `app/api/admin/staff/[id]/route.ts`

Reglas:

- La solapa se llama “Empleados”.
- Hay dos mundos separados:
  - Vendedores: usuarios con login, pueden vender.
  - Instructores/DM: staff organizacional para asignar responsables de tours.
- Una persona puede existir como vendedor y también como instructor/DM, pero no se mezclan sus funciones.
- Instructores/DM tienen:
  - rol: Instructor o DM.
  - afiliación: Be Water o Freelance.
  - teléfono opcional con shortcut a WhatsApp.
- En la lista, Be Water debe aparecer arriba y Freelancers separado abajo.
- Editar/borrar empleados no debe borrar físicamente: usa `active = false` para inactivar.

## Ingresos

Archivo principal: `app/admin/report/page.tsx`.

Reglas:

- Por default muestra el período actual según días de cierre/pago configurados.
- El texto esperado es `Período actual: inicio al próximo pago`.
- `Ingresos` sólo suma ventas activas. Canceladas/anuladas no cuentan.
- “Pagos a proveedores”:
  - Pendientes siempre visibles.
  - Pagados y cancelados recientes se limitan y pueden expandirse.
  - Una venta cancelada aparece como `Cancelado`.
  - Una deuda activa puede marcarse pagada con efectivo o transferencia.
- “Ventas por día” usa ventas activas.
- “Detalle de ventas” puede mostrar canceladas para historial, pero en columnas de dinero deben aparecer como `—`.

## Ganancias

Archivo principal: `app/admin/profits/page.tsx`.

Reglas:

- Por default usa el período actual completo, igual que ingresos/ventas.
- El período analizado debe cubrir desde el día posterior al último pago hasta el próximo pago configurado, no sólo hasta hoy.
- No debe mostrar filtros de categoría de gasto ni proveedor de gasto.
- Ingresos de ganancia sólo consideran ventas activas.
- Deducciones:
  - Incentivos aprobados a vendedores.
  - Pagos a terceros ya marcados como pagados.
  - Gastos reales cargados en `/admin/expenses`.

## Gastos

Archivo principal: `app/admin/expenses/page.tsx`.

Reglas:

- Por default usa “Período actual” y ese botón debe aparecer pintado.
- El período actual debe ser el período de cierre/pago completo, no sólo hasta hoy.
- Etiquetas:
  - “Incentivos vendedores” debe mostrarse sólo como “Incentivos”.
  - “Proveedores terceros” debe mostrarse sólo como “A terceros”.

## Pagos a proveedores

Archivos principales:

- `app/admin/report/page.tsx`
- `components/sales/provider-payment-button.tsx`
- `app/api/admin/sales/[id]/provider-payment/route.ts`
- `lib/db/queries.ts`

Reglas:

- Sólo aplica a actividades de terceros (`isOwnActivity = false`).
- El monto a pagar se calcula como `netPrice * quantity`.
- Si la venta se cancela, debe verse con estado `Cancelado`.
- Si está activa y pendiente, debe mostrar botón “Marcar pagado”.
- Al marcar pagado, preguntar método: efectivo o transferencia.
- Una vez pagado:
  - `providerPaymentStatus = "paid"`.
  - se guarda `providerPaymentMethod`.
  - queda con tilde verde.
  - empieza a contar como dinero salido para terceros en Ganancias.

## Períodos de pago

Archivo: `lib/reports/payment-period.ts`.

Reglas:

- Los días de pago se configuran en `/admin/settings`.
- Default histórico: `[1, 15]`.
- Si el último cierre/pago fue el 15, el período actual arranca el 16.
- El período actual termina en el próximo día de pago, no en “hoy”.
- Ejemplo con pagos 1 y 15, estando en 2026-07-18:
  - período actual: 2026-07-16 a 2026-08-01.

## Base de datos: campos sensibles para no romper UX

Archivo: `lib/db/schema.ts`.

- `users.active`: vendedores/admins inactivos no se borran físicamente.
- `staffMembers.active`: instructores/DM inactivos no se borran físicamente.
- `activities.active`: actividades inactivas no se ofrecen como nuevas.
- `agendaItems.active`: ventas por fuera quitadas de agenda quedan inactivas.
- `sales.reservationStatus`: `active` o `cancelled`.
- `sales.paymentStatus`: si el cliente pagó o debe.
- `sales.providerPaymentStatus`: si se le debe/pagó al proveedor.
- `sales.commissionStatus`: estado de comisión del vendedor.

## Convenciones visuales actuales

- Verde/emerald: pagado, aprobado, confirmado.
- Amarillo/amber: pendiente, aviso, atención.
- Rojo/destructive: deuda, cancelación, falta pagar.
- Gris/muted: texto secundario, datos no aplicables, `—`.

Mantener estas asociaciones ayuda a que admin y vendedores entiendan rápido qué requiere acción.
