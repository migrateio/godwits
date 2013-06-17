beforeEach( function () {
    this.addMatchers( {

        toBeArray : function () {
            var actual = this.actual;
            var notText = this.isNot ? ' not' : '';

            this.message = function () {
                return 'Expected ' + actual + notText + ' to be an Array';
            };

            return Array.isArray( actual );
        },

        toThrowMatch : function ( expected ) {
            var result = false;
            var exception;

            if ( typeof this.actual != 'function' ) {
                throw new Error( 'Actual is not a function' );
            }
            if ( typeof expected != 'string' ) {
                throw new Error( 'Expected is not a string' );
            }

            try {
                this.actual();
            } catch ( e ) {
                exception = e;
            }

            var expectedMessage = expected.message || expected.toString();
            if ( exception ) {
                var actualString = exception.message || exception.toString();
                result = new RegExp( expectedMessage ).test( actualString );
            }

            var not = this.isNot ? 'not ' : '';
            if ( this.isNot ) result = !result;

            this.message = function () {
                if (!exception && !not) 
                    return ['Expected function to throw ',
                    expectedMessage,
                    ', but it did not throw exception.'].join( ' ' );
                return ['Expected function ' + not + 'to throw ',
                    expectedMessage,
                    ', but it threw', exception.message || exception].join( ' ' );
            };

            return result;
        }
    } );
} );
