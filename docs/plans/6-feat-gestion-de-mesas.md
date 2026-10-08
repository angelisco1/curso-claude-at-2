# Gestión de mesas

| | |
|---|---|
| **Issue** | [#6](https://github.com/angelisco1/curso-claude-at-2/issues/6) |
| **Estado** | Borrador |
| **Autor de la issue** | @angelisco1 |
| **Fecha** | 2026-10-08 |
| **Etiquetas** | `feature`, `proyecto:api`, `proyecto:web-admin`, `proyecto:web-clientes`, `proyecto:web-empleados` |

## 1. Contexto

Hoy RestTek no tiene el concepto de mesa: la tabla `orders` ya tiene una columna `table_id`, pero no existe ninguna tabla de mesas, y `web-clientes` envía siempre `tableId: null` al crear un pedido (`packages/web-clientes/src/app/core/services/order.service.ts`). Por eso cocina, barra y salón no saben a qué mesa va cada pedido y nadie controla qué mesas están libres.

La issue pide tres cosas: que el administrador gestione las mesas de cada restaurante (CRUD con id, número, descripción, capacidad y estado `libre` / `ocupada` / `reservada`); que el cliente, al entrar en un restaurante, indique cuántas personas son, elija una mesa libre con capacidad suficiente y, al continuar, la mesa quede ocupada y pase a la carta; y que los empleados vean y cambien el estado de las mesas y consulten el estado de los pedidos de las mesas ocupadas.

La issue no tiene comentarios. Por petición expresa, el plan de implementación se divide por aplicación: **api**, **web-admin**, **web-clientes** y **web-empleados**.

## 2. Alcance

**Incluido**
- API: entidad `Table`, tabla SQLite `restaurant_tables`, CRUD de mesas por restaurante, endpoint de mesas disponibles por número de personas, endpoint para ocupar una mesa (cliente) y endpoint para cambiar el estado (empleados).
- API: mapeo de los nuevos errores a 404 / 409 en `errorHandler` y mesas de ejemplo en el `seed`.
- web-admin: listado, alta, edición y borrado de mesas dentro de cada restaurante.
- web-clientes: paso previo a la carta para indicar el número de personas y elegir mesa; el pedido se envía con el `tableId` de la mesa elegida.
- web-empleados: nueva página **Mesas** con el estado de cada mesa, cambio de estado y pedidos activos de las mesas ocupadas.
- Configuración mínima de `ng test` (Vitest) en las tres webs, porque hoy no tienen ningún test y el plan se implementa con TDD.

**Excluido**
- Liberar la mesa automáticamente al terminar o pagar el pedido: la issue no lo pide; lo hacen los empleados cambiando el estado a mano.
- Reservas con fecha/hora: `reservada` es solo un estado que fija un empleado o el administrador.
- Validar en `POST /orders` que el `tableId` pertenece al restaurante y está ocupada por ese cliente: queda como pregunta abierta.
- Restringir que un empleado solo gestione mesas de su propio restaurante: los endpoints actuales (ingredientes, platos) tampoco lo hacen; se mantiene la coherencia y se apunta como riesgo.
- Notificaciones en tiempo real: web-empleados sigue usando polling como hoy.

## 3. Comportamiento esperado

### 3.1 El administrador crea una mesa

**Dado** un administrador autenticado en web-admin dentro del restaurante `rest-1`
**Cuando** rellena número `5`, descripción `Terraza`, capacidad `4` y guarda
**Entonces** la API responde `201` con `{ id, restaurantId, number, description, capacity, status: "libre", createdAt, updatedAt }` y la mesa aparece en el listado con el estado **Libre**.

Si el número ya existe en ese restaurante, la API responde `409` con `{ error: "DuplicatedTableNumberError", message: "Table number already exists in this restaurant" }` y el formulario muestra el mensaje.

### 3.2 El administrador edita o borra una mesa

**Dado** una mesa existente
**Cuando** el administrador cambia sus datos (número, descripción, capacidad o estado) y guarda
**Entonces** la API responde `200` con la mesa actualizada y el listado se refresca.

**Cuando** el administrador la borra y confirma
**Entonces** la API responde `204` y desaparece del listado. Si la mesa está `ocupada`, la API responde `409` (`TableOccupiedError`) y se muestra *"No se puede eliminar una mesa ocupada."*

### 3.3 El cliente elige mesa

**Dado** un cliente autenticado en web-clientes
**Cuando** pulsa un restaurante en el listado
**Entonces** llega a `/restaurants/:id/table`, donde se le pide el número de personas.

**Cuando** indica `3` y pulsa **Buscar mesas**
**Entonces** se llama a `GET /api/v1/restaurants/:id/tables/available?people=3` y se muestran solo las mesas `libre` con `capacity >= 3`, ordenadas por capacidad y número. Si no hay ninguna: *"No hay mesas disponibles para 3 personas."*

**Cuando** selecciona una mesa y pulsa **Continuar**
**Entonces** se llama a `POST /api/v1/restaurants/:id/tables/:tableId/occupy` con `{ people: 3 }`, la API responde `200` con la mesa en estado `ocupada`, y el cliente navega a la carta `/restaurants/:id`, donde ve *"Mesa 5"* en la cabecera. El botón **Continuar** está deshabilitado mientras no haya mesa seleccionada.

Si otra persona la ha ocupado antes, la API responde `409` (`TableNotAvailableError`), se muestra *"Esa mesa ya no está disponible. Elige otra."* y se recarga la lista.

### 3.4 El cliente envía el pedido

**Dado** un cliente con mesa elegida
**Cuando** confirma el carrito
**Entonces** `POST /api/v1/orders` se envía con `tableId` igual al id de la mesa elegida.

**Dado** un cliente que entra directamente en `/restaurants/:id` sin haber elegido mesa en ese restaurante
**Entonces** se le redirige a `/restaurants/:id/table`.

### 3.5 Los empleados ven y cambian el estado de las mesas

**Dado** un empleado (`manager`, `camarero` o `cocinero`) autenticado en web-empleados
**Cuando** entra en **Mesas**
**Entonces** ve todas las mesas de su restaurante con número, descripción, capacidad y estado (badge de color por estado), refrescadas cada 30 s como el resto de páginas.

**Cuando** cambia el estado de una mesa en el selector
**Entonces** se llama a `PATCH /api/v1/restaurants/:id/tables/:tableId/status` con `{ status }`, la API responde `200` con la mesa actualizada y el badge cambia.

### 3.6 Los empleados ven los pedidos de las mesas ocupadas

**Dado** una mesa `ocupada` con pedidos activos (los que devuelve `GET /api/v1/orders/active`)
**Entonces** en su tarjeta se listan los platos de esos pedidos con su estado (`pendiente`, `preparando`, `listo`, `entregado`). Si no tiene pedidos: *"Sin pedidos activos"*. Las mesas no ocupadas no muestran pedidos.

## 4. Diseño técnico

### Archivos afectados

| Archivo | Cambio |
|---|---|
| **api** | |
| `packages/api/src/models/table.model.ts` | Nuevo — interfaz `Table`, tipo `TableStatusType` y `normalizeTableStatus` |
| `packages/api/src/errors/DomainErrors.ts` | Nuevos errores de mesa |
| `packages/api/src/contexts/shared/infrastructure/http/errorHandler.ts` | `TableNotFoundError` → 404; nueva lista `CONFLICT_ERRORS` → 409 |
| `packages/api/src/config/database.ts` | Nueva tabla `restaurant_tables` |
| `packages/api/src/repositories/table.repository.ts` | Nuevo — interfaz `TableRepository` y `SqliteTableRepository` |
| `packages/api/src/repositories/mocks/MockTableRepository.ts` | Nuevo — repositorio en memoria para tests |
| `packages/api/src/services/table.service.ts` | Nuevo — reglas de negocio de mesas |
| `packages/api/src/controllers/table.controller.ts` | Nuevo — controlador HTTP |
| `packages/api/src/routes/table.routes.ts` | Nuevo — rutas con `authenticate` / `authorize` |
| `packages/api/src/app.ts` | Registra `/api/v1/restaurants/:restaurantId/tables` |
| `packages/api/src/scripts/seed.ts` | Mesas de ejemplo para `rest-1` y `rest-2` |
| `docs/dominio/modelo-datos.md`, `docs/arquitectura/arquitectura-api.md` | Documentan la tabla y los endpoints |
| **web-admin** | |
| `packages/web-admin/angular.json`, `package.json`, `tsconfig.spec.json` | Target `test` con `@angular/build:unit-test` (Vitest) |
| `packages/web-admin/src/app/features/tables/**` | Nuevo — `models`, `services`, `store`, `pages/table-list`, `pages/table-form`, `tables.routes.ts` |
| `packages/web-admin/src/app/app.routes.ts` | Ruta `restaurants/:restaurantId/tables` |
| `packages/web-admin/src/app/features/restaurants/pages/restaurant-dashboard/restaurant-dashboard.component.html` | Tarjeta **Mesas** |
| `packages/web-admin/src/app/core/layout/shell.component.html` | Enlace **Mesas** en el submenú del restaurante |
| **web-clientes** | |
| `packages/web-clientes/angular.json`, `package.json`, `tsconfig.spec.json` | Target `test` con Vitest |
| `packages/web-clientes/src/app/core/models/table.model.ts` | Nuevo — interfaz `Table` |
| `packages/web-clientes/src/app/core/services/table.service.ts` | Nuevo — `getAvailable`, `occupy` |
| `packages/web-clientes/src/app/core/store/table-selection.store.ts` | Nuevo — mesa elegida por restaurante (persistida en `sessionStorage`) |
| `packages/web-clientes/src/app/core/guards/table-selected.guard.ts` | Nuevo — redirige a elegir mesa si no hay una |
| `packages/web-clientes/src/app/features/tables/table-selection.component.ts` | Nuevo — página de número de personas y selección de mesa |
| `packages/web-clientes/src/app/app.routes.ts` | Ruta `restaurants/:id/table` y guard en `restaurants/:id` |
| `packages/web-clientes/src/app/features/restaurants/restaurant-list.component.ts` | El enlace apunta a `/restaurants/:id/table` |
| `packages/web-clientes/src/app/features/menu/restaurant-menu.component.ts` | Muestra *"Mesa N"* en la cabecera |
| `packages/web-clientes/src/app/core/services/order.service.ts` | `createOrder` recibe y envía `tableId` |
| `packages/web-clientes/src/app/features/cart/cart.component.ts` | Pasa el `tableId` de la mesa elegida |
| **web-empleados** | |
| `packages/web-empleados/angular.json`, `package.json`, `tsconfig.spec.json` | Target `test` con Vitest |
| `packages/web-empleados/src/app/features/tables/**` | Nuevo — `models`, `services`, `store`, `utils/group-orders-by-table.ts`, `pages/mesas` |
| `packages/web-empleados/src/app/app.routes.ts` | Ruta `mesas` |
| `packages/web-empleados/src/app/core/layout/shell.component.{ts,html}` | Enlace **Mesas** visible para todos los empleados |

### Enfoque

- **API:** arquitectura en capas igual que ingredientes: `routes/table.routes.ts` → `controllers/table.controller.ts` → `services/table.service.ts` → `repositories/table.repository.ts` → `config/database.ts`. Router con `Router({ mergeParams: true })` montado en `/api/v1/restaurants/:restaurantId/tables`, como `ingredient.routes.ts`. Controlador con funciones flecha y `next(error)`, como `IngredientController`. Tests del servicio con `MockTableRepository` (como `ingredient.service.test.ts`) y del repositorio contra SQLite en memoria (como `ingredient.repository.test.ts`). Las rutas se prueban con `supertest` (ya está en `devDependencies`) firmando un JWT con el mismo secreto que `middlewares.ts`.
- La tabla se llama `restaurant_tables` porque `TABLE` es palabra reservada en SQL.
- Para evitar que dos clientes ocupen la misma mesa a la vez, el repositorio ocupa con un `UPDATE ... WHERE id = ? AND status = 'libre'` y comprueba `changes`, en lugar de leer y luego escribir.
- **webs:** mismo patrón que `features/ingredients` de web-admin: `models` + `services` (HttpClient) + `store` (signals + `firstValueFrom`) + `pages`. En web-clientes se sigue su estilo (`core/services`, `core/store`, componentes con `template` en línea y `API_URL` de `@resttek/web-shared`). En web-empleados se reutiliza `OrderStore` para los pedidos activos; no hace falta endpoint nuevo porque `GET /orders/active` ya devuelve `tableId`.
- Se descarta crear un endpoint `GET /tables/:id/orders`: `GET /orders/active` ya da toda la información y se agrupa en el cliente con una función pura fácil de testear.

### Modelo de datos / contratos

**Tabla SQLite**

```sql
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'libre',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(restaurant_id, number),
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
);
```

No requiere migración de datos: se crea con `CREATE TABLE IF NOT EXISTS` en `runInitialMigrations`. `orders.table_id` ya existe y pasa a guardar el id de la mesa.

**Modelo (api y webs)**

```ts
type TableStatus = 'libre' | 'ocupada' | 'reservada'

interface Table {
  id: string
  restaurantId: string
  number: number
  description: string | null
  capacity: number
  status: TableStatus
  createdAt: string
  updatedAt: string
}
```

**Endpoints** (todos bajo `/api/v1/restaurants/:restaurantId/tables`, todos con `authenticate`)

| Método y ruta | Roles | Body / query | Respuesta |
|---|---|---|---|
| `GET /` | admin, manager, camarero, cocinero | — | `200 Table[]` ordenadas por `number` |
| `GET /available` | cualquier usuario autenticado | `?people=N` | `200 Table[]` libres con `capacity >= N`, por `capacity`, `number` |
| `GET /:id` | admin, manager, camarero, cocinero | — | `200 Table` |
| `POST /` | admin | `{ number, description?, capacity, status? }` | `201 Table` |
| `PUT /:id` | admin | `{ number, description?, capacity, status }` | `200 Table` |
| `DELETE /:id` | admin | — | `204` |
| `PATCH /:id/status` | admin, manager, camarero, cocinero | `{ status }` | `200 Table` |
| `POST /:id/occupy` | cualquier usuario autenticado | `{ people }` | `200 Table` (estado `ocupada`) |

`GET /available` se declara antes que `GET /:id` para que Express no lo trate como un id.

**Nuevos errores** (`DomainErrors.ts`)

| Error | Mensaje | HTTP |
|---|---|---|
| `TableNotFoundError` | `Table not found` | 404 |
| `InvalidTableNumberError` | `Table number must be a positive integer` | 400 |
| `InvalidCapacityError` | `Capacity must be a positive integer` | 400 |
| `InvalidTableStatusError` | `Invalid table status: X. Must be one of: libre, ocupada, reservada` | 400 |
| `InvalidPeopleError` | `People must be a positive integer` | 400 |
| `DuplicatedTableNumberError` | `Table number already exists in this restaurant` | 409 |
| `TableNotAvailableError` | `Table is not available` | 409 |
| `TableOccupiedError` | `Cannot delete an occupied table` | 409 |

## 5. Casos borde y errores

| Situación | Comportamiento esperado |
|---|---|
| `number` o `capacity` vacíos, `0`, negativos o decimales | `400` con `InvalidTableNumberError` / `InvalidCapacityError` |
| `status` distinto de `libre`, `ocupada`, `reservada` (sin distinguir mayúsculas) | `400` `InvalidTableStatusError`; `"LIBRE"` se normaliza a `libre` |
| Número de mesa repetido en el mismo restaurante (crear o editar) | `409` `DuplicatedTableNumberError`; en otro restaurante sí se permite |
| Mesa inexistente o de otro restaurante en `GET/PUT/DELETE/PATCH/occupy` | `404` `TableNotFoundError` |
| `people` ausente, `0`, negativo o no numérico en `/available` u `/occupy` | `400` `InvalidPeopleError` |
| Ocupar una mesa `ocupada` o `reservada` | `409` `TableNotAvailableError` |
| Ocupar una mesa con `capacity < people` | `409` `TableNotAvailableError` |
| Dos clientes ocupan la misma mesa a la vez | Solo uno recibe `200`; el otro `409` (UPDATE condicional) |
| Borrar una mesa `ocupada` | `409` `TableOccupiedError` |
| Cliente (`role: cliente`) intenta `POST`, `PUT`, `DELETE`, `PATCH status` o `GET /` | `403` |
| Petición sin token | `401` |
| Cliente recarga la carta tras elegir mesa | Se mantiene la mesa (persistida en `sessionStorage`) |
| Cliente entra en la carta de un restaurante distinto al de su mesa | Se le redirige a elegir mesa de ese restaurante |
| Restaurante sin mesas | web-clientes: *"No hay mesas disponibles para N personas."*; web-admin y web-empleados: *"Todavía no hay mesas."* |

## 6. Plan de implementación

Cada tarea se implementa con TDD (test en rojo → código → verde) y deja el proyecto funcionando. Los bloques 6.2, 6.3 y 6.4 dependen del contrato de la sección 4 (no del código de la API), así que pueden avanzar en paralelo con 6.1.

### 6.1 api (`packages/api`) — tests con `npm test -w @resttek/api`

1. [ ] Crear `models/table.model.ts` con `Table`, `TableStatusType` y `normalizeTableStatus`; añadir `InvalidTableStatusError` en `DomainErrors.ts` — test: `services/table.service.test.ts` (`describe('normalizeTableStatus')`: acepta los 3 estados, normaliza mayúsculas/espacios, lanza con valor inválido o vacío).
2. [ ] Añadir el resto de errores de mesa a `DomainErrors.ts` y mapearlos en `errorHandler.ts` (`TableNotFoundError` en `NOT_FOUND_ERRORS`; nueva lista `CONFLICT_ERRORS` → 409) — test: `contexts/shared/infrastructure/http/errorHandler.test.ts` (404, 409 y 400 por defecto con un `res` simulado).
3. [ ] Añadir la tabla `restaurant_tables` a `runInitialMigrations` en `config/database.ts` y crear `repositories/table.repository.ts` con la interfaz y `save` + `findById` en `SqliteTableRepository` — test: `repositories/table.repository.test.ts` (guarda y recupera; `save` actualiza si ya existe).
4. [ ] `findByRestaurantId` (ordenado por `number`) y `findByRestaurantAndNumber` — test: `table.repository.test.ts`.
5. [ ] `delete` y `findAvailable(restaurantId, people)` (libres, `capacity >= people`, orden `capacity, number`) — test: `table.repository.test.ts` (excluye ocupadas, reservadas y pequeñas; no mezcla restaurantes).
6. [ ] `occupyIfFree(id, updatedAt): Promise<boolean>` con `UPDATE ... WHERE id = ? AND status = 'libre'` — test: `table.repository.test.ts` (primera llamada `true`, segunda `false`).
7. [ ] Crear `repositories/mocks/MockTableRepository.ts` y `TableService.create` (valida número, capacidad y estado; `status` por defecto `libre`; `DuplicatedTableNumberError`) — test: `services/table.service.test.ts`.
8. [ ] `TableService.getById(restaurantId, id)` (404 si no existe o es de otro restaurante) y `findByRestaurantId` — test: `table.service.test.ts`.
9. [ ] `TableService.update` (mismas validaciones, número duplicado salvo la propia mesa, conserva `createdAt`) — test: `table.service.test.ts`.
10. [ ] `TableService.delete` (404 si no existe, `TableOccupiedError` si está ocupada) — test: `table.service.test.ts`.
11. [ ] `TableService.changeStatus(restaurantId, id, status)` — test: `table.service.test.ts`.
12. [ ] `TableService.findAvailable(restaurantId, people)` y `occupy(restaurantId, id, people)` (valida `people`; 409 si capacidad insuficiente o `occupyIfFree` devuelve `false`) — test: `table.service.test.ts`.
13. [ ] Crear `controllers/table.controller.ts` (`create`, `getAll`, `getById`, `update`, `delete` + `toJSON`) y `routes/table.routes.ts` con esas rutas y sus roles; registrar en `app.ts` — test: `routes/table.routes.test.ts` con `supertest` (201/200/204, 403 para `cliente`, 401 sin token, 404, 409 por número duplicado).
14. [ ] Añadir `getAvailable`, `changeStatus` y `occupy` al controlador y las rutas `GET /available`, `PATCH /:id/status`, `POST /:id/occupy` — test: `table.routes.test.ts` (cliente ve disponibles y ocupa; segundo `occupy` → 409; cliente en `PATCH status` → 403; camarero → 200).
15. [ ] Añadir mesas de ejemplo al `seed.ts` (`rest-1`: 6 mesas de 2, 4 y 6 plazas; `rest-2`: 4 mesas), solo si el restaurante no tiene ya mesas — verificación: `npm run seed` dos veces sin duplicar.
16. [ ] Documentar la tabla en `docs/dominio/modelo-datos.md` y los endpoints en `docs/arquitectura/arquitectura-api.md` — verificación: revisión.

### 6.2 web-admin (`packages/web-admin`) — tests con `npx ng test` desde el paquete

1. [ ] Configurar el target `test` en `angular.json` con `@angular/build:unit-test` (runner Vitest), añadir `vitest` y `jsdom` a `devDependencies`, crear `tsconfig.spec.json` y el script `"test": "ng test --watch=false"` — test: `app.component.spec.ts` mínimo que crea el componente.
2. [ ] Crear `features/tables/models/table.model.ts` (`Table`, `TableStatus`, `CreateTableDto`, `UpdateTableDto`) y `services/table.service.ts` (`getAll`, `create`, `update`, `delete` sobre `/restaurants/:restaurantId/tables`) — test: `table.service.spec.ts` con `HttpTestingController` (URL y método de cada llamada).
3. [ ] Crear `store/table.store.ts` (signals `tables`, `loading`, `error`; `loadByRestaurant`, `create`, `update`, `delete`), igual que `IngredientStore` — test: `table.store.spec.ts` con el servicio simulado (actualiza la lista y fija el error *"No se pudieron cargar las mesas."*).
4. [ ] Crear `pages/table-list` (tabla con número, descripción, capacidad, badge de estado, botones editar/eliminar con `confirm`; mensaje *"Todavía no hay mesas."*; alerta *"No se puede eliminar una mesa ocupada."* si la API responde 409), `tables.routes.ts` y la ruta `tables` en `app.routes.ts` — test: `table-list.component.spec.ts` (pinta una fila por mesa y el mensaje de lista vacía).
5. [ ] Crear `pages/table-form` (nuevo y edición: número, descripción, capacidad y estado; muestra `err.error.message` de la API) y añadir `new` y `:id/edit` a `tables.routes.ts` — test: `table-form.component.spec.ts` (en alta llama a `store.create` y navega al listado; en edición carga los datos y llama a `store.update`).
6. [ ] Añadir la tarjeta **Mesas** en `restaurant-dashboard.component.html` y el enlace en el submenú de `shell.component.html` (icono `armchair` de lucide) — verificación: `npx ng build` y navegación manual.

### 6.3 web-clientes (`packages/web-clientes`) — tests con `npx ng test` desde el paquete

1. [ ] Configurar el target `test` con Vitest (igual que 6.2.1) — test: `app.spec.ts` mínimo.
2. [ ] Crear `core/models/table.model.ts` y `core/services/table.service.ts` (`getAvailable(restaurantId, people)`, `occupy(restaurantId, tableId, people)`) — test: `table.service.spec.ts` con `HttpTestingController` (query `people` y body `{ people }`).
3. [ ] Crear `core/store/table-selection.store.ts` (`selected` signal con `{ restaurantId, table }`, `select`, `clear`, `tableFor(restaurantId)`; persistencia en `sessionStorage`) — test: `table-selection.store.spec.ts` (guarda, recupera tras recrear el store, devuelve `null` para otro restaurante).
4. [ ] Crear `features/tables/table-selection.component.ts` con el campo de número de personas, botón **Buscar mesas**, lista de mesas disponibles seleccionables y mensaje *"No hay mesas disponibles para N personas."*; añadir la ruta `restaurants/:id/table` — test: `table-selection.component.spec.ts` (busca con el número indicado, pinta las mesas, **Continuar** deshabilitado sin selección).
5. [ ] Al pulsar **Continuar**: llamar a `occupy`, guardar en `TableSelectionStore` y navegar a `/restaurants/:id`; si responde 409, mostrar *"Esa mesa ya no está disponible. Elige otra."* y recargar la lista — test: `table-selection.component.spec.ts`.
6. [ ] Crear `core/guards/table-selected.guard.ts` (si no hay mesa para ese restaurante, redirige a `/restaurants/:id/table`), aplicarlo a `restaurants/:id` y cambiar el enlace de `restaurant-list.component.ts` a `/restaurants/:id/table` — test: `table-selected.guard.spec.ts` (deja pasar con mesa; devuelve `UrlTree` sin mesa o con mesa de otro restaurante).
7. [ ] Mostrar *"Mesa N"* en la cabecera de `restaurant-menu.component.ts` y un enlace **Cambiar mesa** — test: `restaurant-menu.component.spec.ts` (muestra el número de la mesa elegida).
8. [ ] `OrderService.createOrder(restaurantId, tableId, items)` envía `tableId`, y `cart.component.ts` lo toma de `TableSelectionStore` — test: `order.service.spec.ts` (el body lleva el `tableId`).

### 6.4 web-empleados (`packages/web-empleados`) — tests con `npx ng test` desde el paquete

1. [ ] Configurar el target `test` con Vitest (igual que 6.2.1, aprovechando el `tsconfig.spec.json` existente) — test: `app.component.spec.ts` mínimo.
2. [ ] Crear `features/tables/models/table.model.ts` y `services/table.service.ts` (`getAll(restaurantId)`, `updateStatus(restaurantId, tableId, status)`) — test: `table.service.spec.ts` con `HttpTestingController`.
3. [ ] Crear `store/table.store.ts` (`tables`, `loading`, `error`; `loadTables`, `changeStatus`, `startPolling`/`stopPolling` cada 30 s como `OrderStore`) — test: `table.store.spec.ts` (actualiza el estado de la mesa en la lista; fija error si falla).
4. [ ] Crear la función pura `utils/group-orders-by-table.ts` que devuelve un `Map<tableId, Order[]>` solo para mesas ocupadas — test: `group-orders-by-table.spec.ts` (ignora pedidos sin mesa y mesas libres/reservadas).
5. [ ] Crear `pages/mesas` con una tarjeta por mesa (número, descripción, capacidad, badge de estado y `<select>` para cambiarlo); ruta `mesas` en `app.routes.ts` — test: `mesas.component.spec.ts` (pinta las mesas y al cambiar el select llama a `tableStore.changeStatus`).
6. [ ] En las tarjetas de mesas ocupadas, listar los platos de sus pedidos activos con su estado usando `OrderStore` + `groupOrdersByTable`, o *"Sin pedidos activos"* — test: `mesas.component.spec.ts`.
7. [ ] Añadir `canSeeMesas` (manager, camarero, cocinero) y el enlace **Mesas** (icono `armchair`/`layout-grid`) en `shell.component` — verificación: `npx ng build` y navegación manual.

## 7. Criterios de aceptación

- [ ] El administrador puede crear, listar, editar y borrar mesas de un restaurante desde web-admin, con id, número, descripción, capacidad y estado (`libre`, `ocupada`, `reservada`).
- [ ] No se pueden crear dos mesas con el mismo número en el mismo restaurante, ni borrar una mesa ocupada.
- [ ] Al elegir un restaurante, el cliente debe indicar primero el número de personas y solo ve mesas libres con capacidad suficiente.
- [ ] Al elegir mesa y pulsar **Continuar**, la mesa queda `ocupada` en la API y el cliente pasa a la carta.
- [ ] Una mesa ya ocupada no puede ser ocupada por otro cliente (409 y mensaje en pantalla).
- [ ] El pedido que envía el cliente a cocina y barra lleva el `tableId` de su mesa.
- [ ] Los empleados ven el estado de todas las mesas de su restaurante y pueden cambiarlo.
- [ ] Los empleados ven el estado de los pedidos de las mesas ocupadas.
- [ ] Un cliente no puede crear, editar, borrar ni cambiar el estado de mesas (403).
- [ ] `npm test` pasa en verde y `npx ng build` compila en las tres webs.

### Tests

- **Unitarios:** `table.service.test.ts` (validaciones, reglas de negocio y `normalizeTableStatus`) y `errorHandler.test.ts` en la api; specs de servicios, stores, guard, función de agrupado y componentes en cada web.
- **Integración / E2E:** `table.repository.test.ts` contra SQLite en memoria; `table.routes.test.ts` con `supertest` cubriendo roles, códigos de estado y la ocupación concurrente. Flujo manual completo: admin crea mesas → cliente elige mesa y pide → empleado ve la mesa ocupada con su pedido y la libera.

## 8. Impacto y riesgos

- **Retrocompatibilidad:** la tabla nueva se crea sola al arrancar. Los pedidos antiguos siguen con `table_id = NULL` y no aparecen asociados a ninguna mesa. El cambio de firma de `createOrder` en web-clientes solo afecta a `cart.component.ts`.
- **Rendimiento:** consultas simples por `restaurant_id`; el índice `UNIQUE(restaurant_id, number)` las cubre. Un polling más cada 30 s en web-empleados.
- **Seguridad:** las rutas de escritura usan `authorize`. Como en el resto de la API, no se comprueba que el empleado pertenezca al restaurante de la URL: un empleado autenticado podría cambiar mesas de otro restaurante conociendo su id. Cualquier cliente puede ocupar mesas libres, lo que permitiría bloquearlas en masa.
- **Operación:** sin variables de entorno nuevas. Conviene ejecutar `npm run seed` para tener mesas de ejemplo. Las webs ganan dependencias de desarrollo (`vitest`, `jsdom`).

## 9. Suposiciones y preguntas abiertas

**Suposiciones** — lo que decidiste sin confirmar. Revísalo antes de implementar.
- Pueden cambiar el estado de las mesas todos los empleados (`manager`, `camarero`, `cocinero`) y el `admin`.
- El estado `reservada` solo lo ponen empleados o el admin; el cliente no reserva.
- La mesa no se libera sola: la libera un empleado.
- La mesa elegida por el cliente se guarda en `sessionStorage` y se puede cambiar desde la carta (la mesa anterior queda ocupada hasta que la libere un empleado).
- Se configura `ng test` con Vitest en las tres webs para poder aplicar TDD, ya que hoy no tienen tests.
- El número de mesa es un entero positivo único por restaurante y la descripción es opcional.

**Preguntas abiertas** — qué falta por decidir y quién debe decidirlo.
- ¿Se debe liberar la mesa automáticamente cuando todos los platos del pedido están `entregado` o al pagar? (producto / @angelisco1)
- ¿Debe `POST /orders` rechazar pedidos con un `tableId` que no sea del restaurante o no esté ocupado? (producto / backend)
- ¿Restringimos que cada empleado solo gestione mesas de su restaurante? Afectaría también a ingredientes y platos. (backend)
- ¿Se limita cuántas mesas puede ocupar un mismo cliente? (producto)
