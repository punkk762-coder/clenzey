import { pool } from "./src/db/index.ts";

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * FROM service_zones LIMIT 1");
    console.log("Service zones count:", res.rows.length);
  } catch (err: any) {
    console.error("Direct query error:", err);
  }

  try {
    const res = await client.query("SELECT postgis_version()");
    console.log("PostGIS version:", res.rows[0]);
  } catch (err: any) {
    console.error("PostGIS extension error:", err);
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
