// `npm run seed` - wipes the database and loads fresh demo data.
import { initDb } from '../db/index.js';
import { seedDatabase, DEMO_ACCOUNTS } from './seed.js';

await initDb();
await seedDatabase({ reset: true });
console.log('Demo data loaded.');
console.log(`  Demo customer: ${DEMO_ACCOUNTS.customer.name}, demo worker: ${DEMO_ACCOUNTS.worker.name} (one tap on the login page)`);
process.exit(0);
