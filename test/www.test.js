'use strict';

process.env.UNIT_TEST = true;

var assert = require('chai').assert;

describe('www', function () {
    it('shoule run app without exception', function () {
        require('../bin/www');
        assert.ok(true);
    });
});
