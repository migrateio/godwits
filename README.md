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

## Domain Objects


