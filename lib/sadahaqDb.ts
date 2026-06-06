import { Pool } from "pg";

const pool = new Pool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: 5432,
  user: "medusa_user",
  password: "Saanvi02052016@",
  database: "sadahaq_service_db",
  max: 5,
});

export async function query(sql: string, params: any[] = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function getPage(slug: string) {
  const rows = await query(
    "SELECT slug, title, content, service_slug FROM dr_pages WHERE slug = $1 AND status = 1 LIMIT 1",
    [slug]
  );
  return rows[0] || null;
}

export async function getAllPages() {
  return await query("SELECT slug, title, service_slug FROM dr_pages WHERE status = 1");
}

export async function getBanners(serviceSlug = "sadahaq") {
  return await query(
    "SELECT * FROM dr_banners WHERE service_slug = $1 AND status = 1 ORDER BY sort_order ASC",
    [serviceSlug]
  );
}

export async function getNGOs(limit = 50) {
  return await query(
    "SELECT id, name, category, city, website FROM sadahaq_ngos LIMIT $1",
    [limit]
  );
}

export async function getGrievances(limit = 50) {
  return await query(
    "SELECT id, subject, status, created_at FROM sadahaq_grievances ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
}

export async function getMentors(limit = 50) {
  return await query(
    "SELECT m.id, m.expertise, m.profession, m.organisation, m.available_for_mentoring FROM sadahaq_mentor_profiles m LIMIT $1",
    [limit]
  );
}

export async function getVolunteers(limit = 50) {
  return await query(
    "SELECT v.id, v.volunteer_type, v.dept_expertise, v.rating, v.on_duty FROM sadahaq_volunteer_profiles v LIMIT $1",
    [limit]
  );
}
