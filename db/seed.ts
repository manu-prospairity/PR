import { db } from "./index";
import { users, predictions } from "./schema";
import { sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function seed() {
  console.log('🌱 Seeding database...');

  // Create test users
  const testUsers = [
    { username: 'testuser1', password: await hashPassword('password123') },
    { username: 'testuser2', password: await hashPassword('password123') },
  ];

  console.log('Creating users...');
  for (const user of testUsers) {
    await db.insert(users).values(user).onConflictDoNothing();
  }

  // Create some test predictions
  const stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN'];
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  console.log('Creating predictions...');
  for (const user of testUsers) {
    const [userData] = await db.select().from(users).where(sql`${users.username} = ${user.username}`);
    
    for (const symbol of stocks) {
      await db.insert(predictions).values({
        userId: userData.id,
        symbol,
        predictedPrice: (Math.random() * 1000).toFixed(2),
        predictionTime: now,
        targetTime: tomorrow,
      }).onConflictDoNothing();
    }
  }

  console.log('✅ Seeding complete!');
}

// Run the seed function
seed().catch(console.error); 