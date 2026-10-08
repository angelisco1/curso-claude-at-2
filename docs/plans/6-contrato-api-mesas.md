# Contrato API ⇄ webs — Gestión de mesas (issue #6)

> Propietario: agente `api`. Es el único que edita este fichero. Las webs proponen cambios por mensaje al agente `api`.
> Estado: **ACORDADO v3** (agente `api`). Confirmado por `web-admin`, `web-clientes` y `web-empleados`.

## Base

- Prefijo: `/api/v1/restaurants/:restaurantId/tables`. Todas las rutas con `Authorization: Bearer <jwt>`.
- Las webs usan `API_URL` de `@resttek/web-shared` y el interceptor de auth que ya existe en cada web.
- Formato de error (el de `errorHandler` actual): `{ error: "<NombreDelError>", message: "<texto>" }`. Las respuestas 401/403 de los middlewares son `{ error: "Unauthorized: ..." }` / `{ error: "Forbidden: ..." }`.

## Modelo

```ts
type TableStatus = 'libre' | 'ocupada' | 'reservada'

interface Table {
  id: string
  restaurantId: string
  number: number
  description: string | null
  capacity: number
  status: TableStatus
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
}
```

## Endpoints

| Método y ruta | Roles | Body / query | Respuesta OK |
|---|---|---|---|
| `GET /` | admin, manager, camarero, cocinero | — | `200 Table[]` ordenadas por `number` |
| `GET /available` | cualquier autenticado | `?people=N` | `200 Table[]` libres con `capacity >= N`, orden `capacity`, `number` |
| `GET /:id` | admin, manager, camarero, cocinero | — | `200 Table` |
| `POST /` | admin | `{ number, description?, capacity, status? }` | `201 Table` (`status` por defecto `libre`) |
| `PUT /:id` | admin | `{ number, description?, capacity, status }` | `200 Table` |
| `DELETE /:id` | admin | — | `204` sin cuerpo |
| `PATCH /:id/status` | admin, manager, camarero, cocinero | `{ status }` | `200 Table` |
| `POST /:id/occupy` | cualquier autenticado | `{ people }` | `200 Table` (estado `ocupada`) |

### Reglas de validación y semántica (v2)

- `number`, `capacity` y `people` del body deben ser **números enteros JSON** mayores que 0 (`"4"` como string → 400). En `GET /available` `people` llega por query (`?people=3`) y se convierte a número; ausente, `0`, negativo, decimal o no numérico → `400 InvalidPeopleError`.
- `description` es opcional; si no se envía, o se envía `""`/`null`, se guarda `null`.
- `status` se acepta sin distinguir mayúsculas ni espacios (`" LIBRE "` → `libre`). En `POST /` es opcional (por defecto `libre`); en `PUT /:id` es **obligatorio** (la web debe enviar el estado actual si no lo cambia).
- `PUT /:id` conserva `id`, `restaurantId` y `createdAt`; actualiza `updatedAt`.
- `POST /:id/occupy` sobre una mesa que **ya ocupa el mismo usuario** y con `capacity >= people` → `200` con la mesa (idempotente: recargar o reintentar no da 409). Si `capacity < people` → `409` también para el ocupante (la mesa sigue siendo suya). Ocupada por otro o `reservada` → `409 TableNotAvailableError`.
- `PUT`/`PATCH status` a `ocupada` conserva el ocupante que hubiera; si la mesa no tenía ocupante (p. ej. el admin la marca `ocupada` a mano), queda ocupada sin cliente asociado. A `libre` o `reservada` se limpia el ocupante.
- Restricción por restaurante (decisión 3): para `manager`, `camarero` y `cocinero` con `restaurantId` del token distinto del de la URL → `403 { error: "Forbidden: Restaurant mismatch" }`.

## Errores

| Error (`error`) | `message` | HTTP |
|---|---|---|
| `TableNotFoundError` | `Table not found` | 404 |
| `InvalidTableNumberError` | `Table number must be a positive integer` | 400 |
| `InvalidCapacityError` | `Capacity must be a positive integer` | 400 |
| `InvalidTableStatusError` | `Invalid table status: X. Must be one of: libre, ocupada, reservada` | 400 |
| `InvalidPeopleError` | `People must be a positive integer` | 400 |
| `DuplicatedTableNumberError` | `Table number already exists in this restaurant` | 409 |
| `TableNotAvailableError` | `Table is not available` | 409 |
| `TableOccupiedError` | `Cannot delete an occupied table` | 409 |

## Decisiones sobre las preguntas abiertas del plan (propuesta del orquestador)

1. **Liberación automática de la mesa: NO.** No existe el concepto de pago y un pedido `entregado` no implica que el cliente se haya ido. La liberan empleados/admin con `PATCH /:id/status` (`libre`).
2. **`POST /api/v1/orders` valida el `tableId`: SÍ.** `tableId` sigue siendo opcional (`null` permitido, retrocompatible). Si viene informado: la mesa debe existir y pertenecer a `restaurantId` (si no → `404 TableNotFoundError`) y estar `ocupada` (si no → `409 TableNotAvailableError`). Nueva tarea de la api (17).
3. **Empleados limitados a su restaurante en las rutas de mesas: SÍ.** El JWT ya lleva `restaurantId`. Si el rol es `manager`, `camarero` o `cocinero` y `req.user.restaurantId !== :restaurantId` → `403 { error: "Forbidden: ..." }`. `admin` y `cliente` no tienen esa restricción. Ingredientes y platos no se tocan (fuera de alcance).
4. **Un cliente solo ocupa una mesa por restaurante: SÍ.** La api guarda internamente quién ocupa la mesa (columna `occupied_by`, **no** se expone en `Table`). Si un usuario con mesa ocupada en ese restaurante ocupa otra, en la misma transacción se ocupa la nueva y se libera la anterior (así funciona **Cambiar mesa** en web-clientes y no se pueden bloquear mesas en masa). Si la nueva no está disponible (409), la anterior se conserva. Al pasar una mesa a `libre` o `reservada` por `PATCH status`/`PUT`, `occupied_by` se limpia.

## Pedidos (sin cambios de forma)

- `GET /api/v1/orders/active` ya devuelve `tableId` en cada pedido; web-empleados lo agrupa por mesa en el cliente.
- `POST /api/v1/orders` body: `{ restaurantId, tableId, items }` (web-clientes envía el id de la mesa elegida).
- Si `tableId` viene informado y no es válido, `POST /orders` responde con el formato de `errorHandler`: `404 { error: "TableNotFoundError", message: "Table not found" }` (no existe o es de otro restaurante) o `409 { error: "TableNotAvailableError", message: "Table is not available" }` (no está `ocupada`). El resto de errores de `POST /orders` no cambian (`400 { error: "<mensaje>" }`). Los nombres `TableNotFoundError` y `TableNotAvailableError` del campo `error` son estables (web-clientes se basa en ellos).
- `POST /orders` solo comprueba que la mesa esté `ocupada`, **no** quién la ocupa: un pedido para una mesa ocupada por otro usuario se acepta.

## Registro de cambios

- v1 (orquestador): borrador inicial a partir del plan + decisiones 1–4.
- v2 (api): se aceptan las decisiones 1–4 sin cambios (ninguna web envió propuestas antes de cerrar la tarea 6 de la api). Aclaraciones añadidas por `api`: tipos estrictos de `number`/`capacity`/`people`; `description` vacía → `null`; `status` obligatorio en `PUT`; `occupy` idempotente para el usuario que ya ocupa la mesa (evita 409 al recargar en web-clientes); cuerpo exacto del 403 por restaurante; forma de los errores de `tableId` en `POST /orders`.
- v3 (api): propuestas recibidas tras publicar la v2. **web-clientes** — P1: `occupy` idempotente para el mismo ocupante con `capacity >= people` → aceptado (ya estaba en v2; se añade la condición de capacidad, que la v2 no aplicaba al ocupante); P2: nombres de error estables en `POST /orders` y pedido a mesa ocupada por otro usuario → confirmado: se acepta. **web-admin** — `PUT` a `ocupada` deja el ocupante a `null` si no había y no limpia uno existente → confirmado y documentado. **web-empleados** — sin cambios; el 403 por restaurante mantiene el formato `{ error: "Forbidden: ..." }` → confirmado.
