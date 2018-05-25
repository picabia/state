import { State } from '../../src/classes/state';

import { expect } from 'chai';

describe('State', function () {
  describe('contructor()', function () {
    it('should be a function', function () {
      expect(State).to.be.a('function');
    });
  });
});
