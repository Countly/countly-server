---
sidebar_position: 1
sidebar_label: "Overview"
---

# Populator - API Documentation

## Overview

The Populator feature manages reusable data-generation templates and app environments used to seed synthetic users for testing and demos.

## Quick Links

- [Populator - Template Create](./i-populator-templates-create.md)
- [Populator - Template Edit](./i-populator-templates-edit.md)
- [Populator - Template Remove](./i-populator-templates-remove.md)
- [Populator - Template Read](./o-populator-templates.md)
- [Populator - Environment Save](./i-populator-environment-save.md)
- [Populator - Environment Name Check](./o-populator-environment-check.md)
- [Populator - Environment List](./o-populator-environment-list.md)
- [Populator - Environment Read](./o-populator-environment-get.md)
- [Populator - Environment Remove](./o-populator-environment-remove.md)

## Feature Workflows

### Template workflow

1. Create a template with target platform/event/user definitions.
2. Read and validate template payloads for reuse.
3. Edit template definitions as needed.
4. Remove template when no longer needed.

### Environment workflow

1. Save an environment with generated user records from a template.
2. Check environment name uniqueness before creating additional environments.
3. List and read environment users with pagination/search.
4. Remove environment and related generated user records when finished.

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.populator_templates` | Stores reusable population templates (platforms, events, users, behavior payloads). |
| `countly.populator_environments` | Stores environment metadata (`name`, `templateId`, `appId`, creation time). |
| `countly.populator_environment_users` | Stores generated users per environment. |
| `countly.members` | Used for authentication/permission validation and audit actor context. |
| `countly.apps` | Used for app-level validation in rights checks. |

## Configuration & Settings

No Populator-specific runtime setting is consumed by the documented endpoints.

## Last Updated

2026-02-17
