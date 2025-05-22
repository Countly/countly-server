const MongoClient = require("mongodb").MongoClient;
const fs = require("fs");
const path = require("path");
const connectionString = process.env.MONGO_URI || 'mongodb://localhost:27017';
const client = new MongoClient(connectionString, { useUnifiedTopology: true });
let databases = []; // Leave empty to auto-fetch all databases
let shardNames = []; // Leave empty to fetch shard names dynamically
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-');
}
function csvEscape(value) {
    if (value === undefined || value === null) return '""';
    return `"${String(value).replace(/"/g, '""')}"`;
}
async function executeLogic() {
    let csvRows = [];
    let headers = [
        'DB',
        'Collection Name',
        'Sharded (y/n)',
        'Primary',
        'Data Size (GB)',
        'Document Count',
        'Storage Size (GB)',
        'Total Index Size (GB)',
        'Total Size (GB)'
    ];
    try {
        await client.connect();
        // Fetch shard names if not provided
        if (shardNames.length === 0) {
            const shardsList = await client.db('config').collection('shards').find({}).toArray();
            shardNames = shardsList.map(shard => shard._id);
        }
        // Add shard names to headers
        shardNames.forEach(shardName => {
            headers.push(`${shardName} Total Size (GB)`);
        });
        csvRows.push(headers.map(csvEscape).join(','));
        // Fetch databases if not provided
        if (databases.length === 0) {
            const adminDb = client.db('admin');
            const dbList = await adminDb.admin().listDatabases();
            databases = dbList.databases.map(db => db.name);
        }
        for (const dbName of databases) {
            const db = client.db(dbName);
            let collections;
            try {
                collections = await db.listCollections().toArray();
            } 
            catch {
                continue;
            }
            for (const collInfo of collections) {
                const collectionName = collInfo.name;
                console.log(`Processing collection: ${dbName}.${collectionName}`); // Progress log

                let stats;

                try {
                    stats = await db.collection(collectionName).stats();
                }
                catch {
                    continue;
                }
                const sharded = stats.sharded ? 'y' : 'n';
                const primary = stats.primary || '';
                const sizeGB = (stats.size / (1024 * 1024 * 1024)).toFixed(2);
                const documentCount = stats.count || 0;
                const storageSizeGB = (stats.storageSize / (1024 * 1024 * 1024)).toFixed(2);
                const totalIndexSizeGB = (stats.totalIndexSize / (1024 * 1024 * 1024)).toFixed(2);
                const totalSizeGB = ((stats.storageSize + stats.totalIndexSize) / (1024 * 1024 * 1024)).toFixed(2);
                let shardSizes = [];
                if (stats.sharded) {
                    shardSizes = shardNames.map(shardName => {
                        console.log(`    Processing shard: ${shardName}`); // Progress log for shards
                        const shardData = stats.shards?.[shardName];
                        return shardData ? ((shardData.storageSize + shardData.totalIndexSize) / (1024 * 1024 * 1024)).toFixed(2) : '0.00';
                    });
                }
                else {
                    shardSizes = shardNames.map(() => '0.00');
                }
                const row = [
                    dbName,
                    collectionName,
                    sharded,
                    primary,
                    sizeGB,
                    documentCount,
                    storageSizeGB,
                    totalIndexSizeGB,
                    totalSizeGB,
                    ...shardSizes
                ];
                csvRows.push(row.map(csvEscape).join(','));
            }
        }
        // Creates a unique file name with timestamp, in the script's directory
        const outputFileName = `sharding-info-${getTimestamp()}.csv`;
        const outputPath = path.join(__dirname, outputFileName);
        fs.writeFileSync(outputPath, csvRows.join('\n'));
    } 
    catch (err) {
        fs.writeFileSync(path.join(__dirname, 'sharding-report-error.log'), err.stack || err.message);
    }
    finally {
        await client.close();
    }
}
// Run the script
executeLogic();
