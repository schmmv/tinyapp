const express = require('express');
const methodOverride = require('method-override');
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const { generateRandomString, getUserByEmail, urlsForUser } = require('./functions/helpers');
const { urlDatabase, users } = require('./database/data');

const app = express();
const PORT = 8080;
app.set('view engine', 'ejs');

//==================
//SET UP MIDDLEWARE
//==================
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cookieSession({
  name: 'session',
  keys: ['kawefdaf', '345tqaggfd'],
  maxAge: 24 * 60 * 60 * 1000 // lasts 24 hours
}));

//==================
//ROUTES
//==================
/**
 * Get root page
 * If no user is logged in, redirect to login page
 */
app.get('/', (req, res) => {
  //get user id from cookie
  const userID = req.session.userID;
  if (!userID) {
    return res.redirect('/login');
  }
  res.redirect('/urls');
});

/**
 * Get Login page
 * If user is already logged in, redirect to /urls, otherwise render urls_login template
 */
app.get('/login', (req, res) => {
  const userID = req.session.userID;
  if (userID) {
    return res.redirect('/urls');
  }
  const templateVars = { user: users[userID] };
  res.render('urls_login', templateVars);
});

/**
 * Handle login form submission
 * Send error if user wasn't found in database, or if passwords don't match
 */
app.post('/login', (req, res) => {

  const { email, password } = req.body;
  const user = getUserByEmail(email, users);
  
  if (!user) {
    return res.status(403).send('This account does not exist');
  }
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(403).send('Failed authentication');
  }
  //Set cookie
  req.session.userID = user.id;
  res.redirect('/urls');
});

/**
 * Get urls page (index)
 * Return error message if user is not logged in, otherwise filter out user's URLs only and render urls_index template
 */
app.get('/urls', (req, res) => {
  const userID = req.session.userID;
  if (!userID) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to continue</body></html>');
  }
  const urls = urlsForUser(userID, urlDatabase);
  const templateVars = { user: users[userID], urls };
  res.render('urls_index', templateVars);
});

/**
 * Get JSON string of url database
 */
app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

/**
 * Get Register page
 * Redirect to /urls is user already logged in
 */
app.get('/register', (req, res) => {
  const userID = req.session.userID;
  if (userID) {
    return res.redirect('/urls');
  }
  const templateVars = { user: users[userID] };
  res.render('urls_register', templateVars);
});

/**
 * Handle registration form data
 * Display error if input is missing, or if user already exists
 */
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).send('<html><body>Please enter missing information<br /><a href="/register">Back</a></body></html>');
  }
  if (getUserByEmail(email, users)) {
    return res.status(400).send('<html><body>User with this email already exists<br /><a href="/register">Back</a></body></html>');
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const id = generateRandomString();
  users[id] = {
    id,
    email,
    password: hashedPassword,
  };
  req.session.userID = id;
  res.redirect('/urls');
});

/**
 * Handle logout request
 */
app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

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
 * Display error is no user is logged in
*/
app.post("/urls", (req, res) => {
  const userID = req.session.userID;
  if (!userID) {
    return res.status(401).send('Unauthorized. Please login to continue');
  }
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = { longURL: req.body.longURL, userID };
  res.redirect(`/urls/${shortURL}`);
});

/**
 * Get one URL details page
 * Send error if: URL doesn't exist, no user is signed in, or if user doesn't own the url
 */
app.get('/urls/:id', (req, res) => {
  const userID = req.session.userID;
  const shortURL = req.params.id;
  if (!urlDatabase[shortURL]) {
    return res.status(404).send(`The URL ${shortURL} does not exist`);
  }
  if (!userID) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to continue</body></html>');
  }
  if (urlDatabase[shortURL].userID !== userID) {
    return res.status(401).send('You are unauthorized to view this URL');
  }
  const templateVars = { user: users[userID], id: shortURL, longURL: urlDatabase[shortURL].longURL };
  res.render('urls_show', templateVars);
});

/**
 * Edit a URL - handle form submission
 * Send error if URL doesnt' exist, no user signed in, or if user doesn't own URL
 */
app.put('/urls/:id', (req, res) => {
  const shortURL = req.params.id;
  if (!urlDatabase[shortURL]) {
    return res.status(404).send(`The URL ${shortURL} does not exist`);
  }
  const userID = req.session.userID;
  if (!userID) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to continue</body></html>');
  }
  if (urlDatabase[shortURL].userID !== userID) {
    return res.status(401).send('You are unauthorized to view this URL');
  }
  const newURL = req.body.newURL;
  urlDatabase[shortURL] = { longURL: newURL, userID };
  res.redirect('/urls');
});

/**
 * Delete a URL
 * Send error is URL doesn't exist, user is not logged in, or user doesn't own URL
 */
app.delete('/urls/:id', (req, res) => {
  const shortURL = req.params.id;
  if (!urlDatabase[shortURL]) {
    return res.status(404).send('This URL does not exist');
  }
  const userID = req.session.userID;
  if (!userID) {
    return res.status(401).send('<html><body>Please <a href="/login">login</a> or <a href="/register">register</a> to continue</body></html>');
  }
  if (urlDatabase[shortURL].userID !== userID) {
    return res.status(401).send('You are unauthorized to view this URL');
  }
  delete urlDatabase[shortURL];
  res.redirect('/urls');
});

/**
 * Get actual web page (long URL) from shortURL link
 * Display error is URL doesn't exist
 */
app.get('/u/:id', (req, res) => {
  const shortURL = req.params.id;
  if (!urlDatabase[shortURL]) {
    return res.status(404).send(`${shortURL} not found`);
  }
  const longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
});

//Start up the server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});