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

// Quotes between user input range route
app.get("/quotesRange.ejs", async(req, res) => {

    let sql = "SELECT quoteId, quote, likes FROM `quotes` WHERE likes BETWEEN ? AND ? ORDER BY likes ASC;";
    let sqlParams = [`${range1}`, `${range2}`];
    const [row] = await pool.query(sql);
    res.render("quotesRange.ejs", {result: row} );
});


// local API to get all info for a specific author
app.get('/api/authorInfo/:id', async (req, res) => {
    let authorId = req.params.id;
    let sql = `SELECT * FROM q_authors WHERE authorId = ?`;           
    let [rows] = await conn.query(sql, [authorId]);
    res.send(rows)
});


// Author Portraits route
app.get('/authorPics', async (req, res) => {
    let sql = "SELECT portrait FROM `authors`;";
    const [row] = await pool.query(sql);
    res.render("authorPics.ejs", {result: row} );
});
 
// All quotes alphabetical route
app.get("/allQuotesAlphabetical", async(req, res) => {
    let sql = "SELECT quoteId, quote, likes FROM `quotes` ORDER BY quote;";
    const [row] = await pool.query(sql);
    res.render("quotes.ejs", {result: row} );
});

// Quotes about life route
app.get("/quotesAboutLife", async(req, res) => {
    let sql = "SELECT quoteId, quote, likes FROM `quotes` WHERE quote LIKE '%life%';";
    const [row] = await pool.query(sql);
    res.render("quotes.ejs", {result: row} );
});

// Quotes between 50-100 route
app.get("/quotes50_100", async(req, res) => {
    let sql = "SELECT quoteId, quote, likes FROM `quotes` WHERE likes BETWEEN 50 AND 100 ORDER BY likes DESC;";
    const [row] = await pool.query(sql);
    res.render("quotes.ejs", {result: row} );
});

// Top 3 quotes route
app.get("/top3Quotes", async(req, res) => {
    let sql = "SELECT quoteId, quote, likes FROM `quotes` ORDER BY likes DESC LIMIT 3;";
    const [row] = await pool.query(sql);
    res.render("quotes.ejs", {result: row} );
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