const express = require('express');
const morgan = require('morgan');
// const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const { generateRandomString, foundUserByEmail, urlsForUser } = require('./functions');
const app = express();
const PORT = 8080; //default port 8080
app.set('view engine', 'ejs'); //use EJS as templating engine

//==================
//MIDWARE
//==================
app.use(express.urlencoded({ extended: true })); //instead of receiving data as query form, receive data as an object -> req.body
app.use(morgan("dev"));
// app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ['kawefdaf', '345tqaggfd'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

//==================
//DATABASES
//==================

const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
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
  aJ48lW: {
    id: "aJ48lW",
    email: "a@a.com",
    password: "1234",
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
  res.send("<html><body>Hello <b>World</b></body></html>");
});

/**
 * Get Register page
 */
app.get('/register', (req, res) => {
  //Get user data from cookie
  const userID = req.session.userID;
  
  //If user is already logged in, redirect to /urls
  if (userID) {
    return res.redirect('/urls');
  }
  //Set user object for rendering _header.ejs partial
  const templateVars = { user: users[userID] }; 
  res.render('urls_register', templateVars);
});

/**
 * Handle registration form data
 */
app.post('/register', (req, res) => {
  const id = generateRandomString();

  //get user data from form input
  const { email, password } = req.body;

  //Check if email and/or password fields are missing
  if (!email || !password) {
    return res.status(400).send('Please enter missing information');
  }
  //Check if user already exists
  if (foundUserByEmail(email, users)) {
    return res.status(400).send('User with this email already exists');
  }
  //Hash password to store in user object
  const hashedPassword = bcrypt.hashSync(password, 10);

  //Add new user to database
  users[id] = {
    id,
    email,
    password: hashedPassword,
  };
  //Set cookie with userID value
  req.session.userID = id;
  // res.cookie('userID', id);
  //Redirect user to urls page
  res.redirect('/urls');
});

/**
 * Get Login page
 */
app.get('/login', (req, res) => {
  //Get user data from cookie
  const userID = req.session.userID;

  //If user is already logged in, redirect to /urls
  if (userID) {
    return res.redirect('/urls');
  }
  //Send user object for rendering _header.ejs partial
  const templateVars = { user: users[userID] };
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
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(403).send('Failed authentication')
  }

  // res.cookie('userID', user.id);
  req.session.userID = user.id;
  res.redirect('/urls');
});

/**
 * Handle logout request
 */
app.post('/logout', (req, res) => {
  //Delete cookie
  // res.clearCookie('userID');
  req.session = null;
  res.redirect('/login');
})

/**
 * Get Add new URL page
*/
app.get('/urls/new', (req, res) => {
  const userID = req.session.userID;

  //If user is not logged in, redirect to login
  if (!userID) {
    return res.redirect('/login');
  }

  const templateVars = { user: users[userID] }; 
  res.render('urls_new', templateVars);
});

/**
 * Post new URL
*/
app.post("/urls", (req, res) => {
  const userID = req.session.userID;

  //Check if user is not logged in
  if (!userID) {
    return res.status(401).send('Unauthorized. Please login to continue');
  }

  const shortURL = generateRandomString();

  //Add user input longURL to urlDatabase
  urlDatabase[shortURL] = { longURL: req.body.longURL, userID };
  // console.log('Updated database: ', urlDatabase);
  res.redirect(`/urls/${shortURL}`);
});

/**
 * Get all urls page (index)
 */
app.get('/urls', (req, res) => {
  const userID = req.session.userID;
  //Check if user is not logged in
  if (!userID) {
    return res.status(401).send('<html><body>Please <a href=\"/login\">login</a> or <a href=\"/register\">register</a> to continue</body></html>');
  }
  //Filter out user's urls only
  const urls = urlsForUser(userID, urlDatabase);
  const templateVars = { user: users[userID], urls };
  res.render('urls_index', templateVars); //Pass cookie information and database to render template
});

/**
 * Get one URL details page
 */
app.get('/urls/:id', (req, res) => {
  const userID = req.session.userID;
  
  //Check if user is not logged in
  if (!userID) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to continue</body></html>');
  }
  const shortURL = req.params.id;

  //Check if url doesn't belong to the user logged in 
  if (urlDatabase[shortURL].userID !== userID) {
    return res.status(401).send('You are unauthorized to view this URL');
  }
  const templateVars = { user: users[userID], id: shortURL, longURL: urlDatabase[shortURL].longURL };
  res.render('urls_show', templateVars);
});

/**
 * Edit a URL - handle form submission
 */
app.post('/urls/:id', (req, res) => {
  const shortURL = req.params.id;
  //Check if shortURL doesn't exist before updating
  if (!urlDatabase[shortURL]) {
    return res.status(404).send('This URL does not exist');
  }
  //Get user connected to URL edit
  const userID = req.session.userID;
  //Check if user is not logged in
  if (!userID) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to continue</body></html>');
  }
  //Check if user does not own the URL
  if (urlDatabase[shortURL].userID !== userID) {
    return res.status(401).send('You are unauthorized to view this URL');
  }

  //Store new URL
  const newURL = req.body.newURL;
  //Add it to database
  urlDatabase[shortURL] = { longURL: newURL, userID };
  res.redirect('/urls');
});

/**
 * Delete a URL
 */
app.post('/urls/:id/delete', (req, res) => {
  const shortURL = req.params.id;
  //Check if shortURL doesn't exist before updating
  if (!urlDatabase[shortURL]) {
    return res.status(404).send('This URL does not exist');
  }
  //Get user connected to URL edit
  const userID = req.session.userID;
  //Check if user is not logged in
  if (!userID) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to continue</body></html>');
  }
  //Check if user does not own the URL
  if (urlDatabase[shortURL].userID !== userID) {
    return res.status(401).send('You are unauthorized to view this URL');
  }
  //Identify data related to delete button press
  delete urlDatabase[shortURL];
  res.redirect('/urls');
})

/**
 * Get actual web page (long URL) from shortURL link
 */
app.get('/u/:id', (req, res) => {
  const shortURL = req.params.id;

  //Get longURL of shortURL from database
  const longURL = urlDatabase[shortURL].longURL;
  
  //Check if shortURL doesnt' exist
  if (!longURL) {
    return res.status(404).send(`${shortURL} does not exist`);
  }

  res.redirect(longURL);
});

//Start up the server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});