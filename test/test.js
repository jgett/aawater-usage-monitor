const repo = require("../repo");
const email = require("../email");
const assert = require("assert");

describe('repo', function() {
  describe('#findMostRecent(3)', function() {
    it('should return 3 documents', function() {
        return repo.findRecent(3).then(docs => {
            assert.equal(docs.length, 3);      
        });
    });
  });
});