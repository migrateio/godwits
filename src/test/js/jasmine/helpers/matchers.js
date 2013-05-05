beforeEach( function () {
    this.addMatchers( {

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
