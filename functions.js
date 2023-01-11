/**
 * 
 * @returns a string of 6 random alphanumeric characters
 */
function generateRandomString() {
  return Math.random().toString(16).slice(2, 8);
}

module.exports = { generateRandomString };