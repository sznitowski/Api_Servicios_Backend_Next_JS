SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;
TRUNCATE TABLE service_types;
TRUNCATE TABLE categories;
SET FOREIGN_KEY_CHECKS=1;

INSERT INTO categories (name) VALUES
  ("Plomería"), ("Electricidad"), ("Pintura");

INSERT INTO service_types (category_id, name) VALUES
  ((SELECT id FROM categories WHERE name="Plomería"),     "Destapar cañerías"),
  ((SELECT id FROM categories WHERE name="Electricidad"), "Reparación de cortos");
