-- Hierarchical Dish Catalogue — derived table that categorises every
-- published food product at 3 levels (cuisine → sub_region → food_category).
-- Idempotent: safe to re-run.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS food_dish_catalogue (
  id                 text        PRIMARY KEY
                                 DEFAULT ('fdc_' || replace(gen_random_uuid()::text,'-','')),
  source_product_id  text        NOT NULL
                                 REFERENCES product(id) ON DELETE CASCADE,
  sales_channel_id   text        NULL,
  display_title      text        NOT NULL,
  cuisine            text        NOT NULL,
  sub_region         text        NULL,
  food_category      text        NULL,
  price_inr          integer     NULL,
  veg_nonveg         text        NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS food_dish_catalogue_source_product_id_key
  ON food_dish_catalogue (source_product_id);

CREATE INDEX IF NOT EXISTS food_dish_catalogue_hier_idx
  ON food_dish_catalogue (cuisine, sub_region, food_category);

CREATE INDEX IF NOT EXISTS food_dish_catalogue_channel_idx
  ON food_dish_catalogue (sales_channel_id);

CREATE INDEX IF NOT EXISTS food_dish_catalogue_display_title_trgm
  ON food_dish_catalogue USING gin (display_title gin_trgm_ops);

COMMIT;
