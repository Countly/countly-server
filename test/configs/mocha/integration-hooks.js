/**
 * Mocha root hooks for integration tests
 * Handles Docker backend services AND Countly services lifecycle
 *
 * Uses isolated test ports (+10000 offset):
 * - MongoDB: 37017
 * - ClickHouse: 18123
 * - Kafka: 19092
 * - Kafka Connect: 18083
 * - Nginx (test entry): 10080
 * - API: 13001
 * - Frontend: 16001
 * - Ingestor: 13010
 *
 * Usage: npm run test:api-core
 * Everything starts automatically and cleans up on completion or Ctrl+C
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

// Test suite configuration - determines which ports/containers to use
const TEST_SUITE = process.env.TEST_SUITE || 'core';

// Configuration mapping for each test suite (enables parallel test execution)
// Uses unified docker-compose.test.yml with environment variables for port isolation
const SUITE_CONFIG = {
    core: {
        containerPrefix: 'test-core',
        portOffset: 0,
        kafkaClusterId: 'MkU3OEVBNTcwNTJENDM2Qk',
        wiredTigerCache: '0.5'
    },
    lite: {
        containerPrefix: 'test-lite',
        portOffset: 100,
        kafkaClusterId: 'TGl0ZUthZmthQ2x1c3RlcjE',
        wiredTigerCache: '0.5'
    },
    enterprise: {
        containerPrefix: 'test-ee',
        portOffset: 200,
        kafkaClusterId: 'RW50ZXJwcmlzZUthZmthMQ',
        wiredTigerCache: '0.5'
    },
    plugin: {
        containerPrefix: 'test-plugin',
        portOffset: 300,
        kafkaClusterId: 'UGx1Z2luS2Fma2FDbHVzdGVy',
        wiredTigerCache: '0.5'
    }
};

const suiteConfig = SUITE_CONFIG[TEST_SUITE] || SUITE_CONFIG.core;
// Use unified compose file - ports set via environment variables
const COMPOSE_FILE = path.resolve(__dirname, '..', 'docker-compose.test.yml');
const CORE_DIR = path.resolve(__dirname, '../../..');
// Use rc file for env-cmd with multiple environments (base + suite-specific)
const ENV_RC_FILE = path.resolve(__dirname, '..', 'conf', '.env-cmdrc.json');
const CONTAINER_PREFIX = suiteConfig.containerPrefix;
const PORT_OFFSET = suiteConfig.portOffset;

// Log configuration - set COUNTLY_TEST_SAVE_LOGS=1 to save service logs to files
const SAVE_LOGS = process.env.COUNTLY_TEST_SAVE_LOGS === '1' || process.env.COUNTLY_TEST_SAVE_LOGS === 'true';
const LOG_DIR = path.join(CORE_DIR, 'log');
// Use suite-specific log file names to allow parallel test execution
const LOG_FILES = {
    api: path.join(LOG_DIR, `cly-${CONTAINER_PREFIX}-api.log`),
    frontend: path.join(LOG_DIR, `cly-${CONTAINER_PREFIX}-frontend.log`),
    ingestor: path.join(LOG_DIR, `cly-${CONTAINER_PREFIX}-ingestor.log`),
    aggregator: path.join(LOG_DIR, `cly-${CONTAINER_PREFIX}-aggregator.log`),
    jobserver: path.join(LOG_DIR, `cly-${CONTAINER_PREFIX}-jobserver.log`)
};

// Test ports (base +10000 from dev ports, plus suite-specific offset)
const TEST_PORTS = {
    MONGODB: 37017 + PORT_OFFSET,
    CLICKHOUSE: 18123 + PORT_OFFSET,
    KAFKA_CONNECT: 18083 + PORT_OFFSET,
    NGINX: 10080 + PORT_OFFSET,
    API: 13001 + PORT_OFFSET,
    FRONTEND: 16001 + PORT_OFFSET,
    INGESTOR: 13010 + PORT_OFFSET,
    JOBSERVER: 13020 + PORT_OFFSET
};

// Countly services to start
const COUNTLY_SERVICES = [
    { name: 'api', script: 'api/api.js' },
    { name: 'frontend', script: 'frontend/express/app.js' },
    { name: 'ingestor', script: 'api/ingestor.js' },
    { name: 'aggregator', script: 'api/aggregator.js' },
    { name: 'jobserver', script: 'jobServer/index.js' }
];

// Set common environment variables for tests
process.env.COUNTLY_CONFIG_HOSTNAME = `localhost:${TEST_PORTS.NGINX}`;

console.log(`[test-setup-hooks] Using test suite: ${TEST_SUITE} (port offset: +${PORT_OFFSET})`);

// Track state
let servicesStarted = false;
let shuttingDown = false; // Flag to distinguish graceful shutdown from unexpected exit
let countlyProcesses = [];

/**
 * Wait for a port to be available
 *
 * Fixed exponential check duplication bug:
 * - Original bug: Both error and timeout handlers scheduled retries when request timed out
 *   (because req.destroy() triggers an error event, causing 2^n parallel checks)
 * - Fix: Use timedOut flag to let timeout handler "claim" the retry, preventing error handler
 *   from also scheduling one. Error handler still handles genuine connection errors (ECONNREFUSED).
 */
function waitForPort(port, serviceName, maxSeconds = 60) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        let resolved = false;

        const check = () => {
            if (resolved) {
                return;
            }
            attempts++;
            let timedOut = false;

            const req = http.get(`http://localhost:${port}`, (res) => {
                if (!resolved) {
                    resolved = true;
                    console.log(`\n[test-setup-hooks] ${serviceName} ready on port ${port}`);
                    resolve();
                }
            });

            req.on('error', () => {
                if (resolved || timedOut) {
                    return;
                }
                if (attempts >= maxSeconds) {
                    resolved = true;
                    reject(new Error(`Timeout waiting for ${serviceName} on port ${port}`));
                }
                else {
                    process.stdout.write('.');
                    setTimeout(check, 1000);
                }
            });

            req.setTimeout(1000, () => {
                if (resolved) {
                    return;
                }
                timedOut = true; // Mark that timeout handler will schedule the retry
                req.destroy();
                if (attempts >= maxSeconds) {
                    resolved = true;
                    reject(new Error(`Timeout waiting for ${serviceName} on port ${port}`));
                }
                else {
                    process.stdout.write('.');
                    setTimeout(check, 1000);
                }
            });
        };

        check();
    });
}

/**
 * Wait for a ClickHouse table to exist
 * Polls ClickHouse via HTTP to check table existence
 * @param {string} tableName - Name of the table to wait for
 * @param {number} maxSeconds - Maximum seconds to wait (default 60)
 * @returns {Promise<boolean>} true if table exists, false if timeout
 */
async function waitForClickHouseTable(tableName, maxSeconds = 60) {
    console.log(`[test-setup-hooks] Waiting for ClickHouse table '${tableName}'...`);

    let attempts = 0;
    while (attempts < maxSeconds) {
        attempts++;
        try {
            execSync(
                `curl -sf "http://localhost:${TEST_PORTS.CLICKHOUSE}" --data-binary "SELECT 1 FROM countly_drill.${tableName} LIMIT 1"`,
                { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
            );
            console.log(`\n[test-setup-hooks] Table '${tableName}' exists`);
            return true;
        }
        catch (err) {
            // Table doesn't exist yet, continue waiting
        }
        process.stdout.write('.');
        await new Promise(r => setTimeout(r, 1000));
    }

    console.warn(`\n[test-setup-hooks] Table '${tableName}' not found after ${maxSeconds}s`);
    return false;
}

/**
 * Wait for a Kafka topic to exist
 * Polls Kafka via docker exec to check topic existence
 * @param {string} topicName - Name of the topic to wait for
 * @param {number} maxSeconds - Maximum seconds to wait (default 60)
 * @returns {Promise<boolean>} true if topic exists, false if timeout
 */
async function waitForKafkaTopic(topicName, maxSeconds = 60) {
    console.log(`[test-setup-hooks] Waiting for Kafka topic '${topicName}' to exist...`);

    let attempts = 0;
    while (attempts < maxSeconds) {
        attempts++;
        try {
            const result = execSync(
                `docker exec ${CONTAINER_PREFIX}-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:29092 --list`,
                { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
            );
            const topics = result.split('\n').map(t => t.trim()).filter(Boolean);

            if (topics.includes(topicName)) {
                console.log(`\n[test-setup-hooks] Topic '${topicName}' exists`);
                return true;
            }
        }
        catch (err) {
            // Kafka not ready yet, continue waiting
        }

        process.stdout.write('.');
        await new Promise(r => setTimeout(r, 1000));
    }

    console.warn(`\n[test-setup-hooks] Topic '${topicName}' not found after ${maxSeconds}s`);
    return false;
}

/**
 * Generate nginx config from template with port substitution
 * Creates nginx.generated.conf from nginx.template.conf with suite-specific ports
 */
function generateNginxConfig() {
    console.log('[test-setup-hooks] Generating nginx config from template...');
    const templatePath = path.resolve(__dirname, '..', 'conf', 'nginx.template.conf');
    const outputPath = path.resolve(__dirname, '..', 'conf', 'nginx.generated.conf');

    let config = fs.readFileSync(templatePath, 'utf8');

    config = config.replace(/\{\{INGESTOR_PORT\}\}/g, TEST_PORTS.INGESTOR.toString());
    config = config.replace(/\{\{API_PORT\}\}/g, TEST_PORTS.API.toString());
    config = config.replace(/\{\{JOBSERVER_PORT\}\}/g, TEST_PORTS.JOBSERVER.toString());
    config = config.replace(/\{\{FRONTEND_PORT\}\}/g, TEST_PORTS.FRONTEND.toString());

    fs.writeFileSync(outputPath, config);
    console.log(`[test-setup-hooks] Generated nginx config with ports: API=${TEST_PORTS.API}, Frontend=${TEST_PORTS.FRONTEND}, Ingestor=${TEST_PORTS.INGESTOR}, JobServer=${TEST_PORTS.JOBSERVER}`);
}

/**
 * Start Docker backend services (MongoDB, ClickHouse, Kafka, etc.)
 * Uses unified compose file with environment variables for port isolation
 */
function startDockerServices() {
    console.log(`[test-setup-hooks] Starting Docker backend services for ${TEST_SUITE}...`);

    // Generate nginx config from template before starting Docker
    generateNginxConfig();

    try {
        // Set environment variables for docker-compose
        const dockerEnv = {
            ...process.env,
            CONTAINER_PREFIX: CONTAINER_PREFIX,
            MONGO_PORT: TEST_PORTS.MONGODB.toString(),
            KAFKA_PORT: (19092 + PORT_OFFSET).toString(),
            CH_HTTP_PORT: TEST_PORTS.CLICKHOUSE.toString(),
            CH_NATIVE_PORT: (19000 + PORT_OFFSET).toString(),
            KAFKA_CONNECT_PORT: TEST_PORTS.KAFKA_CONNECT.toString(),
            NGINX_PORT: TEST_PORTS.NGINX.toString(),
            KAFKA_CLUSTER_ID: suiteConfig.kafkaClusterId,
            WIREDTIGER_CACHE: suiteConfig.wiredTigerCache
        };

        execSync(`docker compose -p test-${TEST_SUITE} -f "${COMPOSE_FILE}" up -d`, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: dockerEnv
        });
    }
    catch (error) {
        console.error('[test-setup-hooks] Failed to start Docker services:', error.message);
        throw error;
    }
}

/**
 * Wait for Docker backend services to be healthy
 */
async function waitForDockerServices() {
    console.log('[test-setup-hooks] Waiting for Docker services to be healthy...');

    // Wait for MongoDB on test port
    await waitForPort(TEST_PORTS.MONGODB, 'MongoDB', 60);

    // Wait for ClickHouse on test port
    await waitForPort(TEST_PORTS.CLICKHOUSE, 'ClickHouse', 60);

    // Wait for Kafka Connect on test port (indicates Kafka is ready too)
    await waitForPort(TEST_PORTS.KAFKA_CONNECT, 'Kafka Connect', 90);

    console.log('[test-setup-hooks] Docker backend services are ready');

    // Pre-create drill-events Kafka topic before starting Countly services
    // This prevents race condition where aggregator subscribes before topic exists
    console.log('[test-setup-hooks] Creating drill-events Kafka topic...');
    try {
        execSync(
            `docker exec ${CONTAINER_PREFIX}-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:29092 --create --topic drill-events --partitions 1 --replication-factor 1 --if-not-exists`,
            { stdio: ['pipe', 'pipe', 'pipe'] }
        );
        console.log('[test-setup-hooks] Kafka topic drill-events created');
    }
    catch (error) {
        // Topic might already exist - that's OK
        console.log('[test-setup-hooks] Kafka topic creation:', error.message.includes('exists') ? 'already exists' : error.message);
    }
}

/**
 * Stop Docker services and clean up volumes
 */
function stopDockerServices() {
    console.log(`[test-setup-hooks] Stopping Docker services for ${TEST_SUITE} at ${new Date().toISOString()}...`);
    try {
        // Set same environment variables as start (needed for compose to find containers)
        const dockerEnv = {
            ...process.env,
            CONTAINER_PREFIX: CONTAINER_PREFIX,
            MONGO_PORT: TEST_PORTS.MONGODB.toString(),
            KAFKA_PORT: (19092 + PORT_OFFSET).toString(),
            CH_HTTP_PORT: TEST_PORTS.CLICKHOUSE.toString(),
            CH_NATIVE_PORT: (19000 + PORT_OFFSET).toString(),
            KAFKA_CONNECT_PORT: TEST_PORTS.KAFKA_CONNECT.toString(),
            NGINX_PORT: TEST_PORTS.NGINX.toString(),
            KAFKA_CLUSTER_ID: suiteConfig.kafkaClusterId,
            WIREDTIGER_CACHE: suiteConfig.wiredTigerCache
        };

        // -v: remove volumes, --remove-orphans: remove orphan containers
        execSync(`docker compose -p test-${TEST_SUITE} -f "${COMPOSE_FILE}" down -v --remove-orphans`, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: dockerEnv
        });
        console.log('[test-setup-hooks] Docker services stopped, volumes and orphans cleaned up');

        // Clean up generated nginx config
        const generatedNginxPath = path.resolve(__dirname, '..', 'conf', 'nginx.generated.conf');
        if (fs.existsSync(generatedNginxPath)) {
            fs.unlinkSync(generatedNginxPath);
        }
    }
    catch (error) {
        console.error('[test-setup-hooks] Failed to stop Docker services:', error.message);
    }
}

/**
 * Capture Docker container logs before cleanup (only when SAVE_LOGS is enabled)
 */
function captureDockerLogs() {
    if (!SAVE_LOGS) {
        return;
    }

    console.log('[test-setup-hooks] Capturing Docker container logs...');
    console.log(`[test-setup-hooks] Log directory: ${path.resolve(LOG_DIR)}`);
    // Ensure log directory exists
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    const dockerContainers = [
        'mongodb',
        'clickhouse',
        'kafka',
        'kafka-connect'
    ];

    dockerContainers.forEach(container => {
        const containerName = `${CONTAINER_PREFIX}-${container}`;
        const logFile = path.join(LOG_DIR, `docker-${containerName}.log`);
        try {
            execSync(`docker logs ${containerName} > "${logFile}" 2>&1`, {
                maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large logs
            });
            console.log(`  - ${containerName}: ${path.resolve(logFile)}`);
        }
        catch (err) {
            console.error(`  - Failed to capture ${containerName} logs: ${err.message}`);
        }
    });
}

/**
 * Run install_plugins.js to ensure all plugins are properly installed
 * This runs for ALL plugins regardless of which test suite is being run
 * Uses env-cmd to set the correct test environment variables
 */
async function runInstallPlugins() {
    console.log('[test-setup-hooks] Running install_plugins.js for all plugins...');
    return new Promise((resolve, reject) => {
        const proc = spawn('npx', [
            'env-cmd', '-r', ENV_RC_FILE, '-e', `base,${TEST_SUITE}`,
            'node', '--preserve-symlinks', '--preserve-symlinks-main',
            'bin/scripts/install_plugins.js', '--force'
        ], {
            cwd: CORE_DIR,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_ENV: 'development' }
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
            // Print progress dots
            process.stdout.write('.');
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            console.log(''); // New line after dots
            if (code === 0) {
                console.log('[test-setup-hooks] install_plugins.js completed successfully');
                resolve();
            }
            else {
                console.error('[test-setup-hooks] install_plugins.js failed with code:', code);
                console.error('[test-setup-hooks] stdout:', stdout);
                console.error('[test-setup-hooks] stderr:', stderr);
                // Don't reject - allow tests to continue even if install fails
                // Some plugins may not have install scripts
                resolve();
            }
        });

        proc.on('error', (err) => {
            console.error('[test-setup-hooks] Failed to run install_plugins.js:', err.message);
            resolve(); // Don't reject - allow tests to continue
        });
    });
}

/**
 * Initialize test database with required documents
 * Creates plugins document needed by tests
 * Clears members collection for clean setup tests (unless plugin tests)
 */
function initializeTestDatabase() {
    console.log('[test-setup-hooks] Initializing test database...');
    try {
        // Check if running plugin tests (they set COUNTLY_TEST_APP_ID)
        const isPluginTest = !!process.env.COUNTLY_TEST_APP_ID;

        if (!isPluginTest) {
            // Clear members collection for fresh setup tests (imported data would skip setup)
            const clearMembersCmd = `mongosh --quiet mongodb://localhost:${TEST_PORTS.MONGODB}/countly --eval 'db.members.deleteMany({})'`;
            execSync(clearMembersCmd, { stdio: ['pipe', 'pipe', 'pipe'] });
            console.log('[test-setup-hooks] Members cleared for setup tests');
        }
        else {
            console.log('[test-setup-hooks] Plugin tests - keeping imported test data');
        }

        // Set plugin settings for tests
        // Enable realtime_cohorts so aggregator processes cohort events from Kafka
        const mongoCmd = `mongosh --quiet mongodb://localhost:${TEST_PORTS.MONGODB}/countly --eval 'db.plugins.updateOne({_id: "plugins"}, {$set:{"api.batch_processing":false, "api.batch_read_processing": false, "drill.record_meta": true, "funnels.funnel_caching": false, "aggregator.interval": 200, "cohorts.realtime_cohorts": true}}, {upsert:true})'`;
        execSync(mongoCmd, { stdio: ['pipe', 'pipe', 'pipe'] });
        console.log('[test-setup-hooks] Test database initialized');
    }
    catch (error) {
        console.error('[test-setup-hooks] Failed to initialize database:', error.message);
        throw error;
    }
}

/**
 * Start Countly services as background processes
 * Uses .env-cmdrc.json with base + suite-specific environments
 */
function startCountlyServices() {
    console.log('[test-setup-hooks] Starting Countly services...');
    console.log(`[test-setup-hooks] Using env-cmd rc file: ${ENV_RC_FILE} (environments: base,${TEST_SUITE})`);

    // Create log directory if saving logs
    if (SAVE_LOGS) {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
        console.log('[test-setup-hooks] SAVE_LOGS enabled - saving service logs');
        console.log(`[test-setup-hooks] Log directory: ${path.resolve(LOG_DIR)}`);

        // Clear existing log files from previous runs
        const allLogFiles = [
            ...Object.values(LOG_FILES),
            ...['mongodb', 'clickhouse', 'kafka', 'kafka-connect'].map(c => path.join(LOG_DIR, `docker-${CONTAINER_PREFIX}-${c}.log`))
        ];
        const clearedFiles = [];
        allLogFiles.forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                clearedFiles.push(path.basename(file));
            }
        });
        if (clearedFiles.length > 0) {
            console.log(`[test-setup-hooks] Cleared ${clearedFiles.length} existing log files: ${clearedFiles.join(', ')}`);
        }

        console.log('[test-setup-hooks] Log files:');
        Object.entries(LOG_FILES).forEach(([name, file]) => {
            console.log(`  - ${name}: ${path.resolve(file)}`);
        });
    }

    COUNTLY_SERVICES.forEach(({ name, script }) => {
        // Use env-cmd with rc file: base environment + suite-specific overrides
        const proc = spawn('npx', [
            'env-cmd', '-r', ENV_RC_FILE, '-e', `base,${TEST_SUITE}`,
            'node', '--preserve-symlinks', '--preserve-symlinks-main', script
        ], {
            cwd: CORE_DIR,
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: true, // Create new process group for proper cleanup
            env: { ...process.env, COUNTLY_CONFIG__SYMLINKED: 'true', NODE_ENV: 'development', COUNTLY_CONTAINER: 'api' }
        });

        proc.on('error', (err) => {
            console.error(`[test-setup-hooks] Failed to start ${name}:`, err.message);
        });

        // Monitor for unexpected service death during test run
        proc.on('exit', (code, signal) => {
            if (servicesStarted && !shuttingDown) {
                console.error(`\n[test-setup-hooks] CRITICAL: ${name} exited unexpectedly (code=${code}, signal=${signal})`);
                console.error('[test-setup-hooks] Aborting test run...');
                process.exit(1);
            }
        });

        // Handle service logs - write to files if SAVE_LOGS is set, otherwise suppress
        if (SAVE_LOGS && LOG_FILES[name]) {
            // Initialize log file with timestamp header
            fs.writeFileSync(LOG_FILES[name], `=== ${name} started: ${new Date().toISOString()} ===\n`);
            const logStream = fs.createWriteStream(LOG_FILES[name], { flags: 'a' });
            proc.stdout.pipe(logStream);
            proc.stderr.pipe(logStream);
        }
        // When SAVE_LOGS is not set, logs are simply not piped (clean test output)

        countlyProcesses.push({ name, proc, pid: proc.pid });
        console.log(`[test-setup-hooks] Started ${name} (PID: ${proc.pid})`);
    });
}

/**
 * Force kill remaining processes (synchronous, for exit handler)
 */
function forceKillRemainingProcesses() {
    countlyProcesses.forEach(({ name, pid }) => {
        if (pid) {
            try {
                // Kill the process group (negative PID)
                process.kill(-pid, 'SIGKILL');
            }
            catch (err) {
                // Process already dead - ignore
            }
        }
    });
}

/**
 * Stop all Countly services with graceful shutdown + force kill
 * IMPORTANT: This is async and MUST be awaited before stopping Docker services
 * Countly services need MongoDB to complete graceful shutdown
 */
async function stopCountlyServices() {
    console.log('[test-setup-hooks] Stopping Countly services...');

    // Mark as shutting down to prevent exit handlers from triggering abort
    shuttingDown = true;

    if (countlyProcesses.length === 0) {
        return;
    }

    // First, send SIGTERM to all process groups for graceful shutdown
    countlyProcesses.forEach(({ name, proc, pid }) => {
        if (proc && !proc.killed && pid) {
            try {
                // Kill the entire process group (negative PID)
                process.kill(-pid, 'SIGTERM');
                console.log(`[test-setup-hooks] Sent SIGTERM to ${name} (PID: ${pid})`);
            }
            catch (err) {
                console.error(`[test-setup-hooks] Failed to stop ${name}:`, err.message);
            }
        }
    });

    // Wait 3 seconds for graceful shutdown (services need MongoDB to shut down cleanly)
    console.log('[test-setup-hooks] Waiting 3s for graceful shutdown...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Force kill any remaining processes
    countlyProcesses.forEach(({ name, proc, pid }) => {
        if (proc && !proc.killed && pid) {
            try {
                process.kill(-pid, 'SIGKILL');
                console.log(`[test-setup-hooks] Force killed ${name} (PID: ${pid})`);
            }
            catch (err) {
                // Process may already be dead - ignore
            }
        }
    });
    countlyProcesses = [];
}

/**
 * Wait for Nginx (test entry point) to be ready
 */
async function waitForNginx() {
    console.log('[test-setup-hooks] Waiting for Nginx (test entry point)...');
    await waitForPort(TEST_PORTS.NGINX, 'Nginx', 90);
}

/**
 * Initialize Kafka ClickHouse connector after API has created tables
 * Optimized for fast processing with small batches
 */
function initializeKafkaConnector() {
    console.log('[test-setup-hooks] Initializing Kafka ClickHouse connector...');
    try {
        const connectorConfig = {
            'connector.class': 'com.clickhouse.kafka.connect.ClickHouseSinkConnector',
            'tasks.max': '1',
            'topics': 'drill-events',
            'hostname': 'clickhouse', // Docker service name (same network as kafka-connect)
            'port': '8123', // Internal container port
            'ssl': 'false',
            'database': 'countly_drill',
            'username': 'default',
            'password': '',
            'topic2TableMap': 'drill-events=drill_events',
            'key.converter': 'org.apache.kafka.connect.storage.StringConverter',
            'value.converter': 'org.apache.kafka.connect.json.JsonConverter',
            'value.converter.schemas.enable': 'false',
            'clickhouse.settings': 'async_insert=0',
            'batch.size': '10',
            'errors.tolerance': 'all',
            'errors.retry.timeout': '10000',
            'errors.retry.delay.max.ms': '100',
            'errors.deadletterqueue.topic.name': 'drill-events-dlq',
            'errors.deadletterqueue.context.headers.enable': 'true',
            'errors.deadletterqueue.topic.replication.factor': '1'
        };

        // Write config to temp file to avoid shell escaping issues
        const configPath = path.resolve(__dirname, '..', 'conf', 'connector-config.json');
        fs.writeFileSync(configPath, JSON.stringify(connectorConfig, null, 2));

        const curlUrl = `http://localhost:${TEST_PORTS.KAFKA_CONNECT}/connectors/clickhouse-sink/config`;
        console.log(`[test-setup-hooks] Sending connector config to: ${curlUrl}`);

        // Use @ to read config from file - avoids shell escaping issues
        const result = execSync(`curl -s -w "\\n%{http_code}" -X PUT -H 'Content-Type: application/json' -d @${configPath} ${curlUrl}`, {
            encoding: 'utf8',
            timeout: 30000
        });

        // Parse response - last line is HTTP status code
        const lines = result.trim().split('\n');
        const httpCode = lines.pop();
        const response = lines.join('\n');

        if (httpCode >= 200 && httpCode < 300) {
            console.log('[test-setup-hooks] Kafka connector initialized successfully');
        }
        else {
            console.error(`[test-setup-hooks] Kafka connector initialization failed with HTTP ${httpCode}`);
            console.error('[test-setup-hooks] Response:', response);
        }

        // Clean up temp file
        fs.unlinkSync(configPath);
    }
    catch (error) {
        console.error('[test-setup-hooks] Failed to initialize Kafka connector:', error.message);
        if (error.stdout) {
            console.error('[test-setup-hooks] stdout:', error.stdout);
        }
        if (error.stderr) {
            console.error('[test-setup-hooks] stderr:', error.stderr);
        }
        // Don't throw - connector is not required for all tests
    }
}

/**
 * Verify Kafka Connect sink connector is running and healthy
 * Waits for both connector and task to be in RUNNING state
 */
async function verifyKafkaConnectSink(maxSeconds = 30) {
    console.log('[test-setup-hooks] Verifying Kafka Connect sink status...');
    const startTime = Date.now();
    const maxTime = maxSeconds * 1000;
    let lastError = null;
    let lastStatus = null;

    while (Date.now() - startTime < maxTime) {
        try {
            const result = execSync(`curl -s http://localhost:${TEST_PORTS.KAFKA_CONNECT}/connectors/clickhouse-sink/status`, {
                encoding: 'utf8',
                timeout: 5000
            });
            const status = JSON.parse(result);
            lastStatus = status;

            if (status.connector && status.connector.state === 'RUNNING' &&
                status.tasks && status.tasks.length > 0 && status.tasks[0].state === 'RUNNING') {
                console.log('[test-setup-hooks] Kafka Connect sink is RUNNING');
                return true;
            }
            else {
                const connState = status.connector ? status.connector.state : 'UNKNOWN';
                const taskState = status.tasks && status.tasks[0] ? status.tasks[0].state : 'UNKNOWN';
                const taskTrace = status.tasks && status.tasks[0] && status.tasks[0].trace ? status.tasks[0].trace : '';
                console.log(`[test-setup-hooks] Kafka Connect sink not ready yet (connector: ${connState}, task: ${taskState})`);
                if (taskState === 'FAILED' && taskTrace) {
                    console.error(`[test-setup-hooks] Task failure trace: ${taskTrace.substring(0, 500)}`);
                }
            }
        }
        catch (err) {
            lastError = err;
            // Log error details on first occurrence
            if (Date.now() - startTime < 2000) {
                console.log(`[test-setup-hooks] Waiting for connector status endpoint... (${err.message})`);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.warn('[test-setup-hooks] Kafka Connect sink verification timed out');
    if (lastStatus) {
        console.warn('[test-setup-hooks] Last status:', JSON.stringify(lastStatus, null, 2));
    }
    if (lastError) {
        console.warn('[test-setup-hooks] Last error:', lastError.message);
    }
    return false;
}

/**
 * Handle SIGINT/SIGTERM to ensure cleanup on Ctrl+C or kill
 *
 * NOTE: We intentionally keep exception/rejection handlers non-fatal.
 * Test assertion failures throw exceptions, and if we exit on them,
 * we prevent Mocha from handling them properly.
 *
 * Cleanup is guaranteed by:
 * 1. afterAll hook (normal completion)
 * 2. SIGINT/SIGTERM handlers (user interrupt)
 * 3. process.on('exit') -> forceKillRemainingProcesses() (any exit)
 */
function setupSignalHandlers() {
    const cleanup = async(signal) => {
        console.log(`\n[test-setup-hooks] WARNING: Received ${signal} at ${new Date().toISOString()}, cleaning up...`);
        console.log(`[test-setup-hooks] Stack trace:`, new Error().stack);
        if (servicesStarted) {
            await stopCountlyServices(); // Wait for services to stop before Docker
            stopDockerServices();
        }
        process.exit(signal === 'SIGINT' ? 130 : 143);
    };

    // Handle SIGHUP (sent when terminal disconnects, SSH timeout, etc.)
    // IMPORTANT: Ignore SIGHUP to keep tests running when terminal closes
    process.on('SIGHUP', () => {
        console.log(`\n[test-setup-hooks] Received SIGHUP (terminal disconnect) at ${new Date().toISOString()} - IGNORING to keep tests running`);
        // Don't call cleanup - keep running
    });

    // Handle SIGPIPE (writing to closed pipe, e.g., stdout closed by CI runner)
    // IMPORTANT: Ignore SIGPIPE to keep tests running when output pipe closes
    process.on('SIGPIPE', () => {
        console.log(`\n[test-setup-hooks] Received SIGPIPE at ${new Date().toISOString()} - IGNORING to keep tests running`);
        // Don't call cleanup - keep running
    });

    // Handle SIGQUIT (sent by Ctrl+\ or some CI runners)
    // IMPORTANT: Ignore SIGQUIT to keep tests running
    process.on('SIGQUIT', () => {
        console.log(`\n[test-setup-hooks] Received SIGQUIT at ${new Date().toISOString()} - IGNORING to keep tests running`);
        // Don't call cleanup - keep running
    });

    process.on('SIGINT', () => cleanup('SIGINT'));
    process.on('SIGTERM', () => cleanup('SIGTERM'));

    // Log exceptions but don't exit - Mocha handles test assertion errors
    // Cleanup is guaranteed by: afterAll hook, SIGINT/SIGTERM handlers, and process.on('exit')
    process.on('uncaughtException', (err) => {
        // Only log if it's not a test assertion (avoid noise in test output)
        if (err.name !== 'AssertionError') {
            console.error('[test-setup-hooks] Uncaught exception (non-fatal):', err.message);
        }
        // Don't exit - let Mocha handle test failures
        // forceKillRemainingProcesses() runs on any process exit
    });

    process.on('unhandledRejection', (reason, promise) => {
        // Only log, don't exit
        console.error('[test-setup-hooks] Unhandled rejection (non-fatal):', reason);
    });

    // Force kill any remaining processes on exit (last resort)
    process.on('exit', (code) => {
        forceKillRemainingProcesses();
    });
}

/**
 * Wait for Countly API to be ready
 */
async function waitForCountlyAPI() {
    console.log('[test-setup-hooks] Waiting for Countly API to be ready...');
    await waitForPort(TEST_PORTS.API, 'API', 90);
}

/**
 * Wait for Countly Frontend to be ready
 */
async function waitForCountlyFrontend() {
    console.log('[test-setup-hooks] Waiting for Countly Frontend to be ready...');
    await waitForPort(TEST_PORTS.FRONTEND, 'Frontend', 90);
}

/**
 * Wait for Countly Ingestor to be ready
 */
async function waitForCountlyIngestor() {
    console.log('[test-setup-hooks] Waiting for Countly Ingestor to be ready...');
    await waitForPort(TEST_PORTS.INGESTOR, 'Ingestor', 90);
}

/**
 * Wait for Countly JobServer to be ready
 */
async function waitForJobServer() {
    console.log('[test-setup-hooks] Waiting for Countly JobServer to be ready...');
    await waitForPort(TEST_PORTS.JOBSERVER, 'JobServer', 90);
}

// Mocha root hooks
exports.mochaHooks = {
    async beforeAll() {
        setupSignalHandlers();

        try {
            // Start Docker services
            startDockerServices();
            servicesStarted = true;
            await waitForDockerServices();

            // Initialize test database with plugins document
            initializeTestDatabase();

            // Run install_plugins.js for ALL plugins (regardless of test suite)
            // This ensures all plugins are properly installed before tests run
            await runInstallPlugins();

            // Wait for Kafka transaction coordinator to be fully ready BEFORE starting Countly services
            // The broker reports healthy before the coordinator is loaded, causing producer init failures
            console.log('[test-setup-hooks] Waiting 10s for Kafka transaction coordinator to stabilize...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Start Countly services
            startCountlyServices();

            // Wait for all Countly services to be ready (not just nginx proxy)
            await waitForCountlyAPI();
            await waitForCountlyFrontend();
            await waitForCountlyIngestor();
            await waitForJobServer();

            // Wait for Nginx to be ready (entry point)
            await waitForNginx();

            // Wait for Kafka topic to exist (created by API's KafkaBootstrapper)
            await waitForKafkaTopic('drill-events', 30);

            // Wait for drill_events table to be created by Countly API before initializing connector
            // This is non-blocking - if ClickHouse fails to initialize, tests can still run using MongoDB
            const tableFound = await waitForClickHouseTable('drill_events', 60);
            if (tableFound) {
                initializeKafkaConnector();
                // Verify the connector is actually running before proceeding
                await verifyKafkaConnectSink(30);
            }
            else {
                console.log('[test-setup-hooks] ClickHouse drill_events table not found - ClickHouse may not be initialized.');
                console.log('[test-setup-hooks] Tests will continue using MongoDB for drill queries.');
            }

            // Stabilization delay - services need time to fully initialize internal state
            // (writeBatcher ready, Kafka producer connected, database pools warmed up)
            // CI uses 40s sleep - we match this for config reload and full initialization
            console.log('[test-setup-hooks] Waiting 40s for services to stabilize (matching CI)...');
            await new Promise(resolve => setTimeout(resolve, 40000));

            console.log('[test-setup-hooks] All services ready, starting tests...');
        }
        catch (error) {
            // Clean up on startup failure - stop services and remove volumes
            console.error('[test-setup-hooks] Startup failed, cleaning up...');
            if (servicesStarted) {
                await stopCountlyServices();
                captureDockerLogs();
                stopDockerServices(); // This uses -v to remove volumes
                servicesStarted = false;
            }
            throw error; // Re-throw to fail the test run
        }
    },

    async afterAll() {
        console.log(`\n[test-setup-hooks] afterAll() called at ${new Date().toISOString()}`);
        if (servicesStarted) {
            console.log('[test-setup-hooks] Stopping services (servicesStarted=true)...');
            await stopCountlyServices(); // Wait for services to stop before Docker
            captureDockerLogs(); // Capture Docker logs before containers are destroyed
            stopDockerServices();
            servicesStarted = false;
        }
        else {
            console.log('[test-setup-hooks] Services not started, skipping cleanup');
        }

        // Show log file locations if logs were saved
        if (SAVE_LOGS) {
            console.log('\n[test-setup-hooks] === LOG FILES SUMMARY ===');
            console.log(`[test-setup-hooks] Log directory: ${path.resolve(LOG_DIR)}`);
            console.log('\n[test-setup-hooks] Service logs:');
            Object.entries(LOG_FILES).forEach(([name, file]) => {
                console.log(`  - ${name}: ${path.resolve(file)}`);
            });
            console.log('\n[test-setup-hooks] Docker logs:');
            ['mongodb', 'clickhouse', 'kafka', 'kafka-connect'].forEach(container => {
                console.log(`  - ${container}: ${path.resolve(LOG_DIR, `docker-${CONTAINER_PREFIX}-${container}.log`)}`);
            });
        }
    }
};
