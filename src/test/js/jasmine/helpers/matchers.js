beforeEach( function () {
    this.addMatchers( {

        toBeTypeOf : function ( expected ) {
            var actual = this.actual;
            var notText = this.isNot ? ' not' : '';

            this.message = function () {
                return 'Expected ' + actual + notText + ' to be type of ' + expected;
            };

            return typeof actual === expected;
        },

        toBeFunction : function () {
            var actual = this.actual;
            var notText = this.isNot ? ' not' : '';

            this.message = function () {
                return 'Expected ' + actual + notText + ' to be a function';
            };

            return typeof actual === 'function';
        },

        toBeArray : function () {
            var actual = this.actual;
            var notText = this.isNot ? ' not' : '';

            this.message = function () {
                return 'Expected ' + actual + notText + ' to be an Array';
            };

            return Array.isArray( actual );
        }

    } );
} );
