npm run docker:up
npm run docker:logs
npm run docker:seed
npm run docker:down



docker compose down -v
docker compose up -d --build
docker compose exec api node dist/scripts/seed-test.js