-- One-shot derivation: strips filler words, parses cuisine_origin,
-- joins product_category, upserts into food_dish_catalogue.
-- Safe to re-run. Does NOT mutate product.title.

WITH cleaned AS (
  SELECT
    p.id AS source_product_id,
    psc.sales_channel_id,
    btrim(
      regexp_replace(
        regexp_replace(
          p.title,
          '\m(contemporary|heritage|traditional|authentic|classic|festive|homestyle|regional|modern|fusion)\M',
          '',
          'gi'
        ),
        '\s+',
        ' ',
        'g'
      )
    ) AS display_title,
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
    c.*,
    pp.price_inr,
    CASE
      WHEN c.cuisine_origin LIKE '%India%'     THEN 'Indian'
      WHEN c.cuisine_origin LIKE '% - China%'          OR c.cuisine_origin = 'Asia - China'    THEN 'Chinese'
      WHEN c.cuisine_origin LIKE '% - Thailand%'       OR c.cuisine_origin = 'Asia - Thailand' THEN 'Thai'
      WHEN c.cuisine_origin LIKE '% - Italy%'          THEN 'Italian'
      WHEN c.cuisine_origin LIKE '% - France%'         THEN 'French'
      WHEN c.cuisine_origin LIKE '% - Germany%'        THEN 'German'
      WHEN c.cuisine_origin LIKE '% - Japan%'          THEN 'Japanese'
      WHEN c.cuisine_origin LIKE '% - South Korea%'    THEN 'Korean'
      WHEN c.cuisine_origin LIKE '% - Vietnam%'        THEN 'Vietnamese'
      WHEN c.cuisine_origin LIKE '% - Greece%'         THEN 'Greek'
      WHEN c.cuisine_origin LIKE '% - Lebanon%'        THEN 'Lebanese'
      WHEN c.cuisine_origin LIKE '% - Spain%'          THEN 'Spanish'
      WHEN c.cuisine_origin LIKE '% - Turkey%'         THEN 'Turkish'
      WHEN c.cuisine_origin LIKE '% - Pakistan%'       THEN 'Pakistani'
      WHEN c.cuisine_origin LIKE '% - Egypt%'          THEN 'Egyptian'
      WHEN c.cuisine_origin LIKE '% - Ethiopia%'       THEN 'Ethiopian'
      WHEN c.cuisine_origin LIKE '% - Nigeria%'        THEN 'Nigerian'
      WHEN c.cuisine_origin LIKE '% - Morocco%'        THEN 'Moroccan'
      WHEN c.cuisine_origin LIKE '% - Russia%'         THEN 'Russian'
      WHEN c.cuisine_origin LIKE '% - Poland%'         THEN 'Polish'
      WHEN c.cuisine_origin LIKE '% - United Kingdom%' THEN 'British'
      WHEN c.cuisine_origin LIKE '% - United States%'  THEN 'American'
      WHEN c.cuisine_origin LIKE '% - Mexico%'         THEN 'Mexican'
      WHEN c.cuisine_origin LIKE '% - Brazil%'         THEN 'Brazilian'
      WHEN c.cuisine_origin LIKE '% - Peru%'           THEN 'Peruvian'
      WHEN c.cuisine_origin LIKE '% - Argentina%'      THEN 'Argentine'
      WHEN c.cuisine_origin LIKE '% - Indonesia%'      THEN 'Indonesian'
      WHEN c.cuisine_origin LIKE '% - Malaysia%'       THEN 'Malaysian'
      WHEN c.cuisine_origin LIKE '% - Philippines%'    THEN 'Filipino'
      WHEN c.cuisine_origin LIKE '% - Sri Lanka%'      THEN 'Sri Lankan'
      WHEN c.cuisine_origin LIKE '% - Nepal%'          THEN 'Nepali'
      WHEN c.cuisine_origin LIKE '% - Bangladesh%'     THEN 'Bangladeshi'
      WHEN c.cuisine_origin LIKE '% - Iran%'           THEN 'Iranian'
      WHEN c.cuisine_origin LIKE '% - Cuba%'           THEN 'Cuban'
      WHEN c.cuisine_origin LIKE '% - Jamaica%'        THEN 'Jamaican'
      WHEN c.cuisine_origin LIKE '% - Australia%'      THEN 'Australian'
      ELSE 'Indian'
    END AS cuisine,
    CASE
      WHEN c.cuisine_origin LIKE 'Asia - India - %'
        THEN NULLIF(split_part(c.cuisine_origin, ' - ', 3), '')
      WHEN c.cuisine_origin = 'Asia - India' THEN NULL
      WHEN position(' - ' IN c.cuisine_origin) > 0
        THEN NULLIF(split_part(c.cuisine_origin, ' - ', 2), '')
      ELSE NULL
    END AS sub_region
  FROM cleaned c
  LEFT JOIN prices pp ON pp.product_id = c.source_product_id
)
INSERT INTO food_dish_catalogue
  (source_product_id, sales_channel_id, display_title, cuisine, sub_region, food_category, price_inr, veg_nonveg)
SELECT
  source_product_id,
  sales_channel_id,
  COALESCE(NULLIF(initcap(display_title), ''), 'Dish'),
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
