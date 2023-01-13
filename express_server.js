const express = require('express');
const morgan = require('morgan');
// const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const { generateRandomString, getUserByEmail, urlsForUser } = require('./helpers');
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
  //Get user data from cookie
  const userID = req.session.userID;
  //If no user is logged in, redirect to login page
  if (!userID) {
    res.redirect('/login');
  }
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
  const user = getUserByEmail(email, users);
  
  //check if user wasn't found
  if (!user) {
    return res.status(403).send('This account does not exist');
  }
  //check if passwords don't match
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(403).send('Failed authentication')
  }
  //Happy path. set cookie
  req.session.userID = user.id;
  //Redirect to /urls
  res.redirect('/urls');
});

/**
 * Get all urls page (index)
 */
app.get('/urls', (req, res) => {
  const userID = req.session.userID;
  //If user is not logged in, return error message
  if (!userID) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href=\"/register\">register</a> to continue</body></html>');
  }
  //Filter out user's urls only
  const urls = urlsForUser(userID, urlDatabase);
  const templateVars = { user: users[userID], urls };
  //Pass cookie information and database to render template
  res.render('urls_index', templateVars); 
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
  //If user is already logged in, redirect to /urls
  const userID = req.session.userID;
  if (userID) {
    return res.redirect('/urls');
  }
  //Otherwise set user object for rendering _header.ejs partial and urls_register view
  const templateVars = { user: users[userID] }; 
  res.render('urls_register', templateVars);
});

/**
 * Handle registration form data
 */
app.post('/register', (req, res) => {
  //get user data from form input
  const { email, password } = req.body;
  
  //If email or password is missing, display error message
  if (!email || !password) {
    return res.status(400).send('<html><body>Please enter missing information<br /><a href="/register">Back</a></body></html>');
  }
  //If user already exists, display error message
  if (getUserByEmail(email, users)) {
    return res.status(400).send('<html><body>User with this email already exists<br /><a href="/register">Back</a></body></html>');
  }
  //Happy path. Hash password to store in user object
  const hashedPassword = bcrypt.hashSync(password, 10);
  //Get a random id to associate with user
  const id = generateRandomString();
  //Add new user to database
  users[id] = {
    id,
    email,
    password: hashedPassword,
  };
  //Set cookie with userID value
  req.session.userID = id;
  //Redirect user to urls page
  res.redirect('/urls');
});


/**
 * Handle logout request
 */
app.post('/logout', (req, res) => {
  //Delete cookie
  req.session = null;
  //Redirect to /login
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
  //happy path
  const templateVars = { user: users[userID] }; 
  res.render('urls_new', templateVars);
});

/**
 * Post new URL
*/
app.post("/urls", (req, res) => {
  const userID = req.session.userID;
  //If no user logged in, display error message
  if (!userID) {
    return res.status(401).send('Unauthorized. Please login to continue');
  }
  
  const shortURL = generateRandomString();
  //Associate shortURL with longURL input by user and save in database
  urlDatabase[shortURL] = { longURL: req.body.longURL, userID };
  //Redirect to new URL's info page
  res.redirect(`/urls/${shortURL}`);
});


/**
 * Get one URL details page
 */
app.get('/urls/:id', (req, res) => {
  const userID = req.session.userID;
  const shortURL = req.params.id;
  //if URL doesn't exist in database return html error message
  if (!urlDatabase[shortURL]) {
    return res.status(404).send(`The URL ${shortURL} does not exist`);
  }
  //If no user signed in, display html error message
  if (!userID) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to continue</body></html>');
  }
  //If user doesn't own the url, send error message 
  if (urlDatabase[shortURL].userID !== userID) {
    return res.status(401).send('You are unauthorized to view this URL');
  }
  //happy path
  const templateVars = { user: users[userID], id: shortURL, longURL: urlDatabase[shortURL].longURL };
  res.render('urls_show', templateVars);
});

/**
 * Edit a URL - handle form submission
 */
app.post('/urls/:id', (req, res) => {
  const shortURL = req.params.id;
  //if URL doesn't exist in database return html error message (accessed via cURL command)
  if (!urlDatabase[shortURL]) {
    return res.status(404).send(`The URL ${shortURL} does not exist`);
  }
  //Get user connected to URL edit
  const userID = req.session.userID;
  //If no user logged in, display error message
  if (!userID) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to continue</body></html>');
  }
  //If user does not own the URL, display error message
  if (urlDatabase[shortURL].userID !== userID) {
    return res.status(401).send('You are unauthorized to view this URL');
  }
  //Store updated longURL
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
  //Return to /urls
  res.redirect('/urls');
})

/**
 * Get actual web page (long URL) from shortURL link
 */
app.get('/u/:id', (req, res) => {
  const shortURL = req.params.id;
  //If shortURL doesn't exist, display error message
  if (!urlDatabase[shortURL]) {
    return res.status(404).send(`${shortURL} not found`);
  }
  //Get longURL for the given shortURL from database
  const longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
});

//Start up the server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});