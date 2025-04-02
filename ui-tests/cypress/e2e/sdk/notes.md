# SDK Plugin Test Notes

## Server Config Tooltip Tests

- Tests are not checking tooltip text. This should be added.
- No RN and Flutter tests yet. They should be added.
- There can be more tests with bad conditions (like weird sdk versions).
- For local tests you might want to change this command:

```javascript
Cypress.Commands.add('dropMongoDatabase', ({ local }) => {
     cy.exec(`mongosh ${local ? 'mongodb' : 'localhost'}/countly --eval 'db.dropDatabase()'`);
});
```
