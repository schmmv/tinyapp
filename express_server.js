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
  //Get user data from cookie
  const userID = req.cookies.userID;

  //Set user object for rendering _header.ejs partial
  const templateVars = { user: users[userID] }; 

  //If user is already logged in, redirect to /urls
  if (userID) {
    return res.redirect('/urls');
  }

  res.render('urls_register', templateVars);
});

/**
 * Handle registration form data
 */
app.post('/register', (req, res) => {
  const id = generateRandomString();

  //Store user data from form input
  const { email, password } = req.body;

  //Check if email and/or password fields are missing
  if (!email || !password) {
    return res.status(400).send('Please enter missing information');
  }
  //Check if user already exists
  if (foundUserByEmail(email, users)) {
    return res.status(400).send('User with this email already exists');
  }
  //Add new user to database
  users[id] = {
    id,
    email,
    password
  };
  //Set cookie with userID value
  res.cookie('userID', id);
  //Redirect user to urls page
  res.redirect('/urls');
});

/**
 * Get Login page
 */
app.get('/login', (req, res) => {
  //Get user data from cookie
  const userID = req.cookies.userID;

  //Send user object for rendering _header.ejs partial
  const templateVars = { user: users[userID] };

  //If user is already logged in, redirect to /urls
  if (userID) {
    return res.redirect('/urls');
  }
  
  res.render('urls_login', templateVars);
});

/**
 * Handle login form submission
 */
app.post('/login', (req, res) => {

  const { email, password } = req.body;
  const user = foundUserByEmail(email, users);
  
  //check if user wasn't found
  if (!user) {
    return res.status(403).send('This account does not exist');
  }
  //check if passwords don't match
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
  //Delete cookie
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

  //Add user input longURL to urlDatabase
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);
});

/**
 * Get all urls page (index)
 */
app.get('/urls', (req, res) => {
  const templateVars = { user: users[req.cookies.userID], urls: urlDatabase };
  res.render('urls_index', templateVars); //Pass cookie information and database to render template
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
  //Store user input new URL
  const newURL = req.body.newURL;
  //Add it to the database
  urlDatabase[req.params.id] = newURL;
  res.redirect('/urls');
});

/**
 * Delete a URL
 */
app.post('/urls/:id/delete', (req, res) => {
  //Identify data related to delete button press
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

//Start up the server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});