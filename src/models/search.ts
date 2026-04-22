import { pool } from "../config/db";

export interface ShopResult {
  id: string;
  company_name: string;
  category_name: string | null;
  parent_category_name: string | null;
  wilaya_name: string | null;
  wilaya_code: number | null;
  score: number;
}

export interface ProductResult {
  id: string;
  title: string;
  price: string;
  main_image: string;
  avg_rating: string | null;
  review_count: string;
  company_name: string;
  merchant_id: string;
  category_name: string | null;
  score: number;
}

// Score formula for products: title x1.5, description x1.0, category x0.8
function productScoreSQL(q: string): string {
  return `GREATEST(
    similarity(unaccent(lower(p.title)), unaccent(lower(${q}))) * 1.5,
    similarity(unaccent(lower(p.description)), unaccent(lower(${q}))) * 1.0,
    COALESCE(similarity(unaccent(lower(CAT_COL)), unaccent(lower(${q}))), 0) * 0.8,
    COALESCE(similarity(unaccent(lower(PCAT_COL)), unaccent(lower(${q}))), 0) * 0.8
  )`;
}

function replCols(sql: string, lang: "en" | "fr"): string {
  const catCol = lang === "fr" ? "cat.name_fr" : "cat.name_en";
  const parentCatCol = lang === "fr" ? "pcat.name_fr" : "pcat.name_en";
  return sql.replace(/CAT_COL/g, catCol).replace(/PCAT_COL/g, parentCatCol);
}

// Fuzzy search shops by name or category
export async function searchShops(query: string, lang: "en" | "fr", limit: number, offset: number): Promise<{ results: ShopResult[]; total: number }> {
  const catCol = lang === "fr" ? "cat.name_fr" : "cat.name_en";
  const parentCatCol = lang === "fr" ? "pcat.name_fr" : "pcat.name_en";
  const wilayaCol = lang === "fr" ? "w.name_fr" : "w.name_en";

  const sql = `
    WITH scored AS (
      SELECT m.id, m.company_name,
        ${catCol} AS category_name,
        ${parentCatCol} AS parent_category_name,
        ${wilayaCol} AS wilaya_name,
        m.wilaya_code,
        GREATEST(
          similarity(unaccent(lower(m.company_name)), unaccent(lower($1))),
          COALESCE(similarity(unaccent(lower(${catCol})), unaccent(lower($1))), 0),
          COALESCE(similarity(unaccent(lower(${parentCatCol})), unaccent(lower($1))), 0)
        ) AS score
      FROM merchants m
      LEFT JOIN categories cat ON cat.id = m.category_id
      LEFT JOIN categories pcat ON pcat.id = cat.parent_id
      LEFT JOIN wilayas w ON w.code = m.wilaya_code
    )
    SELECT * FROM scored WHERE score > 0.1 ORDER BY score DESC, company_name ASC
  `;

  const countSql = `
    WITH scored AS (
      SELECT GREATEST(
        similarity(unaccent(lower(m.company_name)), unaccent(lower($1))),
        COALESCE(similarity(unaccent(lower(${catCol})), unaccent(lower($1))), 0),
        COALESCE(similarity(unaccent(lower(${parentCatCol})), unaccent(lower($1))), 0)
      ) AS score
      FROM merchants m
      LEFT JOIN categories cat ON cat.id = m.category_id
      LEFT JOIN categories pcat ON pcat.id = cat.parent_id
    )
    SELECT COUNT(*) FROM scored WHERE score > 0.1
  `;

  const [countRes, dataRes] = await Promise.all([
    pool.query(countSql, [query]),
    pool.query(sql + " LIMIT $2 OFFSET $3", [query, limit, offset]),
  ]);
  return { results: dataRes.rows, total: parseInt(countRes.rows[0].count) };
}

// Fuzzy search products by name, description, then category
export async function searchProducts(query: string, lang: "en" | "fr", limit: number, offset: number): Promise<{ results: ProductResult[]; total: number }> {
  const scoreExpr = replCols(productScoreSQL("$1"), lang);

  const sql = `
    WITH scored AS (
      SELECT p.id, p.title, p.price, p.main_image, p.merchant_id,
        m.company_name,
        ${lang === "fr" ? "cat.name_fr" : "cat.name_en"} AS category_name,
        COALESCE(AVG(r.rating), NULL) AS avg_rating,
        COUNT(r.id)::text AS review_count,
        ${scoreExpr} AS score
      FROM products p
      JOIN merchants m ON m.id = p.merchant_id
      LEFT JOIN categories cat ON cat.id = m.category_id
      LEFT JOIN categories pcat ON pcat.id = cat.parent_id
      LEFT JOIN reviews r ON r.product_id = p.id
      GROUP BY p.id, m.company_name, cat.name_fr, cat.name_en, pcat.name_fr, pcat.name_en
    )
    SELECT * FROM scored WHERE score > 0.1 ORDER BY score DESC, title ASC
  `;

  const countSql = `
    WITH scored AS (
      SELECT ${scoreExpr} AS score
      FROM products p
      JOIN merchants m ON m.id = p.merchant_id
      LEFT JOIN categories cat ON cat.id = m.category_id
      LEFT JOIN categories pcat ON pcat.id = cat.parent_id
    )
    SELECT COUNT(*) FROM scored WHERE score > 0.1
  `;

  const [countRes, dataRes] = await Promise.all([
    pool.query(countSql, [query]),
    pool.query(sql + " LIMIT $2 OFFSET $3", [query, limit, offset]),
  ]);
  return { results: dataRes.rows, total: parseInt(countRes.rows[0].count) };
}

// Fuzzy search merchant's OWN products (for web-pro)
export async function searchMyProducts(query: string, merchantId: string, lang: "en" | "fr"): Promise<ProductResult[]> {
  const scoreExpr = replCols(productScoreSQL("$1"), lang);

  const { rows } = await pool.query(`
    SELECT p.id, p.title, p.price, p.main_image, p.merchant_id,
      m.company_name,
      ${lang === "fr" ? "cat.name_fr" : "cat.name_en"} AS category_name,
      COALESCE(AVG(r.rating), NULL) AS avg_rating,
      COUNT(r.id)::text AS review_count,
      ${scoreExpr} AS score
    FROM products p
    JOIN merchants m ON m.id = p.merchant_id
    LEFT JOIN categories cat ON cat.id = m.category_id
    LEFT JOIN categories pcat ON pcat.id = cat.parent_id
    LEFT JOIN reviews r ON r.product_id = p.id
    WHERE p.merchant_id = $2
    GROUP BY p.id, m.company_name, cat.name_fr, cat.name_en, pcat.name_fr, pcat.name_en
    HAVING ${scoreExpr} > 0.1
    ORDER BY ${scoreExpr} DESC, p.title ASC
  `, [query, merchantId]);

  return rows;
}

// Autocomplete suggestions (max 5)
export async function suggestShops(query: string, lang: "en" | "fr"): Promise<{ id: string; name: string; score: number }[]> {
  const catCol = lang === "fr" ? "cat.name_fr" : "cat.name_en";
  const parentCatCol = lang === "fr" ? "pcat.name_fr" : "pcat.name_en";

  const { rows } = await pool.query(`
    SELECT m.id, m.company_name AS name,
      GREATEST(
        similarity(unaccent(lower(m.company_name)), unaccent(lower($1))),
        COALESCE(similarity(unaccent(lower(${catCol})), unaccent(lower($1))), 0),
        COALESCE(similarity(unaccent(lower(${parentCatCol})), unaccent(lower($1))), 0)
      ) AS score
    FROM merchants m
    LEFT JOIN categories cat ON cat.id = m.category_id
    LEFT JOIN categories pcat ON pcat.id = cat.parent_id
    WHERE GREATEST(
      similarity(unaccent(lower(m.company_name)), unaccent(lower($1))),
      COALESCE(similarity(unaccent(lower(${catCol})), unaccent(lower($1))), 0),
      COALESCE(similarity(unaccent(lower(${parentCatCol})), unaccent(lower($1))), 0)
    ) > 0.1
    ORDER BY score DESC LIMIT 5
  `, [query]);
  return rows;
}

export async function suggestProducts(query: string, lang: "en" | "fr"): Promise<{ id: string; name: string; price: string; score: number }[]> {
  const scoreExpr = replCols(productScoreSQL("$1"), lang);

  const { rows } = await pool.query(`
    SELECT p.id, p.title AS name, p.price,
      ${scoreExpr} AS score
    FROM products p
    JOIN merchants m ON m.id = p.merchant_id
    LEFT JOIN categories cat ON cat.id = m.category_id
    LEFT JOIN categories pcat ON pcat.id = cat.parent_id
    WHERE ${scoreExpr} > 0.1
    ORDER BY score DESC LIMIT 5
  `, [query]);
  return rows;
}
