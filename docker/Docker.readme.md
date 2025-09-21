npm run docker:up
npm run docker:logs
npm run docker:seed
npm run docker:down



docker compose down -v
docker compose up -d --build
docker compose exec api node dist/scripts/seed-test.js

Levantar entorno dev desde powershell

docker compose -f docker/docker-compose.dev.yml up -d --build
docker compose -f docker/docker-compose.dev.yml exec api-dev npm run db:mig:run:ts
docker compose -f docker/docker-compose.dev.yml exec api-dev npm run seed:dev
npm run dev:logs
curl.exe http://localhost:3000/api/catalog/categories



Parar y borrar contenedores y red (conserva datos de DB):

docker compose down


Parar y borrar TODO (incluye volumen de DB → borra datos):

docker compose down -v --remove-orphans --rmi local

Dev (archivo docker-compose.dev.yml)

Si estás dentro de ./docker:

docker compose -f ./docker-compose.dev.yml down
# o para borrar también volúmenes/imágenes:
docker compose -f ./docker-compose.dev.yml down -v --remove-orphans --rmi local


Si estás en la raíz del repo:

docker compose -f docker/docker-compose.dev.yml down

Solo detener sin borrar (para reanudar más rápido)
docker compose stop                # en prod (./docker)
docker compose -f ./docker-compose.dev.yml stop   # en dev


y luego reanudar:

docker compose start
docker compose -f ./docker-compose.dev.yml start

Ver qué está corriendo / logs
docker compose ps
docker compose logs -f




Levantar en PROD (imagen compilada)

Dónde: dentro de la carpeta docker/ del repo

cd C:\Users\vszni\repositorios\app_servicios\Api_Servicios_Backend_Next_JS\docker
docker compose up -d --build


(Para bajar: docker compose down -v)

Levantar en DEV (hot-reload)

Dónde: desde la raíz del repo (o pasando la ruta al archivo dev)

cd C:\Users\vszni\repositorios\app_servicios\Api_Servicios_Backend_Next_JS
docker compose -f docker/docker-compose.dev.yml up -d


(Para bajar: docker compose -f docker/docker-compose.dev.yml down)

Verificación rápida
# Estado
docker compose ps

# Logs del API (usa el mismo -f si estás en modo dev)
docker compose logs -f api

# Probar endpoints
curl.exe http://localhost:3000/api/catalog/categories

Notas

Si te sale “docker daemon is not running”, abrí Docker Desktop y esperá a que diga “Engine running”.

También podés ejecutar los mismos comandos desde WSL en la ruta /mnt/c/Users/vszni/... si preferís.



# FLUJO DE PRUEBAS UNA VES CORRIENDO LA APP

# 1) Login cliente/proveedor
$clientToken = (irm http://localhost:3000/api/auth/login -Method POST -ContentType "application/json" -Body (@{ email="client2@demo.com";   password="123456" } | ConvertTo-Json)).accessToken
$provToken   = (irm http://localhost:3000/api/auth/login -Method POST -ContentType "application/json" -Body (@{ email="provider1@demo.com"; password="123456" } | ConvertTo-Json)).accessToken

# 2) Tomar serviceType (Destapar cañerías)
$stId = (irm http://localhost:3000/api/catalog/service-types | Where-Object { $_.name -like "Destapar*" }).id

# 3) Crear pedido (cliente)
$req = irm http://localhost:3000/api/requests -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $clientToken" } -Body (@{
  serviceTypeId = $stId; title="Destapar cañerías en baño"; description="Pierde agua y huele feo"
  address="CABA"; lat=-34.6037; lng=-58.3816; priceOffered=15000
} | ConvertTo-Json)
$rid = $req.id

# 4) Asegurar que el provider ofrece ese service type (una sola vez)
$provTypes = irm http://localhost:3000/api/providers/me/service-types -Headers @{ Authorization = "Bearer $provToken" }
if (-not ($provTypes | Where-Object { $_.serviceType.id -eq $stId })) {
  irm http://localhost:3000/api/providers/me/service-types -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $provToken" } -Body (@{ serviceTypeId=$stId; basePrice=20000 } | ConvertTo-Json)
}

# 5) Reclamar → Aceptar → Start → Complete → Rate
irm "http://localhost:3000/api/requests/$rid/claim"    -Method POST -Headers @{ Authorization = "Bearer $provToken"   } -ContentType "application/json" -Body (@{ priceOffered=18000 } | ConvertTo-Json)
irm "http://localhost:3000/api/requests/$rid/accept"   -Method POST -Headers @{ Authorization = "Bearer $clientToken" } -ContentType "application/json" -Body (@{ priceAgreed=18000 }  | ConvertTo-Json)
irm "http://localhost:3000/api/requests/$rid/start"    -Method POST -Headers @{ Authorization = "Bearer $provToken"   }
irm "http://localhost:3000/api/requests/$rid/complete" -Method POST -Headers @{ Authorization = "Bearer $provToken"   }
irm "http://localhost:3000/api/requests/$rid/rate"     -Method POST -Headers @{ Authorization = "Bearer $clientToken" } -ContentType "application/json" -Body (@{ stars=5; comment="Todo OK" } | ConvertTo-Json)

# 6) Timeline
irm "http://localhost:3000/api/requests/$rid/timeline" -Headers @{ Authorization = "Bearer $clientToken" } | Format-Table createdAt,fromStatus,toStatus,priceOffered,priceAgreed -AutoSize
