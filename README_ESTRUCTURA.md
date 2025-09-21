Guía ultra-rápida (migraciones + tests)
Migraciones (MySQL, usando tu src/data-source.ts)

Ver SQL pendiente (no ejecuta):

npm run typeorm -- schema:log


Generar migración automática (a partir de diferencias entre DB y entidades):

npm run migration:generate -- ./migrations/NombreBonito


Crear migración vacía (para escribir SQL/queries a mano):

npm run typeorm:raw -- migration:create ./migrations/NombreBonito


Ejecutar migraciones pendientes:

npm run migration:run


Revertir la última migración:

npm run migration:revert


Listar migraciones y estado:

npm run typeorm -- migration:show


Nota: En Windows PowerShell, si necesitás setear variables de entorno para que migration:generate conecte a otra DB:

$env:DB_HOST="127.0.0.1"; $env:DB_PORT="3306"; $env:DB_USER="root"; $env:DB_PASS="admin"; $env:DB_NAME="services_db"
npm run migration:generate -- ./migrations/Nombre


Tip: Creaste 3 migraciones AddNotifications vacías (están “ejecutadas” pero no hacen nada). Si querés limpiar ruido:
corré npm run migration:revert tres veces y volvé a generar una sola migración real.

E2E (ciclo completo)

Correr todo el flujo (migrar + seed + e2e):

npm run e2e:full


Solo seed + e2e:

npm run db:seed:test
npm run test:e2e


Correr un archivo de test puntual:

npm run test:e2e -- test/auth.refresh.e2e-spec.ts




Crear migración vacía: npm run migration:create -- ./migrations/MiCambio

Generar migración auto: npm run migration:generate -- ./migrations/MiCambio

Vista previa de SQL: npm run schema:log

Aplicar: npm run migration:run

Revertir: npm run migration:revert

Test E2E completo: npm run e2e:full

src/
├─ main.ts
├─ app.module.ts
├─ app.controller.ts
├─ app.service.ts
├─ common/
│  ├─ decorators/
│  │  ├─ current-user.ts
│  │  └─ roles.decorator.ts
│  └─ guards/
│     ├─ jwt-auth.guard.ts
│     └─ roles.guard.ts
└─ modules/
   ├─ auth/
   │  ├─ dto/
   │  │  ├─ login.dto.ts
   │  │  └─ refresh.dto.ts
   │  ├─ auth.controller.ts
   │  ├─ auth.module.ts
   │  ├─ auth.service.ts
   │  └─ jwt.strategy.ts
   ├─ catalog/
   │  ├─ categories/
   │  │  ├─ dto/
   │  │  │  ├─ create-category.dto.ts
   │  │  │  └─ update-category.dto.ts
   │  │  ├─ categories.controller.ts
   │  │  ├─ categories.module.ts
   │  │  ├─ categories.service.ts
   │  │  ├─ category.entity.ts
   │  │  └─ category-translation.entity.ts
   │  └─ service-types/
   │     ├─ dto/
   │     │  ├─ create-service-type.dto.ts
   │     │  └─ update-service-type.dto.ts
   │     ├─ service-types.controller.ts
   │     ├─ service-types.module.ts
   │     ├─ service-types.service.ts
   │     ├─ service-type.entity.ts
   │     └─ service-type-translation.entity.ts
   ├─ providers/
   │  ├─ dto/
   │  │  ├─ update-provider-profile.dto.ts
   │  │  ├─ set-service-types.dto.ts
   │  │  └─ search-providers.dto.ts
   │  ├─ provider-profile.entity.ts
   │  ├─ provider-service-type.entity.ts
   │  ├─ providers.controller.ts
   │  ├─ providers.module.ts
   │  └─ providers.service.ts
   ├─ ragings/                      ← módulo de ratings
   │  ├─ dto/
   │  │  ├─ create-rating.dto.ts
   │  │  └─ list.dto.ts
   │  ├─ ratings.controller.ts
   │  ├─ ratings.module.ts
   │  ├─ ratings.service.ts
   │  └─ request-rating.entity.ts
   ├─ request/
   │  ├─ dto/
   │  │  ├─ create-request.dto.ts
   │  │  ├─ feed.dto.ts
   │  │  ├─ mine.dto.ts
   │  │  ├─ mine-summary.dto.ts
   │  │  ├─ transition.dto.ts
   │  │  └─ list-my.dto.ts
   │  ├─ request.entity.ts
   │  ├─ request-transition.entity.ts
   │  ├─ requests.controller.ts
   │  ├─ requests.module.ts
   │  └─ requests.service.ts
   └─ users/
      ├─ dto/
      │  ├─ create-user.dto.ts
      │  ├─ create-address.dto.ts
      │  └─ update-address.dto.ts
      ├─ user.entity.ts
      ├─ user-address.entity.ts
      ├─ users.controller.ts
      ├─ users.module.ts
      └─ users.service.ts

test/
├─ app.controller.spec.ts
└─ app.e2e-spec.ts

.env
jest-e2e.json



Testing estructura


/ (repo)
├─ src/
│  ├─ modules/
│  │  ├─ auth/
│  │  ├─ users/
│  │  ├─ catalog/            # categories, service_types
│  │  └─ requests/           # request, transitions, ratings
│  │     ├─ dto/
│  │     ├─ entities/
│  │     ├─ requests.controller.ts
│  │     └─ requests.service.ts
│  ├─ common/                 # guards, interceptors, filters, pipes, utils
│  ├─ app.module.ts
│  └─ main.ts
├─ test/
│  ├─ e2e/
│  │  └─ lifecycle-rating.e2e-spec.ts
│  ├─ utils/
│  │  ├─ auth.ts
│  │  └─ factory.ts
│  └─ unit/                   # unit tests por módulo
├─ docs/
│  ├─ README.md               # índice
│  ├─ overview.md             # visión general
│  ├─ architecture.md         # módulos, diagrama de flujo
│  ├─ state-machine-requests.md
│  ├─ data-model.md
│  ├─ api/
│  │  ├─ openapi.json
│  │  └─ swagger-static/      # export opcional
│  └─ runbooks/
│     ├─ local-setup.md
│     ├─ testing.md
│     └─ operations.md
├─ scripts/
│  └─ gen-openapi.ts
├─ docker-compose.yml         # (db para dev)
├─ package.json
└─ tsconfig.json






Estado actual (check rápido)

✅ Auth: login / refresh / logout con refresh hashado y rotación. Guards y strategy OK.

✅ Users + Addresses: CRUD de direcciones con isDefault consistente. Tests e2e.

✅ Catálogo: categorías y tipos de servicio (con traducciones). Tests e2e.

✅ Providers: perfil + vinculación a service types. Tests e2e.

✅ Requests: lifecycle completo (claim → accept → start → complete → cancel), timeline auditable, reglas de rol, listados “me” (client/provider), feed y open con Haversine + paginación. Tests e2e.

✅ Ratings: calificación post-DONE. Tests e2e.

✅ Notifications: entidad, servicio, controller, integración con transiciones, listar/leer/leer-todas, tests e2e.

✅ Migrations: esquema bajo control (MySQL), scripts de package y seed funcionando.

✅ Swagger: endpoints documentados con DTOs y ejemplos.

✅ Scripts: e2e:full corre migraciones + seed + e2e y queda todo verde.

Porcentaje de avance

~80% del backend MVP.
La base funcional está completa y probada end-to-end; falta pulir tiempo real, hardening y extras de producción.

Qué falta (backlog priorizado)

Alta prioridad (lo próximo a encarar)

Tiempo real de notificaciones
WebSocket Gateway o SSE (/notifications/stream) y emitir en notifyTransition.

Contadores rápidos
Endpoint GET /notifications/me/count (unseen) + test e2e.

Seguridad & hardening

@nestjs/throttler (rate limit en auth y requests).

helmet, CORS fino, saneo de inputs.

CI/CD
Workflow en GitHub Actions: npm ci → lint → e2e:full → build.
Chequeo de migraciones (“no pending”) en CI.

Media prioridad
5. Adapters de entrega (feature flags): email/push para algunos tipos de notificación.
6. Observabilidad
Logs con nestjs-pino (correlationId), endpoint /health, métricas básicas.
7. Índices y performance
Índices en service_requests(status, createdAt), request_transitions(request_id, createdAt), provider_service_types(provider_id, service_type_id).
Evaluar geospatial index si migramos a PostGIS o MySQL con SRID.
8. Más tests

Permisos de notifications (no leer de otros).

Feed/open: orden por distancia vs createdAt.

Admin-cancel con/ sin provider asignado.

Reintentos de refresh y revocación (re-use detection).

i18n de mensajes de notificación.

Baja prioridad / extras de producto
10. Adjuntos en requests (imágenes) + storage (S3).
11. Disponibilidad de proveedores (agenda) y ventanas horarias.
12. Versionado de API (/v1) y políticas de deprecación.
13. Recupero de contraseña y verificación de email.
14. Docker/Compose para dev/prod.

Mañana: plan en 3 pasos

GET /notifications/me/count + test e2e.

Esqueleto de SSE para notificaciones + emitir desde NotificationsService.

Integrar helmet + CORS + @nestjs/throttler con límites sensatos y tests básicos.


Memoria guardada actualizada

Listo. ✅ Quedó guardado:

Estado: e2e “todo verde”.

Commit sugerido (exacto).

Avance total ≈ 86% (detalle incluido).

Próximo tema: CI e2e + cobertura + docs.

Cuando vuelvas, lo traigo y seguimos desde ahí.