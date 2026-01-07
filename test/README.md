# Countly Test Suite

## Quick Start

```bash
# Run all tests (via Grunt)
npm test

# Run specific test suites
npm run test:api-core           # Core API tests (no plugins)
npm run test:lite-plugins       # CE plugin tests (30 plugins)
npm run test:enterprise-plugins # EE-only plugin tests (26 plugins)
npm run test:plugin -- <name>   # Single plugin tests
```

## Test Suites

| Command | Description | Plugins |
|---------|-------------|---------|
| `npm run test:api-core` | Core API functionality | CE (default) |
| `npm run test:lite-plugins` | Community Edition plugins | 30 CE plugins |
| `npm run test:enterprise-plugins` | Enterprise-only plugins | 26 EE-exclusive |
| `npm run test:plugin -- drill` | Single named plugin | All (EE) |

## Single Plugin Testing

```bash
# Test a specific plugin
npm run test:plugin -- drill
npm run test:plugin -- funnels
npm run test:plugin -- clickhouse
```

## Parallel Execution

Each test suite uses isolated ports and Docker containers, allowing parallel execution:

```bash
# Run in separate terminals
npm run test:api-core &
npm run test:lite-plugins &
npm run test:enterprise-plugins &
```

### Port Configuration

| Suite | MongoDB | ClickHouse | Kafka | Nginx | API | Frontend |
|-------|---------|------------|-------|-------|-----|----------|
| core | 37017 | 18123 | 19092 | 10080 | 13001 | 16001 |
| lite | 37117 | 18223 | 19192 | 10180 | 13101 | 16101 |
| enterprise | 37217 | 18323 | 19292 | 10280 | 13201 | 16201 |
| plugin | 37317 | 18423 | 19392 | 10380 | 13301 | 16301 |

## Unit Tests

```bash
# Run unit tests only (no Docker/services required)
npm run test:unit
```

## Environment Variables

Tests automatically configure these, but can be overridden:

```bash
COUNTLY_TEST_APP_ID=58bf06bd6cba850047ac9f19
COUNTLY_TEST_APP_KEY=b41e02136be60a58b9b7459ad89030537a58e099
COUNTLY_TEST_API_KEY_ADMIN=e6bfab40a224d55a2f5d40c83abc7ed4
```

## Test Directory Structure

```
test/
├── configs/                    # Test configurations
│   ├── api-core.js            # Core API mocha config
│   ├── lite-plugins.js        # CE plugins mocha config
│   ├── enterprise-plugins.js  # EE plugins mocha config
│   ├── single-plugin.js       # Single plugin mocha config
│   ├── integration-hooks.js   # Docker/service orchestration
│   ├── docker-compose.test-*.yml  # Docker configs per suite
│   └── test-*.env             # Environment files per suite
├── 1.frontend/                # Frontend/DB setup tests
├── 2.api/                     # API read tests
├── 3.api.write/               # API write tests
├── 4.plugins/                 # Plugin test loader
├── 5.cleanup/                 # Cleanup tests
└── unit/                      # Unit tests (no services)
```

## Troubleshooting

### Services not starting
```bash
# Check Docker containers
docker ps -a | grep test-

# View logs
docker logs test-core-mongodb
docker logs test-core-clickhouse
```

### Port conflicts
```bash
# Check if ports are in use
lsof -i :37017  # MongoDB
lsof -i :18123  # ClickHouse
```

### Clean up stale containers
```bash
# Remove all test containers
docker rm -f $(docker ps -aq --filter "name=test-")
docker network prune -f
```
