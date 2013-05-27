/**
 * #A Simple Terminal Reporter for Jasmine.
 */

(function () {
    if ( !jasmine ) {
        throw new Exception( "jasmine library does not exist in global namespace!" );
    }

    /**
     *
     * @type {{off: number, bold: number, black: number, red: number, green: number, yellow: number, blue: number, magenta: number, cyan: number, white: number}}
     */
    var ANSI_CODES = {
        off : 0,
        bold : 1,
        black : 30,
        red : 31,
        green : 32,
        yellow : 33,
        blue : 34,
        magenta : 35,
        cyan : 36,
        white : 37
    };

    /**
     *
     * @type {{verbosity: number, colors: {error: number, trace: number, success: number, suite: number, spec: number}}}
     */
    var DEFAULT_PARAMS = {
        verbosity : 2,
        colors : {
            error : ANSI_CODES.red,
            trace : ANSI_CODES.yellow,
            success : ANSI_CODES.green,
            suite : ANSI_CODES.cyan,
            spec : ANSI_CODES.cyan
        }
    };

    /**
     * Basic reporter that outputs spec results to the terminal.
     * Use this reporter in your build pipeline.
     *
     * ##Usage:
     *
     * ```
     * jasmine.getEnv().addReporter(new jasmine.TerminalReporter({
     *    verbosity: 4,
     *    colors: {
     *        error: 31,
     *        trace: 34,
     *        success: 32,
     *        suite: 36,
     *        spec: 36
     *    }
     * }));
     * jasmine.getEnv().execute();```
     *
     * ### Verbosity Levels:
     *
     * - 0: Outputs nothing.
     * - 1: Outputs pass/failures at end of all suites.
     * - 2: Outputs failures as they happen, as well as all pass/failures at end.
     * - 3: Same as level 2, but outputs stack trace of failures as well as the spec message.
     * - 4: Outputs pass/failures as they happen.
     *
     * ### Colors object description:
     *
     * - error: used to color errors, defaults to red.
     * - trace: used to color stack traces, defaults to yellow.
     * - success: used to color successes, defaults to green.
     * - suite: used to color suite descriptions, defaults to cyan.
     * - spec: used to color spec descriptions, defaults to cyan.
     */

    var TermReporter = function ( params ) {

        // Loop over params object, if default params has an element not in the
        // passed in params, we write that value to the params object.
        for ( var name in DEFAULT_PARAMS ) {
            if ( !params.hasOwnProperty( name ) && DEFAULT_PARAMS.hasOwnProperty( name ) ) {
                this[name] = DEFAULT_PARAMS[name];
            } else {
                this[name] = params[name];
            }
        }

        this.started = false;
        this.finished = false;

        this.lastSuite = '';
    };

    /**
     *
     * @type {{reportRunnerStarting: Function, reportSpecStarting: Function, reportSpecResults: Function, reportRunnerResults: Function, reportSuiteResults: Function, log: Function, inColor: Function, indent: Function}}
     */
    TermReporter.prototype = {

        /**
         *
         * @param runner
         */
        reportRunnerStarting : function ( runner ) {
            this.started = true;
            this.start_time = (new Date()).getTime();

            this.executed_suites = 0;
            this.passed_suites = 0;

            this.executed_specs = 0;
            this.passed_specs = 0;

            this.skipped_specs = 0;

            this.executed_asserts = 0;
            this.passed_asserts = 0;

            this.level = 0;

            // should have at least 1 spec, otherwise it's considered a failure
            this.log( '1..' + Math.max( runner.specs().length, 1 ) );
        },

        /**
         *
         * @param spec
         */
        reportSpecStarting : function ( spec ) {
            this.executed_specs++;
            if ( this.lastSuite !== spec.suite.description ) {
                if ( this.verbosity > 3 ) {
                    this.log(
                        this.indent(
                            this.inColor( spec.suite.description, this.colors.suite ) ) );
                    this.level++;
                }
            }
            if ( this.verbosity > 3 ) {
                this.log(
                    this.indent(
                        this.inColor( spec.description, this.colors.spec ) ) );
            }
        },

        /**
         *
         * @param spec
         */
        reportSpecResults : function ( spec ) {
            this.lastSuite = spec.suite.description;

            var results = spec.results();
            var passed = results.passed();

            this.passed_asserts += results.passedCount;
            this.executed_asserts += results.totalCount;

            if ( passed ) {
                this.passed_specs++;

                if ( this.verbosity < 4 ) {
                    return;
                }
            }

            var logText = 'Failed\n';
            var trace = '';

            var items = results.getItems();
            var item;

            if ( this.verbosity > 1 ) {
                for ( var j in items ) {
                    item = items[j];
                    if ( !item.passed() ) {
                        logText += item.message + '\n';
                        if ( this.verbosity > 2 && item.trace.stack ) {
                            trace = item.trace.stack + '\n';
                        }
                    }
                }
            }

            if ( passed && this.verbosity > 3 ) {
                logText = 'Passed';
            }

            // Only log spec/suite descriptions at this verbosity level on failure
            if ( this.verbosity < 4 && this.verbosity > 1 && !passed ) {
                this.log(
                    this.indent(
                        this.inColor( spec.suite.description, this.colors.suite ) ) );
                this.level++;
                this.log(
                    this.indent(
                        this.inColor( spec.description, this.colors.spec ) ) );
                this.level++;
            }

            if ( logText ) {
                this.log(
                    this.indent(
                        this.inColor( logText, passed ? this.colors.success : this.colors.error ) ) );
            }

            if ( trace ) {
                this.log(
                    this.inColor( trace, this.colors.trace ) );
            }
        },

        /**
         *
         * @param runner
         */
        reportRunnerResults : function ( runner ) {

            // If our verbosity is set to the lowest setting, we don't bother doing any work.
            if ( this.verbosity === 0 ) {
                return;
            }

            var duration = (new Date().getTime()) - this.start_time;
            var failed = this.executed_specs - this.passed_specs;
            var spec_str = this.executed_specs + (this.executed_specs === 1 ? " spec, " : " specs, ");
            var fail_str = failed + (failed === 1 ? " failure " : " failures ");
            var assert_str = this.executed_asserts + (this.executed_asserts === 1 ? " assertion, " : " assertions, ");

            var passStr = failed ? this.inColor( 'Failed: ', this.colors.error ) : this.inColor( 'Passed: ', this.colors.success );
            if ( this.executed_asserts ) {
                this.log(
                    passStr +
                        this.inColor( spec_str, this.colors.suite ) +
                        this.inColor( assert_str, this.colors.trace ) +
                        this.inColor( fail_str, failed ? this.colors.error : this.colors.success ) +
                        "in " + (duration / 1000) + " seconds."
                );
            } else {
                this.log(
                    this.inColor( 'No assertions run', this.colors.error ) );
            }

            this.finished = true;
        },

        /**
         *
         * @param suite
         */
        reportSuiteResults : function ( suite ) {
            this.level = 0;

            if ( this.verbosity < 4 ) {
                return;
            }

            var results = suite.results();
            var failed = results.totalCount - results.passedCount;

            var logText = results.passedCount + ' of ' + results.totalCount + ' specs passed.';

            this.log(
                this.indent(
                    this.inColor( logText, failed ? this.colors.error : this.colors.success ) ) );

        },

        /**
         *
         * @param str
         */
        log : function ( str ) {
            if ( this.verbosity > 0 ) {
                print( str );
            }
        },

        /**
         *
         * @param string
         * @param color
         * @returns {string}
         */
        inColor : function ( string, color ) {

            var result = '';
            var embolden = '\u001B[' + ANSI_CODES.bold + 'm';

            result += '\u001B[' + color + 'm' + embolden + string;
            result += '\u001B[' + ANSI_CODES.off + 'm';

            return result;
        },

        /**
         *
         * @param string
         * @returns {string}
         */
        indent : function ( string ) {
            var res = '';

            // Indent to current level.
            for ( var i = 0; i < this.level; i++ ) {
                res += '    ';
            }

            res += string;

            return res;
        },

        hasErrors : function () {
            return this.executed_specs - this.passed_specs > 0;
        }
    };

    // export public
    jasmine.TermReporter = TermReporter;
})();