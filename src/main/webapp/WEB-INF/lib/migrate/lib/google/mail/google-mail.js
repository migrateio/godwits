var log = require( 'ringo/logging' ).getLogger( module.id );

var ImapService = require( '../../imap/mail/imap' ).ImapService;

var {refreshAccessToken} = require( '../../../../oauth/oauth_client' );

var oauthProvider = module.singleton( module.id, function () {
    var oauth = Packages.io.migrate.oauth.OauthAuthenticator;
    oauth.initialize();
} );

// since we extend **ImapService** we only need to extend connect with Gmail's hostname.
exports.Service = ImapService.subClass( {
    connect : function () {
        Object.extend( this.opts, {
            hostname : 'imap.gmail.com',
            port : 993
        } );

        // If they're connecting via oauth, we'll need to send protocol downstream manually.
        // The
        if ( this.opts.oauth ) {
            var data = refreshAccessToken( 'google', this.opts.oauth.refreshToken );
            log.info(data);

            var emptyPassword = "";
            this.store.connect( this.opts.hostname, this.opts.port, this.opts.email, emptyPassword );
        } else {
            // If they're not connecting via oauth we just call the super of this function.
            this._super( this.opts );
        }
    },

    setProps : function () {
        this._super();

        if(this.opts.oauth) {
            // Extra props for gmail oauth support.
            this.props.put( "mail.imaps.sasl.enable", "true" );
            this.props.put( "mail.imaps.sasl.mechanisms", "XOAUTH2" );
            this.props.put( 'mail.imaps.sasl.mechanisms.oauth2.oauthToken', this.opts.oauth.accessKey );
        }
    },

//    getFolders : function () {
//        return this.retry(function () {
//            return this._super();
//        });
//    },

    retry : function ( func, attempts ) {

        if ( typeof attempts === 'undefined' ) attempts = 3;

        function reconnect() {
            var data = refreshAccessToken( 'google', this.opts.oauth.refreshToken );

            this.opts.auth = data;

            this.connect();
        }

        if ( attempts < 0 ) throw {};

        try {
            return func();
        } catch ( e /*if e instanceof AFE*/ ) {
            log.info( e );
            var delay = (3 - attempts) * 10;
            java.lang.Thread.sleep( delay );

            reconnect();
            this.retry( func, attempts - 1 );
        }
    }



} );