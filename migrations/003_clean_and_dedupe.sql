-- Step 1: extend filler list with the adjective noise from the generator,
-- strip adjacent repeated words (case-insensitive), and re-upsert.
-- Step 2: dedupe (display_title, sales_channel_id) pairs by keeping the
-- lowest source_product_id.

BEGIN;

-- Remove any earlier derivation artefacts so the fresh run dominates.
-- (ON CONFLICT UPDATE updates in-place — no deletion needed for step 1.)

WITH cleaned AS (
  SELECT
    p.id AS source_product_id,
    psc.sales_channel_id,
    -- Stage 1: strip filler words (broader list)
    regexp_replace(
      p.title,
      '\m(contemporary|heritage|traditional|authentic|classic|festive|homestyle|regional|modern|fusion|aromatic|smoky|hearty|rich|spicy|mild|sweet|savory|savoury|light|village-?style|rustic|farmhouse|royal|grand|hot|cold|fresh|crunchy|tender|juicy|zesty|creamy|crispy|silky|tangy|bold|delicate|fiery|velvety)\M',
      '',
      'gi'
    ) AS stripped,
    p.metadata->>'cuisine_origin' AS cuisine_origin,
    p.metadata->>'veg_nonveg'     AS veg_nonveg,
    pcat.name                     AS food_category
  FROM product p
  JOIN product_sales_channel psc ON psc.product_id = p.id
  JOIN sales_channel sc          ON sc.id = psc.sales_channel_id
  LEFT JOIN product_category_product pcp ON pcp.product_id = p.id
  LEFT JOIN product_category        pcat ON pcat.id = pcp.product_category_id
  WHERE p.deleted_at IS NULL
    AND p.status = 'published'
    AND COALESCE(sc.metadata->>'platform','') = 'food.digitalrohtak.online'
),
normalized AS (
  SELECT
    c.*,
    -- Collapse whitespace + trim
    btrim(regexp_replace(c.stripped, '\s+', ' ', 'g')) AS normed
  FROM cleaned c
),
deduped_adjacent AS (
  SELECT
    source_product_id,
    sales_channel_id,
    cuisine_origin,
    veg_nonveg,
    food_category,
    -- Strip adjacent duplicated words: "Aromatic Aromatic Fish" -> "Aromatic Fish"
    -- Apply twice for nested runs.
    btrim(regexp_replace(
      regexp_replace(
        lower(normed),
        '\m(\w+)( \1)+\M',
        '\1',
        'g'
      ),
      '\m(\w+)( \1)+\M',
      '\1',
      'g'
    )) AS final_lower
  FROM normalized
),
prices AS (
  SELECT pv.product_id, MIN(pr.amount)::int AS price_inr
    FROM product_variant pv
    JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
    JOIN price pr                       ON pr.price_set_id = pvps.price_set_id
   WHERE pr.currency_code = 'inr' AND pr.deleted_at IS NULL
   GROUP BY pv.product_id
),
parsed AS (
  SELECT
    d.source_product_id,
    d.sales_channel_id,
    initcap(NULLIF(d.final_lower, '')) AS display_title,
    d.cuisine_origin,
    d.veg_nonveg,
    d.food_category,
    pp.price_inr,
    CASE
      WHEN d.cuisine_origin LIKE '%India%'     THEN 'Indian'
      WHEN d.cuisine_origin LIKE '% - China%'          OR d.cuisine_origin = 'Asia - China'    THEN 'Chinese'
      WHEN d.cuisine_origin LIKE '% - Thailand%'       OR d.cuisine_origin = 'Asia - Thailand' THEN 'Thai'
      WHEN d.cuisine_origin LIKE '% - Italy%'          THEN 'Italian'
      WHEN d.cuisine_origin LIKE '% - France%'         THEN 'French'
      WHEN d.cuisine_origin LIKE '% - Germany%'        THEN 'German'
      WHEN d.cuisine_origin LIKE '% - Japan%'          THEN 'Japanese'
      WHEN d.cuisine_origin LIKE '% - South Korea%'    THEN 'Korean'
      WHEN d.cuisine_origin LIKE '% - Vietnam%'        THEN 'Vietnamese'
      WHEN d.cuisine_origin LIKE '% - Greece%'         THEN 'Greek'
      WHEN d.cuisine_origin LIKE '% - Lebanon%'        THEN 'Lebanese'
      WHEN d.cuisine_origin LIKE '% - Spain%'          THEN 'Spanish'
      WHEN d.cuisine_origin LIKE '% - Turkey%'         THEN 'Turkish'
      WHEN d.cuisine_origin LIKE '% - Pakistan%'       THEN 'Pakistani'
      WHEN d.cuisine_origin LIKE '% - Egypt%'          THEN 'Egyptian'
      WHEN d.cuisine_origin LIKE '% - Ethiopia%'       THEN 'Ethiopian'
      WHEN d.cuisine_origin LIKE '% - Nigeria%'        THEN 'Nigerian'
      WHEN d.cuisine_origin LIKE '% - Morocco%'        THEN 'Moroccan'
      WHEN d.cuisine_origin LIKE '% - Russia%'         THEN 'Russian'
      WHEN d.cuisine_origin LIKE '% - Poland%'         THEN 'Polish'
      WHEN d.cuisine_origin LIKE '% - United Kingdom%' THEN 'British'
      WHEN d.cuisine_origin LIKE '% - United States%'  THEN 'American'
      WHEN d.cuisine_origin LIKE '% - Mexico%'         THEN 'Mexican'
      WHEN d.cuisine_origin LIKE '% - Brazil%'         THEN 'Brazilian'
      WHEN d.cuisine_origin LIKE '% - Peru%'           THEN 'Peruvian'
      WHEN d.cuisine_origin LIKE '% - Argentina%'      THEN 'Argentine'
      WHEN d.cuisine_origin LIKE '% - Indonesia%'      THEN 'Indonesian'
      WHEN d.cuisine_origin LIKE '% - Malaysia%'       THEN 'Malaysian'
      WHEN d.cuisine_origin LIKE '% - Philippines%'    THEN 'Filipino'
      WHEN d.cuisine_origin LIKE '% - Sri Lanka%'      THEN 'Sri Lankan'
      WHEN d.cuisine_origin LIKE '% - Nepal%'          THEN 'Nepali'
      WHEN d.cuisine_origin LIKE '% - Bangladesh%'     THEN 'Bangladeshi'
      WHEN d.cuisine_origin LIKE '% - Iran%'           THEN 'Iranian'
      WHEN d.cuisine_origin LIKE '% - Cuba%'           THEN 'Cuban'
      WHEN d.cuisine_origin LIKE '% - Jamaica%'        THEN 'Jamaican'
      WHEN d.cuisine_origin LIKE '% - Australia%'      THEN 'Australian'
      ELSE 'Indian'
    END AS cuisine,
    CASE
      WHEN d.cuisine_origin LIKE 'Asia - India - %'
        THEN NULLIF(split_part(d.cuisine_origin, ' - ', 3), '')
      WHEN d.cuisine_origin = 'Asia - India' THEN NULL
      WHEN position(' - ' IN d.cuisine_origin) > 0
        THEN NULLIF(split_part(d.cuisine_origin, ' - ', 2), '')
      ELSE NULL
    END AS sub_region
  FROM deduped_adjacent d
  LEFT JOIN prices pp ON pp.product_id = d.source_product_id
)
INSERT INTO food_dish_catalogue
  (source_product_id, sales_channel_id, display_title, cuisine, sub_region, food_category, price_inr, veg_nonveg)
SELECT
  source_product_id,
  sales_channel_id,
  COALESCE(display_title, 'Dish'),
  cuisine,
  sub_region,
  food_category,
  price_inr,
  veg_nonveg
FROM parsed
ON CONFLICT (source_product_id) DO UPDATE SET
  sales_channel_id = EXCLUDED.sales_channel_id,
  display_title    = EXCLUDED.display_title,
  cuisine          = EXCLUDED.cuisine,
  sub_region       = EXCLUDED.sub_region,
  food_category    = EXCLUDED.food_category,
  price_inr        = EXCLUDED.price_inr,
  veg_nonveg       = EXCLUDED.veg_nonveg,
  updated_at       = now();

-- Step 2: dedupe (display_title, sales_channel_id) pairs — keep lowest id.
DELETE FROM food_dish_catalogue fdc
 USING food_dish_catalogue other
 WHERE fdc.sales_channel_id = other.sales_channel_id
   AND fdc.display_title    = other.display_title
   AND fdc.id > other.id;

-- Step 3: seed Maa-Ki-Rasoi with Rohtak coordinates so Near-Me works today.
UPDATE sales_channel
   SET metadata = metadata || jsonb_build_object(
         'lat', 28.8955,
         'lng', 76.6066
       )
 WHERE id = 'sc_01KR1PCS0QGKNSWBNSYCG98TBX'
   AND (metadata->>'lat' IS NULL OR metadata->>'lng' IS NULL);

COMMIT;
