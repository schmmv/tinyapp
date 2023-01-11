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
const foundUserByEmail = function(email) {
  for (const userId in users) {
    if (users[userId].email === email) {
      return users[userId];
    }
  }
  return null;
};

module.exports = { generateRandomString, foundUserByEmail };