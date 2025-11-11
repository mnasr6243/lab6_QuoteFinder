import express from 'express';
import mysql from 'mysql2/promise';

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

//for Express to get values using POST method
app.use(express.urlencoded({ extended: true }));

//setting up database connection pool
const pool = mysql.createPool({
    host: "s0znzigqvfehvff5.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "gx1or1xzatdre76g",
    password: "f94rxr9crzfbel7u",
    database: "egvkfzji8asbucq9",
    connectionLimit: 10,
    waitForConnections: true
});

//Author route - displays all authors
app.get('/', async (req, res) => {
    let authorsSQL = `SELECT authorId , firstName , lastName FROM authors`;
    const [authorsRows] = await pool.query(authorsSQL);
    // console.log(authorsRows);

    res.render('home.ejs', { authorsRows });
});

// Displays form to add new author
app.get('/addAuthor', (req, res) => {
   res.render('addAuthor.ejs');
});

// Stores new author data into the database
app.post('/addAuthor', async (req, res) => {
    let firstName = req.body.fn;
    let lastName = req.body.ln;
    let dob = req.body.dob;
    let dod = req.body.dod;
    let sql = `INSERT INTO authors 
            (first_name, last_name, dob, dod) 
            VALUES (?, ?, ?, ?)`;
    let sqlParams = [firstName, lastName, dob, dod];
    const [rows] = await pool.query(sql, sqlParams);
    res.render('addAuthor.ejs');
});

// Displays form to add new book
app.get('/addBook', (req, res) => {
   res.render
});

// Search by keyword route
app.get('/searchByKeyWord', async (req, res) => {
    // console.log(req);
    let keyword = req.query.keyword;

    let sql = `SELECT authorId, firstName, lastName, quote FROM authors NATURAL JOIN quotes WHERE quote LIKE ?`;
    let sqlParams = [`%${keyword}%`];
    const [rows] = await pool.query(sql, sqlParams);
    // console.log(rows);

    res.render('results.ejs', { rows });
});

// Search by author route
app.get('/searchByAuthor' , async (req, res) => {
    let authorId = req.query.authorId;

    let sql = `SELECT authorId , firstName , lastName , quote FROM authors NATURAL JOIN quotes WHERE authorID = ?`;
    let sqlParams = [`${authorId}`];
    const [rows] = await pool.query(sql, sqlParams);
    console.log(rows);

    res.render('results.ejs' , { rows })
});

// Quotes between user input range route
app.get("/quotesRange.ejs", async(req, res) => {

    let sql = "SELECT quoteId, quote, likes FROM `quotes` WHERE likes BETWEEN ? AND ? ORDER BY likes ASC;";
    let sqlParams = [`${range1}`, `${range2}`];
    const [row] = await conn.query(sql);

    res.render("quotesRange.ejs", {result: row} );
});


// local API to get all info for a specific author
app.get('/api/authorInfo/:authorId', async (req, res) => {
    let authorId = req.params.authorId;

    let sql = `SELECT * FROM authors WHERE authorId = ?`;
    const [rows] = await pool.query(sql, [authorId]);

    res.send(rows);
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