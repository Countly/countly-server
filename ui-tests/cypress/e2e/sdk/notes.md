# SDK Plugin Test Notes

## Server Config Tooltip Tests

- Structure of tests:
- 1. Neutral tooltip (default in app creation)
- 2. Warning tooltip (old Web SDK version)
- 3. Success tooltip (latest Web SDK version)
- 4. Mixed tooltip (old Android SDK version)
- 5. Mixed tooltip (old iOS SDK version)
- 6. Danger tooltip (unsupported SDK)
- 7. Success tooltip (latest Android SDK version)
- 8. Success tooltip (latest iOS SDK version)
- 9. Mixed tooltip (multiple SDK versions)

- Tests are not checking tooltip text. This should be added.
- No RN and Flutter tests yet. They should be added.
- There can be more tests with bad conditions (like weird sdk versions).
- For local tests you might want to change this command:

```javascript
Cypress.Commands.add('dropMongoDatabase', ({ local }) => {
     cy.exec(`mongosh ${local ? 'mongodb' : 'localhost'}/countly --eval 'db.dropDatabase()'`);
});
```
