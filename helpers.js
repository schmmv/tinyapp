/**
 * 
 * @returns a string of 6 random alphanumeric characters
 */
const generateRandomString = function() {
  return Math.random().toString(16).slice(2, 8);
};

/**
 * @returns user object if found, null if not found
 */
const getUserByEmail = function(email, database) {
  for (const id in database) {
    if (database[id].email === email) {
      return database[id];
    }
  }
  return null;
};

/**
 * @returns URLs associated with the id
 */
const urlsForUser = function(id, database) {
  const urls = {...database }; //avoid shallow copy of database
  for (const obj in urls) {
    if (urls[obj].userID !== id) {
      delete urls[obj];
    }
  }
  return urls;
};

module.exports = { generateRandomString, getUserByEmail, urlsForUser };