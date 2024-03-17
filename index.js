import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import { dirname } from "path";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { get } from "http";
import env from "dotenv"

const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));
env.config();

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let booksReviews = [];
let buttonPush = 0;


async function getBooks(){
  const books = await db.query("SELECT rb.id, title,author,date_read,review,rating,isbn FROM read_books rb JOIN reviews_books reb ON rb.id = reb.read_book_id");
    return  books.rows;
    
}
async function getBooksByRecency(){
  const books = await db.query("SELECT rb.id, title,author,date_read,review,rating,isbn FROM read_books rb JOIN reviews_books reb ON rb.id = reb.read_book_id ORDER BY date_read DESC");
    return books.rows;
}
async function getBooksByRating(){
  const books = await db.query("SELECT rb.id, title,author,date_read,review,rating,isbn FROM read_books rb JOIN reviews_books reb ON rb.id = reb.read_book_id ORDER BY rating DESC");
    return books.rows;

}
app.get("/",async (req,res)=>{
  switch(buttonPush){
    case 0: booksReviews = await  getBooks();
    break;
    case 1: booksReviews = await getBooksByRecency();
    break;
    case 2: booksReviews = await  getBooksByRating();
    break;
    default: booksReviews = await  getBooks();
    break;
  }
    res.render("index.ejs",{
      booksReviews: booksReviews,
    });
});

app.get("/add", (req,res)=>{
  res.render("new.ejs");
});
app.post("/new",async(req,res)=>{
  const bookName = req.body.bookName;
  const author = req.body.author;
  const rating = req.body.rating;
  const review = req.body.review;
  console.log(rating, review);
  const date = req.body.date;
  const isbn = req.body.isbn;
  try{
  const result = await db.query(`INSERT INTO read_books(title,author,date_read,isbn) VALUES($1,$2,$3,$4)`,[bookName,author,date,isbn]);
  const resultNewID = await db.query(`SELECT MAX(id) FROM read_books`);
  const newID = resultNewID.rows[0].max;
  console.log(newID);
  const addResult = await db.query(`INSERT INTO reviews_books(review,rating,read_book_id) VALUES($1,$2,$3)`,[review,rating,newID]);
  
  res.redirect("/");
  }
  catch(err){
    console.log(err);
  }
});

app.post("/delete",async(req,res)=>{
  const id = req.body.deleteID;
  try{
    const addResult = await db.query("DELETE FROM reviews_books WHERE read_book_id = $1",[id]);
    const result = await db.query("DELETE FROM read_books WHERE id = $1",[id]);
    res.redirect("/");
  }
  catch(err){
    console.log(err);
  }
});

app.get("/edit",async (req,res) =>{
  const editID = req.query.editID;
  console.log(editID);
  let editBook = [];
  const result = await db.query("SELECT rb.id, title,author,date_read,review,rating,isbn FROM read_books rb JOIN reviews_books reb ON rb.id = reb.read_book_id WHERE rb.id = $1",
  [editID]);
  editBook = result.rows;
  console.log(editBook);
  res.render("edit.ejs",{
    editBook: editBook

  });
});

app.post("/editItem",async(req,res)=>{
  const id = req.body.editID;
  const bookName = req.body.bookName;
  const author = req.body.author;
  const rating = req.body.rating;
  const review = req.body.review;
  const isbn = req.body.isbn;
  console.log(id,bookName,author,rating,review,isbn);
  try{
    const result = await db.query("UPDATE read_books SET title = $1, author = $2, isbn = $3 WHERE id = $4",
    [bookName,author,isbn,id]);
    const addResult = await db.query("UPDATE reviews_books SET review = $1, rating = $2 WHERE read_book_id = $3",
    [review,rating,id]);
    res.redirect("/");
  }
  catch(err){
    console.log(err);
  }
})

app.get("/recency",(req,res)=>{
  buttonPush = 1;
  res.redirect("/");
});
app.get("/rating",(req,res)=>{
  buttonPush = 2;
  res.redirect("/");
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });