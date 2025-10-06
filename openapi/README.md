# Countly Server OpenAPI Specifications

This directory contains OpenAPI 3.0 specifications for the various APIs exposed by Countly Server.

## Available API Specifications

- [Alerts API](./alerts.yaml) - API for managing alerts in Countly Server

## How to Use These Specifications

These specifications can be used with tools like:

1. **Swagger UI** - To create interactive API documentation
2. **ReDoc** - For a more modern documentation UI
3. **OpenAPI Generator** - To generate client SDK libraries in various languages
4. **API Testing Tools** - Such as Postman or Insomnia

## Adding New Specifications

When adding a new API specification:

1. Create a YAML file named after the module (e.g., `push.yaml` for Push Notification API)
2. Keep each API domain in its own file
3. Update this README to include the new specification

## Generating Documentation

To generate HTML documentation from these specifications, you can use tools like:

```bash
# Using Swagger UI
npx swagger-ui-cli bundle ./alerts.yaml -o ./docs/alerts

# Using ReDoc
npx redoc-cli bundle ./alerts.yaml -o ./docs/alerts.html
```