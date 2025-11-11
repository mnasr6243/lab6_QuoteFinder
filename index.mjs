import express from 'express';
import mysql from 'mysql2/promise';

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// ========================================================= Database Setup =========================================================
const pool = mysql.createPool({
  host: "s0znzigqvfehvff5.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
  user: "gx1or1xzatdre76g",
  password: "f94rxr9crzfbel7u",
  database: "egvkfzji8asbucq9",
  connectionLimit: 10,
  waitForConnections: true
});

// ========================================================= Helpers =========================================================
async function getAuthorsAndCategories() {
  const [authors] = await pool.query(`
    SELECT authorId, firstName, lastName
    FROM authors
    ORDER BY lastName, firstName
  `);

  const [catRows] = await pool.query(`
    SELECT DISTINCT category
    FROM quotes
    WHERE category IS NOT NULL AND category <> ''
    ORDER BY category
  `);
  const categories = catRows.map(r => r.category);

  return { authors, categories };
}

// ========================================================= Routes =========================================================

// Home route - show search UI & dropdowns
app.get('/', async (req, res) => {
  try {
    const { authors, categories } = await getAuthorsAndCategories();
    res.render('home.ejs', { authors, categories, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading home.');
  }
});

// Search by keyword (≥3 chars)
app.get('/searchByKeyword', async (req, res) => {
  try {
    const keyword = (req.query.keyword || '').trim();
    const { authors, categories } = await getAuthorsAndCategories();

    if (keyword.length < 3) {
      return res.render('home.ejs', {
        authors, categories,
        error: 'Keyword must be at least 3 characters.'
      });
    }

    const [rows] = await pool.query(`
      SELECT
        q.quoteId,
        q.quote,
        q.likes      AS likes,
        q.category   AS categoryName,
        a.authorId,
        a.firstName,
        a.lastName
      FROM quotes q
      JOIN authors a ON q.authorId = a.authorId
      WHERE q.quote LIKE ?
      ORDER BY q.likes DESC, q.quote ASC
    `, [`%${keyword}%`]);

    res.render('results.ejs', { rows, title: `Results for “${keyword}”` });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error searching by keyword.');
  }
});

// Search by author
app.get('/searchByAuthor', async (req, res) => {
  try {
    const id = req.query.authorId;
    if (!id) return res.redirect('/');

    const [rows] = await pool.query(`
      SELECT
        q.quoteId,
        q.quote,
        q.likes      AS likes,
        q.category   AS categoryName,
        a.authorId,
        a.firstName,
        a.lastName
      FROM quotes q
      JOIN authors a ON q.authorId = a.authorId
      WHERE a.authorId = ?
      ORDER BY q.likes DESC, q.quote ASC
    `, [id]);

    res.render('results.ejs', { rows, title: 'Results by Author' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error searching by author.');
  }
});

// Search by category
app.get('/searchByCategory', async (req, res) => {
  try {
    const category = req.query.category;
    if (!category) return res.redirect('/');

    const [rows] = await pool.query(`
      SELECT
        q.quoteId,
        q.quote,
        q.likes      AS likes,
        q.category   AS categoryName,
        a.authorId,
        a.firstName,
        a.lastName
      FROM quotes q
      JOIN authors a ON q.authorId = a.authorId
      WHERE q.category = ?
      ORDER BY q.likes DESC, q.quote ASC
    `, [category]);

    res.render('results.ejs', { rows, title: `Category: ${category}` });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error searching by category.');
  }
});

// Search by likes range
app.get('/searchByLikes', async (req, res) => {
  try {
    let min = Number.isFinite(+req.query.min) ? +req.query.min : 0;
    let max = Number.isFinite(+req.query.max) ? +req.query.max : 1_000_000;
    if (min > max) [min, max] = [max, min];

    const [rows] = await pool.query(`
      SELECT
        q.quoteId,
        q.quote,
        q.likes      AS likes,
        q.category   AS categoryName,
        a.authorId,
        a.firstName,
        a.lastName
      FROM quotes q
      JOIN authors a ON q.authorId = a.authorId
      WHERE q.likes BETWEEN ? AND ?
      ORDER BY q.likes ASC, q.quote ASC
    `, [min, max]);

    res.render('results.ejs', { rows, title: `Likes ${min}–${max}` });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error searching by likes range.');
  }
});

// API - get author info (for modal)
app.get('/api/authorInfo/:id', async (req, res) => {
  try {
    const authorId = req.params.id;

    const [info] = await pool.query(`
      SELECT
        authorId,
        firstName,
        lastName,
        dob,
        dod,
        sex,
        profession,
        country,
        portrait,
        biography
      FROM authors
      WHERE authorId = ?
      LIMIT 1
    `, [authorId]);

    if (info.length === 0) return res.status(404).json({ error: 'Author not found' });

    const [count] = await pool.query(`
      SELECT COUNT(*) AS quotesCount
      FROM quotes
      WHERE authorId = ?
    `, [authorId]);

    res.json({ ...info[0], quotesCount: count[0]?.quotesCount ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching author info' });
  }
});

// DB test
app.get('/dbTest', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT CURDATE() AS today');
    res.send(rows);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Database error!');
  }
});

app.listen(3000, () => {
  console.log('✅ Express server running on http://localhost:3000');
});