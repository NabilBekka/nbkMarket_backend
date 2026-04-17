import { pool } from "../config/db";

export interface Category {
  id: number;
  parent_id: number | null;
  name_en: string;
  name_fr: string;
}

export interface CategoryWithParent extends Category {
  parent_name_en: string | null;
  parent_name_fr: string | null;
}

export async function search(query: string, lang: "en" | "fr", limit: number, offset: number): Promise<{ categories: CategoryWithParent[]; total: number }> {
  const nameCol = lang === "fr" ? "name_fr" : "name_en";
  const parentNameCol = lang === "fr" ? "p.name_fr" : "p.name_en";
  const q = `%${query}%`;

  // Search with unaccent so "pat" matches "Pâtisserie"
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE c.parent_id IS NOT NULL
       AND (unaccent(c.${nameCol}) ILIKE unaccent($1) OR unaccent(p.${nameCol}) ILIKE unaccent($1))`,
    [q]
  );
  const total = parseInt(countResult.rows[0].count);

  const { rows } = await pool.query(
    `SELECT c.*, ${parentNameCol} AS parent_name_fr, p.name_en AS parent_name_en
     FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE c.parent_id IS NOT NULL
       AND (unaccent(c.${nameCol}) ILIKE unaccent($1) OR unaccent(p.${nameCol}) ILIKE unaccent($1))
     ORDER BY p.id, c.id
     LIMIT $2 OFFSET $3`,
    [q, limit, offset]
  );

  return { categories: rows, total };
}

export async function findById(id: number): Promise<CategoryWithParent | null> {
  const { rows } = await pool.query(
    `SELECT c.*, p.name_en AS parent_name_en, p.name_fr AS parent_name_fr
     FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE c.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function findAll(): Promise<Category[]> {
  const { rows } = await pool.query("SELECT * FROM categories ORDER BY id");
  return rows;
}
