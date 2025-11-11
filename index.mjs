import express from 'express';
import mysql from 'mysql2/promise';

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
//for Express to get values using POST method
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
        SELECT author_id AS authorId, first_name AS firstName, last_name AS lastName
        FROM authors 
        ORDER BY last_name, first_name
    `);

    const [categories] = await pool.query(`
        SELECT category_id AS categoryId, category_name AS categoryName
        FROM categories 
        ORDER BY category_name
    `);
    return { authors, categories };
}
// ========================================================= Routes =========================================================

//Home route - Show search UI & dropdowns from database
app.get('/', async (req, res) => {
    try {
        const { authors, categories } = await getAuthorsAndCategories();
        res.render('home.ejs', { authors, categories, error: null });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error; Error loading home page.");
    }
});

// Search by keyword route (validated for >= 3 characters)
app.get('/searchByKeyWord', async (req, res) => {
   try {
    const keyword = (req.query.keyword || '').trim();
    const { authors, categories } = await getAuthorsAndCategories();
    
    if (keyword.length < 3) {
        return res.render('home.ejs', { 
            authors, categories,
            error: "Please enter at least 3 characters for the keyword search."
        });
    }

    const [rows] = await pool.query(`
        SELECT
            q.quote_id AS quoteId,
            q.quote AS quote,
            q.likes AS likes,
            a.author_id AS authorId,
            a.first_name AS firstName,
            a.last_name AS lastName,
        FROM quotes q
        JOIN authors a ON q.author_id = a.author_id
        WHERE q.quote LIKE ?
        ORDER BY q.likes DESC, q.quote ASC
        `, [`%${keyword}%`]);

    res.render('results.ejs', { rows, title: `Results for "${keyword}"` });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error; Error searching by keyword.");
    }
});

// Author search route
app.get('/searchByAuthor' , async (req, res) => {
    try {
        const id = req.query.authorId;
        if (!id) return res.redirect('/');

        const [rows] = await pool.query(`
            SELECT
                q.quote_id AS quoteId,
                q.quote AS quote,
                q.likes AS likes,
                a.author_id AS authorId,
                a.first_name AS firstName,
                a.last_name AS lastName
            FROM quotes q
            JOIN authors a ON q.author_id = a.author_id
            WHERE a.author_id = ?
            ORDER BY q.likes DESC, q.quote ASC
        `, [id]);

        res.render('results.ejs', { rows, title: 'Results by Author' });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error; Error searching by author.");
    }
});

// Search by category route
app.get("/searchByCategory", async (req, res) => {
    try {
        const categoryId = req.query.categoryId;
        if (!categoryId) return res.redirect("/");

        const [rows] = await pool.query(`
            SELECT
                q.quote_id AS quoteId,
                q.quote AS quote,
                q.likes AS likes,
                a.author_id AS authorId,
                a.first_name AS firstName,
                a.last_name AS lastName,
                c.name AS categoryName
            FROM quotes q
            JOIN authors a ON q.author_id = a.author_id
            JOIN categories c ON q.category_id = c.category_id
            WHERE c.category_id = ?
            ORDER BY q.likes DESC, q.quote ASC
        `, [categoryId]);

        res.render("results.ejs", { rows, title: "Results by Category" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error; Error searching by category.");
    }
});

// Likes search range route (min-max)
app.get('/searchByLikes', async (req, res) => {
    try {
        const min = Numnber.isFinite(+req.query.min) ? +req.query.min : 0;
        const max = Numnber.isFinite(+req.query.max) ? +req.query.max : Number.MAX_SAFE_INTEGER;

        const [rows] = await pool.query(`
            SELECT
                q.quote_id AS quoteId,
                q.quote AS quote,
                q.likes AS likes,
                a.author_id AS authorId,
                a.first_name AS firstName,
                a.last_name AS lastName
            FROM quotes q
            JOIN authors a ON q.author_id = a.author_id
            WHERE q.likes BETWEEN ? AND ?
            ORDER BY q.likes DESC, q.quote ASC
        `, [min, max]);

        res.render('results.ejs', { rows, title: `Results with Likes between ${min} - ${max}` });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error; Error searching by likes range.");
    }
});

// local API to get all info for a specific author
app.get('/api/authorInfo/:id', async (req, res) => {
    let authorId = req.params.id;
    let sql = `SELECT * FROM q_authors WHERE authorId = ?`;           
    let [rows] = await conn.query(sql, [authorId]);
    res.send(rows)
});

// Database connection test route
app.get("/dbTest", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT CURDATE()");
        res.send(rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});

app.listen(3000, () => {
    console.log("Express server running")
})