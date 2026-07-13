# Plataforma Restaurant

Sistema de gestión de restaurante con panel de administración, comandas, cocina y facturación.

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express 5 |
| Base de datos | SQLite (better-sqlite3) |
| Autenticación | JWT + bcryptjs |
| Validación | express-validator |
| Entorno | dotenv |
| Frontend | HTML + Bootstrap 5.3.3 (vanilla JS) |
| Tiempo real | Server-Sent Events (SSE) |

## Instalación

```bash
npm install
npm run seed     # Carga datos iniciales
npm start        # Inicia servidor en http://localhost:3000
```

### Usuarios de prueba

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@restaurant.com | 123456 | Administrador |
| carlos@restaurant.com | 123456 | Mesero |
| cocina@restaurant.com | 123456 | Cocina |

## Estructura del proyecto

```
├── .env                    # Variables de entorno
├── .gitignore              # Archivos ignorados por git
├── src/
│   ├── server.js           # Servidor Express + SSE endpoint
│   ├── db.js               # Configuración SQLite + esquema
│   ├── sse.js              # Módulo de Server-Sent Events
│   ├── middleware/
│   │   ├── auth.js         # Middleware JWT
│   │   ├── authorize.js    # Autorización por roles
│   │   └── errorHandler.js # Manejador centralizado de errores
│   └── routes/
│       ├── auth.js         # Login + perfil (/api/auth)
│       ├── menu.js         # CRUD menú (/api/menu)
│       ├── tables.js       # CRUD mesas (/api/tables)
│       ├── orders.js       # Pedidos + estados (/api/orders)
│       ├── billing.js      # Facturación + historial (/api/billing)
│       └── users.js        # CRUD usuarios + cambio contraseña (/api/users)
├── index.html              # Login
├── dashboard.html          # Panel principal con estadísticas
├── pedidos.html            # Toma de pedidos (mesero)
├── cocina.html             # Vista cocina con SSE + notificación sonora
├── cuenta.html             # Facturación con método de pago e impresión
├── menu.html               # CRUD platos
├── mesas.html              # CRUD mesas
├── usuarios.html           # CRUD usuarios + cambio de contraseña
├── historial.html          # Historial con paginación y filtro por pago
├── api.js                  # Cliente HTTP frontend
├── seed.js                 # Poblado inicial de datos
└── restaurant.db           # Base de datos SQLite
```

## Base de datos (5 tablas)

- **users**: id, name, email, password, role, created_at
- **menu**: id, name, category, price, available, created_at
- **tables**: id, number (único), capacity
- **orders**: id, table_number, waiter, waiter_id, items (JSON), total, status, created_at, updated_at
- **history**: id, original_id, table_number, waiter, items, total, status, created_at, billed_at, payment_method

## API endpoints

### Autenticación (`/api/auth`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/login` | No | Iniciar sesión |
| GET | `/me` | JWT | Perfil del usuario |

### Usuarios (`/api/users`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | Admin | Listar usuarios |
| GET | `/:id` | Admin | Obtener usuario |
| POST | `/` | Admin | Crear usuario |
| PUT | `/:id` | Admin | Actualizar usuario |
| DELETE | `/:id` | Admin | Eliminar usuario |
| PATCH | `/:id/password` | Propio/Admin | Cambiar contraseña |

### Menú (`/api/menu`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | No | Listar platos |
| GET | `/:category` | No | Filtrar por categoría |
| POST | `/` | Admin | Crear plato |
| PUT | `/:id` | Admin | Actualizar plato |
| DELETE | `/:id` | Admin | Eliminar plato |

### Mesas (`/api/tables`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | No | Listar mesas |
| POST | `/` | Admin | Crear mesa |
| PUT | `/:id` | Admin | Actualizar mesa |
| DELETE | `/:id` | Admin | Eliminar mesa |

### Pedidos (`/api/orders`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | No | Listar pedidos activos |
| GET | `/:id` | No | Obtener pedido |
| POST | `/` | No | Crear pedido |
| PUT | `/:id` | JWT | Editar pedido pendiente |
| PATCH | `/:id/status` | JWT | Cambiar estado |
| PATCH | `/:id/cancel` | JWT | Cancelar pedido pendiente |
| GET | `/stats` | No | Estadísticas |

### Facturación (`/api/billing`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/tables` | No | Mesas con cuentas listas |
| GET | `/table/:number` | No | Pedidos de una mesa |
| POST | `/pay` | JWT | Cobrar mesa |
| GET | `/history` | No | Historial (con paginación) |
| GET | `/history/filters` | No | Opciones de filtro |

### Eventos SSE (`/api/events`)
Endpoint para recibir notificaciones en tiempo real de nuevos pedidos y cambios de estado.

## Flujo de trabajo

1. **Login** → acceso según rol (admin/mesero/cocina)
2. **Dashboard** → estadísticas en tiempo real (pedidos pendientes, mesas activas)
3. **Pedidos** → mesero selecciona mesa, arma pedido, envía a cocina. Soporta edición de pedidos pendientes.
4. **Cocina** → columnas Kanban (pendiente → preparando → listo → servido). Notificaciones SSE con sonido al llegar nuevos pedidos. Botón para cancelar pedidos pendientes.
5. **Cuenta** → selecciona mesa, vista de consumo, cálculo de IGV (18%), selección de método de pago (efectivo/tarjeta/Yape), dividir cuenta, imprimir boleta.
6. **Usuarios** → CRUD completo de usuarios con roles y cambio de contraseña.
7. **Historial** → búsqueda con filtros por fechas, mesa, mesero, método de pago. Paginación incluida.

## Funcionalidades implementadas

- [x] Autenticación JWT con roles (admin, waiter, kitchen)
- [x] Middleware de autorización por roles en rutas protegidas
- [x] Validación de entrada con express-validator
- [x] Manejador centralizado de errores
- [x] CRUD de usuarios + cambio de contraseña
- [x] Editar pedidos pendientes
- [x] Cancelar pedidos pendientes
- [x] Poblar `waiter_id` automáticamente
- [x] Método de pago (efectivo, tarjeta, Yape/Plin)
- [x] Notificaciones en tiempo real via SSE
- [x] Alerta sonora en cocina al llegar nuevo pedido
- [x] Paginación en historial
- [x] Filtro por método de pago en historial
- [x] Variables de entorno con dotenv
- [x] Cierre de sesión en todas las páginas
- [x] Manejo de expiración de token con redirección
- [x] Spinners de carga
- [x] Impresión de boleta
- [x] División de cuenta con desglose
- [x] .gitignore (node_modules, .env, restaurant.db)
- [x] Polyfill para `findLastIndex`

## Variables de entorno

Copiar `.env`:

```
PORT=3000
JWT_SECRET=restaurant-jwt-secret-change-in-production
```

## Scripts

```bash
npm start       # Inicia servidor (puerto 3000)
npm run seed    # Pobla la base de datos con datos iniciales
```
