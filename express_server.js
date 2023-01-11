const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { generateRandomString, foundUserByEmail } = require('./functions');
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
//DATABASES
//==================

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

//==================
//ROUTES 
//==================

/**
 * Get root page
 */
app.get('/', (req, res) => {
  res.send("Hello!");
});

/**
 * Get JSON string of url database
 */
app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

/**
 * Get /hello page
 */
app.get('/hello', (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

/**
 * Get Register page
 */
app.get('/register', (req, res) => {
  const templateVars = { user: users[req.cookies.userID] }; //required to render the header partial which is in urls_register
  res.render('urls_register', templateVars);
});

/**
 * Handle registration form data
 */
app.post('/register', (req, res) => {
  const id = generateRandomString();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Please enter missing information');
  }
  if (foundUserByEmail(email, users)) {
    return res.status(400).send('User with this email already exists');
  }

  users[id] = {
    id,
    email,
    password
  };

  res.cookie('userID', id);
  res.redirect('/urls');

});

/**
 * Get Login page
 */
app.get('/login', (req, res) => {
  const templateVars = { user: users[req.cookies.userID] };
  res.render('urls_login', templateVars);
});

/**
 * Handle login form submission
 */
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!foundUserByEmail(email, users)) {
    return res.status(403).send('This account does not exist');
  }
  const user = foundUserByEmail(email, users);

  if (user.password !== password) {
    return res.status(403).send('Failed authentication')
  }
  
  res.cookie('userID', user.id);
  res.redirect('/urls');
});

/**
 * Handle logout request
 */
app.post('/logout', (req, res) => {
  res.clearCookie('userID');
  res.redirect('/login');
})

/**
 * Get Add new URL page
*/
app.get('/urls/new', (req, res) => {
  const templateVars = { user: users[req.cookies.userID] }; 
  res.render('urls_new', templateVars);
});

/**
 * Post new URL
*/
app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);
});

/**
 * Get all urls page (index)
 */
app.get('/urls', (req, res) => {
  const templateVars = { user: users[req.cookies.userID], urls: urlDatabase };
  res.render('urls_index', templateVars);
});

/**
 * Get one url details page
 */
app.get('/urls/:id', (req, res) => {
  const templateVars = { user: users[req.cookies.userID], id: req.params.id, longURL: urlDatabase[req.params.id] };
  res.render('urls_show', templateVars);
});

/**
 * Update a URL - handle form submission
 */
app.post('/urls/:id', (req, res) => {
  const newURL = req.body.newURL;
  urlDatabase[req.params.id] = newURL;
  res.redirect('/urls');
});

/**
 * Delete a URL
 */
app.post('/urls/:id/delete', (req, res) => {
  const idToDelete = req.params.id;
  delete urlDatabase[idToDelete];
  res.redirect('/urls');
})

/**
 * Get actual web page (long URL) from shortURL link
 */
app.get('/u/:id', (req, res) => {
  const longURL = urlDatabase[req.params.id];
  res.redirect(longURL);
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});