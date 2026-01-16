import fs from 'fs';
import path from 'path';
import { pool } from './client';

async function runMigrations() {
    const dir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(dir).sort();

    for (const file of files) {
        const sql = fs.readFileSync(path.join(dir, file), 'utf8');
        console.log(`Running migration: ${file}`);
        await pool.query(sql);
    }

    console.log('Migrations complete');
    process.exit(0);
}

runMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
});