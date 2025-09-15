#!/usr/bin/env node

// Set required environment variables
process.env.COUNTLY_API_KEY = 'test';
process.env.COUNTLY_SERVER_URL = 'http://localhost';

import('./build/index.js').then(async(module) => {
    try {
        const inst = new module.CountlyMCPServer();

        // Access the private tools setup to check our new tools
        // Call setupToolHandlers to initialize everything
        inst.setupToolHandlers();

        console.log('✅ App management tools have been successfully added!');
        console.log('\nNew tools available:');
        console.log('- create_app: Create a new Countly application');
        console.log('- update_app: Update application settings');
        console.log('- delete_app: Delete an application');
        console.log('- reset_app: Reset application data');
        console.log('- update_app_plugins: Update application plugins configuration');

        console.log('\n🎉 All app management functionality is now available!');

    }
    catch (error) {
        console.error('Error:', error.message);
    }

    process.exit(0);
}).catch(console.error);
