import { db } from "./index";
import { sql } from "drizzle-orm";

async function dropTables() {
  console.log('Dropping all tables...');
  await db.execute(sql`
    DROP TABLE IF EXISTS rankings CASCADE;
    DROP TABLE IF EXISTS predictions CASCADE;
    DROP TABLE IF EXISTS stock_data CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TYPE IF EXISTS time_frame;
  `);
  console.log('Tables dropped successfully');
}

dropTables().catch(console.error); 