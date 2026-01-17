console.log('❌abc')
const { pool } = require('./client');

async function test() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Connected to DB:', res.rows);
  } catch (err) {
    console.error('DB connection failed:', err);
  } finally {
    await pool.end();
  }
}
console.log('✅ Testing DB connection...');
test();
