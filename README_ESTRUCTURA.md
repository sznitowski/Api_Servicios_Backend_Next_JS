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
