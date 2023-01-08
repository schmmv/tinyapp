/**
 * 
 * @returns a string of 6 random alphanumeric characters
 */
function generateRandomString() {
  for (var s=''; s.length < 6; s += 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(Math.random()*62|0));
  return s;
}

module.exports = { generateRandomString };