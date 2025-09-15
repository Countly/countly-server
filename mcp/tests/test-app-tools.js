#!/usr/bin/env node

// Set required environment variables
process.env.COUNTLY_API_KEY = 'test';
process.env.COUNTLY_SERVER_URL = 'http://localhost';

import('./build/index.js').then(async(module) => {
    console.log('Available exports:', Object.keys(module));

    try {
        const inst = new module.CountlyMCPServer();
        console.log('Available methods:', Object.getOwnPropertyNames(inst.__proto__).filter(name =>
            name !== 'constructor' && typeof inst[name] === 'function'
        ));

        // Try to access the server's tool handlers
        if (inst.server && inst.server.listToolsHandler) {
            const tools = await inst.server.listToolsHandler({});
            const appTools = tools.tools.filter(t =>
                t.name.includes('app') ||
        t.name.includes('App') ||
        t.name.includes('create') ||
        t.name.includes('update') ||
        t.name.includes('delete')
            );

            console.log('\nApp-related tools found:');
            appTools.forEach(tool => {
                console.log(`- ${tool.name}: ${tool.description}`);
            });
            console.log(`\nTotal app tools: ${appTools.length}`);

            // Check for our new tools specifically
            const newTools = ['create_app', 'update_app', 'delete_app', 'reset_app', 'update_app_plugins'];
            console.log('\nNew app management tools:');
            newTools.forEach(toolName => {
                const found = tools.tools.find(t => t.name === toolName);
                console.log(`- ${toolName}: ${found ? '✅ Found' : '❌ Missing'}`);
            });

        }
        else {
            console.log('Server or listToolsHandler not available');
        }
    }
    catch (error) {
        console.error('Error:', error.message);
    }

    process.exit(0);
}).catch(console.error);
