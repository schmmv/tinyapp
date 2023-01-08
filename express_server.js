const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { generateRandomString } = require('./functions');
const app = express();
const PORT = 8080; //default port 8080
app.set('view engine', 'ejs'); //use EJS as templating engine



//==================
//MIDWARE
//==================
app.use(express.urlencoded({ extended: true })); //instead of receiving data as query form, receive data as an object -> req.body
app.use(morgan("dev"));
app.use(cookieParser());


//==================
//DATABASE 
//==================
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

//==================
//ROUTES 
//==================

app.get('/', (req, res) => {
  res.send("Hello!");
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/hello', (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

/**
 * ACCEPT SIGN-IN FORM SUBMISSION
 */
app.post('/login', (req, res) => {
  res.cookie('username', req.body.username);
  res.redirect('/urls');
})

/**
 * Handle sign-out request
 */
app.post('/logout', (req, res) => {
  res.clearCookie('username');
  res.redirect('/urls');
})
/**
 * CREATE (FORM)
*/
app.get('/urls/new', (req, res) => {
  const templateVars = { username: req.cookies["username"] };
  res.render('urls_new', templateVars);
});

/**
 * CREATE (POST)
*/
app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);
});

/**
 * READ (ALL)
 */
app.get('/urls', (req, res) => {
  const templateVars = { username: req.cookies["username"], urls: urlDatabase };
  res.render('urls_index', templateVars);
});

/**
 * READ (ONE)
 */
app.get('/urls/:id', (req, res) => {
  const templateVars = { username: req.cookies["username"], id: req.params.id, longURL: urlDatabase[req.params.id] };
  res.render('urls_show', templateVars);
});

/**
 * UPDATE (FORM)
 */
app.post('/urls/:id', (req, res) => {
  const newURL = req.body.newURL;
  urlDatabase[req.params.id] = newURL;
  res.redirect('/urls');
});

/**
 * DELETE
 */
app.post('/urls/:id/delete', (req, res) => {
  const idToDelete = req.params.id;
  delete urlDatabase[idToDelete];
  res.redirect('/urls');
})

/**
 * Re-route to long URL upon clicking on shortURL link
 */
app.get('/u/:id', (req, res) => {
  const longURL = urlDatabase[req.params.id];
  res.redirect(longURL);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});