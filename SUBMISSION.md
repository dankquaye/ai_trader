# Security Fix: Remove Sensitive Data Logging

## Vulnerability
The application was logging sensitive trade details (contract IDs, prices) and user email addresses to the console.

## Fix
Modified deriv-api.js to remove:
- console.log('Trade placed:', data.buy);
- console.log('Authorized:', data.authorize.email);

## Verification
Created a reproduction script which confirmed that the sensitive data is no longer logged.

## Status
Changes are committed locally.
