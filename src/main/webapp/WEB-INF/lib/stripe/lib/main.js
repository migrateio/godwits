/* Copyright 2011 Ask Bjørn Hansen, see LICENSE */
"use strict";
var log = require( 'ringo/logging' ).getLogger( module.id );

var {Deferred} = require( 'ringo/promise' );
var {encode} = require( 'ringo/base64' );
var {request} = require( 'ringo/httpclient' );


/*
 var r20 = /%20/g;
 var rbracket = /\[\]$/;

 var querystring = {
 stringify : function ( json ) {
 var prefix,
 s = [],
 add = function ( key, value ) {
 // If value is a function, invoke it and return its value
 value = typeof value === 'function' ? value() : ( value == null ? "" : value );
 s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
 };
 // If an array was passed in, assume that it is an array of form elements.
 if ( Array.isArray( json ) ) {
 // Serialize the form elements
 json.forEach( function ( prop ) {
 add( prop.name, prop.value );
 } );

 } else {
 for ( prefix in json ) {
 buildParams( prefix, json[ prefix ], add );
 }
 }
 // Return the resulting serialization
 return s.join( "&" ).replace( r20, "+" );
 }
 };

 function buildParams( prefix, obj, add ) {
 var name;
 if ( Array.isArray( obj ) ) {
 obj.forEach( function ( i, v ) {
 if ( rbracket.test( prefix ) ) {
 // Treat each array item as a scalar.
 add( prefix, v );
 } else {
 // Item is non-scalar (array or object), encode its numeric index.
 buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, add );
 }
 } );
 } else if ( typeof  obj === "object" ) {
 // Serialize object item.
 for ( name in obj ) {
 buildParams( prefix + "[" + name + "]", obj[ name ], add );
 }
 } else {
 // Serialize scalar item.
 add( prefix, obj );
 }
 }
 */

function error( message ) {
    var deferred = new Deferred();
    deferred.resolve( '', true );
    return deferred.promise;
}

module.exports = function ( api_key, options ) {
    var defaults = options || {};

    var auth = 'Basic ' + encode( api_key + ':' );

    function _request( method, path, data ) {

        // convert first level of deep data structures to foo[bar]=baz syntax
        if ( data ) {
            Object.keys( data ).forEach( function ( key ) {
                if ( typeof data[key] === 'object' && data[key] !== null ) {
                    var o = data[key];
                    delete data[key];
                    Object.keys( o ).forEach( function ( k ) {
                        var new_key = key + "[" + k + "]";
                        data[new_key] = o[k];
                    } );
                }
            } );
//            if ( Object.keys( data ).length === 0 ) data = undefined;
        }

        var deferred = new Deferred();

        var request_options = {
            url : 'https://api.stripe.com:443' + path,
            method : method,
            data : data,
            headers : {
                'Authorization' : auth,
                'Accept' : 'application/json',
                'Content-Type' : 'application/x-www-form-urlencoded'
//                'Content-Length' : request_data.length
            },
            success : function ( data, status, contentType, exchange ) {
                deferred.resolve( JSON.parse( data ) );
//                log.info( 'SUCCESS: data: {}, status: {}, contentType: {}',
//                    data, status, contentType );
            },
            error : function ( message, status, exchange ) {
                log.warn( 'Stripe request error, status: {}, message: {}',
                    status, message + '\n' + exchange.content );
                deferred.resolve( message, true );
            }
        };

//        log.info( 'REQUEST: {}', JSON.stringify( request_options ) );
        var req = request( request_options );

        return deferred.promise;
    }

    function post( path, data ) {
        return _request( 'POST', path, data );
    }

    function get( path, data ) {
        return _request( 'GET', path, data );
    }

    function del( path, data ) {
        return _request( 'DELETE', path, data );
    }

    return {
        charges : {
            capture : function ( charge_id, data ) {
                return post( "/v1/charges/" + charge_id + "/capture", data );
            },
            create : function ( data ) {
                return post( "/v1/charges", data );
            },
            retrieve : function ( charge_id ) {
                if ( typeof charge_id !== 'string' ) {
                    return error( 'stripe.charges.retrieve requires a charge id as string' );
                }
                return get( "/v1/charges/" + charge_id, {} );
            },
            refund : function ( charge_id, amount ) {
                if ( typeof charge_id !== 'string' ) {
                    return error( 'stripe.charges.retrieve requires a charge id as string' );
                }
                var data = isNaN( amount ) ? undefined : { amount : amount };
                return post( "/v1/charges/" + charge_id + "/refund", data );
            },
            list : function ( data ) {
                return get( "/v1/charges", data );
            }
        },
        customers : {
            create : function ( data ) {
                return post( "/v1/customers", data );
            },
            retrieve : function ( customer_id ) {
                if ( typeof customer_id !== 'string' ) {
                    return error( 'stripe.customers.retrieve requires a customer id as string' );
                }
                return get( "/v1/customers/" + customer_id, {} );
            },
            update : function ( customer_id, data ) {
                return post( "/v1/customers/" + customer_id, data );
            },
            del : function ( customer_id ) {
                return del( "/v1/customers/" + customer_id, {} );
            },
            list : function ( count, offset ) {
                return get( "/v1/customers", { count : count, offset : offset } );
            },
            update_subscription : function ( customer_id, data ) {
                return post( "/v1/customers/" + customer_id + '/subscription', data );
            },
            cancel_subscription : function ( customer_id, at_period_end ) {
                return del( "/v1/customers/" + customer_id + '/subscription', { at_period_end : at_period_end } );
            }
        },
        plans : {
            create : function ( data ) {
                return post( "/v1/plans", data );
            },
            retrieve : function ( plan_id ) {
                if ( typeof plan_id !== 'string' ) {
                    return error( 'stripe.plans.retrieve requires a plan id as string' );
                }
                return get( "/v1/plans/" + plan_id, {} );
            },
            del : function ( plan_id ) {
                return del( "/v1/plans/" + plan_id, {} );
            },
            list : function ( count, offset ) {
                return get( "/v1/plans", { count : count, offset : offset } );
            },
            update : function ( plan_id, data ) {
                return post( "/v1/plans/" + plan_id, data );
            }
        },
        invoices : {
            retrieve : function ( invoice_id ) {
                return get( "/v1/invoices/" + invoice_id, {} );
            },
            list : function ( data ) {
                return get( "/v1/invoices", data );
            },
            upcoming : function ( customer_id ) {
                return get( "/v1/invoices/upcoming", { customer : customer_id } );
            }
        },
        invoice_items : {
            create : function ( data ) {
                return post( "/v1/invoiceitems", data );
            },
            retrieve : function ( invoice_item_id ) {
                if ( typeof invoice_item_id !== 'string' ) {
                    return error( "invoice_item_id required" );
                }
                return get( "/v1/invoiceitems/" + invoice_item_id, {} );
            },
            update : function ( invoice_item_id, data ) {
                return post( "/v1/invoiceitems/" + invoice_item_id, data );
            },
            del : function ( invoice_item_id ) {
                return del( "/v1/invoiceitems/" + invoice_item_id, {} );
            },
            list : function ( customer_id, count, offset ) {
                return get( "/v1/invoiceitems", { customer : customer_id, count : count, offset : offset} );
            }
        },
        coupons : {
            create : function ( data ) {
                return post( "/v1/coupons", data );
            },
            retrieve : function ( coupon_id ) {
                if ( typeof coupon_id !== 'string' ) {
                    return error( "coupon_id required" );
                }
                return get( "/v1/coupons/" + coupon_id, {} );
            },
            del : function ( coupon_id ) {
                return del( "/v1/coupons/" + coupon_id, {} );
            },
            list : function ( count, offset ) {
                return get( "/v1/coupons", { count : count, offset : offset} );
            }
        },
        token : {
            create : function ( data ) {
                return post( "/v1/tokens", data )
            },
            retrieve : function ( token_id ) {
                return get( "/v1/tokens/" + token_id, {} )
            }
        },
        account : {
            retrieve : function () {
                get( "/v1/account", {} )
            }
        },
        events : {
            retrieve : function ( token_id ) {
                get( "/v1/events/" + token_id, {} )
            },
            list : function () {
                get( "/v1/events/", {} )
            }
        }
    };
};