% de avance del backend (estimación)

≈ 80% ✅

Listo/estable:

Autenticación (JWT login), roles & guards.

Módulos: Users, Catalog/ServiceTypes, Requests (claim → accept → start → complete/cancel).

Timeline de transiciones.

Búsqueda de proveedores (radio + orden).

Ratings (calificar proveedor + resumen).

Logging con nestjs-pino (pretty en dev/test).

Armazón de e2e (smoke /auth/login) y módulo de testing.

Pendiente para llegar al 100%:

E2E sólidos de todo el flujo (claim→accept→start→complete, cancel admin/usuario, ratings, feeds).

Alinear HTTP codes (login 200 vs 201) y terminar de fijar el entorno de test (MySQL test DB o SQLite in-memory).

Migrations (deshabilitar synchronize en prod), seeds por entorno.

Validación exhaustiva (DTOs con class-validator) y filtros de errores unificados.

Swagger/OpenAPI + ejemplos.

CI (GitHub Actions) corriendo lint + tests e2e con servicio MySQL.

Seguridad: CORS/Helmet, rate-limit, refresh tokens (si lo vas a usar), política de contraseñas.

Observabilidad: IDs de request, niveles de log por entorno, métricas básicas.

Hardening de consultas (índices, límites, paginación consistente, ordenar por columnas indexadas).

¿Con qué seguimos? (orden recomendado)

Estabilizar test e2e

Decidir DB de pruebas:

Opción A (simple): MySQL services_test con dropSchema:true en AppTestingModule.

Opción B: SQLite in-memory y usar type: 'simple-enum' donde aplique.

Corregir el código/expect del login (200 vs 201) y dejar el smoke verde.

E2E del flujo completo

Crear cliente + request → provider claim → client accept → provider start/complete → rate → summaries → admin-cancel (otro caso).

Datos semilla mínimos en onModuleInit.

Migrations y seeds

Generar migraciones de todas las entidades.

synchronize:false en dev/prod, true solo en test con dropSchema.

Swagger + DTO validation

Decoradores @Api* y @UsePipes(ValidationPipe) consistente.

Documentar examples y enums.

CI/CD

Workflow de GitHub Actions: npm ci, lint, build, levantar MySQL de servicio, correr test:e2e, artifacts de reportes.

Seguridad y hardening

Helmet, CORS, rate limiting.

(Opcional) refresh token flow y revocación.

Revisar autorizaciones de rutas admin.