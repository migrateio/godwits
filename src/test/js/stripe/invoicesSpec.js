var log = require( 'ringo/logging' ).getLogger( module.id );
var {uuid} = require( 'utility' );
var {PromiseList} = require( 'ringo/promise' );

var api_key = 'sk_test_EeLn3Yz6vjKeDIyio6oHw6NS';

var stripe = require( 'stripe' )( api_key );

describe( "Charges API w/ captured payment", function () {

    var planId, customerId;

    beforeEach( function () {
        var plan = stripe.plans.create({
            id: 'plan-' + uuid(),
            amount: 2000,
            currency: 'usd',
            interval: 'month',
            name: 'The super duper FooBarBaz subscription!'
        } ).wait(5000);
        expect(plan.id ).toBeDefined();
        planId = plan.id;

        var d = new Date();
        var customer = stripe.customers.create({
            email: "foo@example.com",
            plan: planId,
            card: { number: "4242424242424242",
                exp_month: d.getMonth() + 1,
                exp_year:  d.getFullYear() + 1,
                name: "T. Ester"
            }
        } ).wait(5000);
        expect(customer.id ).toBeDefined();
        customerId = customer.id;
    });

    it('should create an invoice with the first charge', function() {
        // Create invoice
        var invoice = stripe.charges.create( {
            amount : 500,
            currency : 'usd',
            customer : customerId
        } ).wait( 5000 );
        expect(invoice.object ).toEqual('charge');
        expect(invoice.paid ).toEqual(true);

        // List the invoice
        var list = stripe.invoices.list({ customer: customerId } ).wait(5000);
        expect(list ).toBeDefined();
        expect(list.data ).toBeArray();
        expect( list.data.length ).toEqual( 1 );
        expect( list.data[0].object ).toEqual( 'invoice' );

        // Retrieve the invoice
        var newInvoice = stripe.invoices.upcoming(customerId ).wait(5000);
        expect( newInvoice ).toBeDefined();
    });

    afterEach( function() {
        var result;
        if (customerId) {
            result = stripe.customers.del( customerId ).wait(5000);
            expect( result.deleted ).toBe( true );
        }
        if (planId) {
            result = stripe.plans.del( planId ).wait(5000);
            expect( result.deleted ).toBe( true );
        }
    });
});

