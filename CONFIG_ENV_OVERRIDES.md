# Countly Configuration Override via Environment Variables

Countly supports flexible configuration management, allowing you to override almost any setting using environment variables. This is useful for automated deployments (e.g., Terraform, Docker, CI/CD) and for managing settings without direct database or file access.

## 1. Overriding config.js Settings

All settings defined in `api/config.js` (or its sample) can be overridden using environment variables prefixed with `COUNTLY_CONFIG__`.

**Format:**
```
COUNTLY_CONFIG__<NAMESPACE>__<SETTING>=<value>
```
- NAMESPACE and SETTING are uppercased and separated by double underscores.

**Example:**
To override the API domain:
```
COUNTLY_CONFIG__API__DOMAIN=https://arturs.count.ly
```
To override MongoDB host:
```
COUNTLY_CONFIG__API__MONGODB__HOST=mongo.host.name
```

## 2. Overriding Dashboard/Management Settings

Settings managed via the dashboard (Management → Settings) can be overridden using the `COUNTLY_SETTINGS__` prefix.

**Format:**
```
COUNTLY_SETTINGS__<NAMESPACE>__<SETTING>=<value>
```
- NAMESPACE and SETTING are uppercased and separated by double underscores.

**Example:**
To override a dashboard setting:
```
COUNTLY_SETTINGS__GENERAL__SOME_SETTING=some_value
```

## 3. How It Works

- The config extender (`api/configextender.js`) reads environment variables and applies them to the configuration before the server starts.
- This works for both file-based configs and database-stored settings.
- You can preset any setting before the server or database is initialized.

## 4. Codebase References

- See `api/configextender.js` for logic on how environment variables are parsed and applied.
- See `test/2.api/00.read.config.js` for tests showing how environment variables override config values.
- See `api/config.sample.js` for available config options.

## 5. Best Practices

- Use uppercase for NAMESPACE and SETTING names.
- Separate nested config keys with double underscores.
- Set environment variables in your deployment scripts, Dockerfiles, or orchestration tools.

---

For further details, refer to the codebase files mentioned above or reach out to the Countly team for support.
