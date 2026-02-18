---
sidebar_position: 1
sidebar_label: "Overview"
---

# Notes - API Documentation

## Overview

Notes endpoints let dashboard users create, read, and delete app-related notes used in the Notes UI and related workflows.

## Endpoint Index

- [Note Save](./i-notes-save.md) - `/i/notes/save`
- [Notes List](./o-notes.md) - `/o/notes`
- [Note Delete](./i-notes-delete.md) - `/i/notes/delete`

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.notes` | Stores note records (content, visibility, owner, timestamps, indicator). |
| `countly.members` | Used to enrich notes list with note owner display names. |

## Access & Permissions

- Save endpoint requires `core` create permission for the app (or global admin).
- Read endpoint requires `core` read permission for the app(s) in scope.
- Delete endpoint requires `core` delete permission for the app and note-level edit/delete eligibility.

## Feature Behavior

- Notes can be private or public (`noteType`).
- Read results are permission-filtered by owner, public visibility, and explicit email sharing.
- Public note edit/delete permissions still enforce ownership/admin checks.

## Last Updated

2026-02-17
