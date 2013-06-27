# Migrate IO

A web-based application which provides its users with the ability to easily copy email,
contacts, documents and media files from one cloud provider to another.

# Roadmap

## albatross

The initial release of MIO is codenamed albatross, and represents our initial foray into
the market. It will include the ability to copy email, contacts, calendars and documents
to and from the following services:

* Email Providers (IMAP & POP3 support, with or without oauth)
* Microsoft Exchange 2007
* Yahoo Mail
* Google Drive (read/write support)

## bushtit

The next release of MIO will focus on backup/sync capabilities. For a monthly recurring
fee, we will maintain the customer's data in Amazon S3 and ensure that any new source
material is synced to the backup destination several times daily.

When the time comes, the user may choose to use the backup as the source account for a
migration job.

## chickadee

The third release will bring media migration to MIO. At this stage we may need to
investigate apricing model based on the size of the user's media library. Some ideas of
media migration accounts are Picasa, Twitpics, Imgur, Facebook, Instagram, and others. We
may run into problems with API access as some of these services do not expose APIs that
allow bulk downloading of images.

## dipper

The following release of MIO will focus on enterprise support by bringing the capability
to migrate entire Google Apps domains from one account to another. Also included will be
a new user interface catering to the needs of the bulk migrator who will need to manage
hundreds or thousands of user accounts. Additionally, we may add support for integration
with Microsoft Active Directory, LDAP directories, and Lotus Notes.

# Developer Docs

## Documentation

Documentation is generated using [Docker](http://jbt.github.io/docker/README.md.html).

From the command line

    docker -i src/main/webapp -o html -c manni -s yes -I -u -x node_modules --extras fileSearch

And if you want Docker to sit watching for newly saved files and generating new docs
use this command. Combining the generation of live docs with LiveReload which will
auto refresh the Chrome browser is pretty powerful, but I have noticed some issues with
Docker picking up changed files.

    docker -i src/main/webapp -o html -c manni -s yes -I -u -x node_modules -w --extras fileSearch

> todo: Add a Maven task to execute Docker during generate-docs phase.

## Testing

### Unit Tests

We are using Jasmine for server-side unit tests. The Jasmine tests are most easily
executed by using Maven to start the process.

    mvn clean test

This will execute all tests and report the results to the console, and to a JUnit-
compatible XML files in target/surefire-reports. Other Maven goals will use these XML
files for further generation of other reports.

For developers practicing TDD, the tests can be started and run continuously using a
variation. Anytime a test or source file is added or modified, the test runner will
execute and dump the results to the console (and the XML reports).

    mvn clean test -P watch

There may be times when the default verbosity level (4) is too wordy, or you want to
narrow in the test directory a bit. These properties can be overridden from the command
line like so:

    mvn test -Dtest.verbosity=3 -Dtest.testdir=./src/test/js/workflow

### Integration Tests

### Acceptance Tests

We are using Jasmine to execute the acceptance tests, and these tests are using the
AngularJS bridge to make UI testing quite a bit easier to manage.

A single run of acceptance testing can be executed using:

    karma start

If you wish to run the acceptance tests continuously in the background, you may use:

    karma start --singleRun=false

By default, the browser used is Google Chrome. If you wish to run tests for other
browsers, you may specify them on the command line:

    karma start --browsers="Firefox,Chrome"


# Domain Objects

##