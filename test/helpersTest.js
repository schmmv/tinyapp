const { assert } = require('chai');
const { getUserByEmail } = require('../helpers.js');

const testUsers = {
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "dishwasher-funk"
  }
};

describe('getUserByEmail', () => {
  it('should return a user with valid email', () => {
    const user = getUserByEmail('user@example.com', testUsers)
    const expectedUserID = 'userRandomID';
    assert.equal(user.id, expectedUserID);
  });
  it('should return undefined if email is not in the database', () => {
    const user = getUserByEmail('a@a.com', testUsers);
    assert.equal(user, undefined);
  });
});