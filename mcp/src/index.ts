#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import http from 'http';
import url from 'url';
import { MCPAnalyticsTracker } from './analytics-tracker.js';

interface CountlyConfig {
  serverUrl: string;
  apiKey: string;
  timeout?: number;
}

interface HttpConfig {
  port?: number;
  hostname?: string;
  cors?: boolean;
}

interface CountlyResponse<T = any> {
  result?: T;
  error?: string;
  [key: string]: any;
}

interface CountlyApp {
  _id: string;
  name: string;
  key: string;
  created_at: number;
  timezone: string;
  category?: string;
}

class CountlyMCPServer {
  private server: Server;
  private config: CountlyConfig;
  private httpClient: AxiosInstance;
  private appsCache: CountlyApp[] = [];
  private appsCacheExpiry: number = 0;
  private analytics?: MCPAnalyticsTracker;

  constructor(testMode: boolean = false) {
    this.server = new Server(
      {
        name: 'countly-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
          logging: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Initialize config from environment variables
    this.config = {
      serverUrl: process.env.COUNTLY_SERVER_URL || 'https://api.count.ly',
      apiKey: process.env.COUNTLY_API_KEY || '',
      timeout: parseInt(process.env.COUNTLY_TIMEOUT || '30000'),
    };

    if (!this.config.apiKey && !testMode) {
      throw new Error('COUNTLY_API_KEY environment variable is required');
    }

    // Ensure server URL doesn't end with /
    this.config.serverUrl = this.config.serverUrl.replace(/\/$/, '');

    this.httpClient = axios.create({
      baseURL: this.config.serverUrl,
      timeout: this.config.timeout,
    });

    // Initialize analytics tracking if enabled
    this.initializeAnalytics();
  }

  private initializeAnalytics(): void {
    const analyticsEnabled = process.env.MCP_ANALYTICS_ENABLED === 'true';
    
    if (analyticsEnabled) {
      const analyticsServerUrl = process.env.MCP_ANALYTICS_SERVER_URL || this.config.serverUrl;
      const analyticsAppKey = process.env.MCP_ANALYTICS_APP_KEY;
      
      if (!analyticsAppKey) {
        console.error('Warning: MCP_ANALYTICS_ENABLED=true but MCP_ANALYTICS_APP_KEY not set. Analytics disabled.');
        return;
      }

      this.analytics = new MCPAnalyticsTracker({
        serverUrl: analyticsServerUrl,
        appKey: analyticsAppKey,
        enabled: true,
        deviceId: process.env.MCP_ANALYTICS_DEVICE_ID
      });

      console.error('📊 MCP Analytics tracking enabled');
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // OpenAI Required Tools for ChatGPT Connectors
        {
          name: 'search',
          description: 'Search for relevant content in Countly data sources (required for ChatGPT Connectors)',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query string' },
            },
            required: ['query'],
          },
        },
        {
          name: 'fetch',
          description: 'Retrieve the full contents of a specific document or data item (required for ChatGPT Connectors)',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique identifier for the document or data item' },
            },
            required: ['id'],
          },
        },
        // App Management Tools
        {
          name: 'list_apps',
          description: 'List all available applications with their names and IDs',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_app_by_name',
          description: 'Get app information by app name',
          inputSchema: {
            type: 'object',
            properties: {
              app_name: { type: 'string', description: 'Application name' },
            },
            required: ['app_name'],
          },
        },
        {
          name: 'create_app',
          description: 'Create a new app in Countly (requires global admin privileges)',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Application name' },
              country: { type: 'string', description: 'Country code (e.g., "US")' },
              timezone: { type: 'string', description: 'Timezone (e.g., "America/New_York")' },
              category: { type: 'string', description: 'App category (optional)' },
            },
            required: ['name'],
          },
        },
        {
          name: 'update_app',
          description: 'Update an existing app in Countly',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              name: { type: 'string', description: 'New application name (optional)' },
              country: { type: 'string', description: 'Country code (optional)' },
              timezone: { type: 'string', description: 'Timezone (optional)' },
              category: { type: 'string', description: 'App category (optional)' },
            },
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'delete_app',
          description: 'Delete an app from Countly (requires global admin privileges)',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
            },
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'reset_app',
          description: 'Reset all data for an app (requires global admin privileges)',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
            },
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'update_app_plugins',
          description: 'Update plugins enabled for an app',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              plugins: { type: 'object', description: 'Plugin configuration object (e.g., {"push": true, "crashes": true})' },
            },
            required: ['plugins'],
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        // Analytics Tools
        {
          name: 'get_analytics_data',
          description: 'Get analytics data using the main /o endpoint with various methods (sessions, users, locations, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              method: {
                type: 'string',
                enum: [
                  'total_users', 'locations', 'sessions', 'users', 'carriers',
                  'devices', 'app_versions', 'cities', 'events', 'get_events',
                  'top_events', 'countries', 'notes', 'all_apps', 'jobs',
                  'get_event_groups', 'get_event_group', 'geodata'
                ],
                description: 'Data retrieval method'
              },
              period: { type: 'string', description: 'Time period (e.g., "30days", "[20240101,20241231]")' },
              event: { type: 'string', description: 'Event key for event-specific methods' },
              segmentation: { type: 'string', description: 'Segmentation parameter for events' },
            },
            required: ['method'],
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'get_dashboard_data',
          description: 'Get aggregated dashboard data for an app. If no app is specified, will show available apps to choose from.',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional - if not provided, will show available apps)' },
              app_name: { type: 'string', description: 'Application name (optional - if not provided, will show available apps)' },
              period: { type: 'string', description: 'Time period (e.g., "30days")' },
            },
            required: [],
          },
        },
        {
          name: 'get_session_data',
          description: 'Get detailed session analytics data. If no app is specified, will show available apps to choose from.',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional - if not provided, will show available apps)' },
              app_name: { type: 'string', description: 'Application name (optional - if not provided, will show available apps)' },
              period: { type: 'string', description: 'Time period (e.g., "30days")' },
            },
            required: [],
          },
        },
        {
          name: 'get_user_data',
          description: 'Get user analytics data',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              period: { type: 'string', description: 'Time period (e.g., "30days")' },
            },
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'get_events_data',
          description: 'Get events analytics data. If no app is specified, will show available apps to choose from.',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional - if not provided, will show available apps)' },
              app_name: { type: 'string', description: 'Application name (optional - if not provided, will show available apps)' },
              period: { type: 'string', description: 'Time period (e.g., "30days")' },
              event: { type: 'string', description: 'Specific event key to filter by' },
            },
            required: [],
          },
        },
        {
          name: 'get_events_overview',
          description: 'Get overview of events data with total counts and segments',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              period: { type: 'string', description: 'Time period (e.g., "30days")' },
            },
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'get_top_events',
          description: 'Get the most frequently occurring events',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              period: { type: 'string', description: 'Time period (e.g., "30days")' },
              limit: { type: 'number', description: 'Number of top events to retrieve', default: 10 },
            },
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'get_countries_data',
          description: 'Get user analytics data by country',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              period: { type: 'string', description: 'Time period (e.g., "30days")' },
            },
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'get_locations_data',
          description: 'Get user location data segmented by country',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              period: { type: 'string', description: 'Time period (e.g., "30days")' },
            },
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },

        // User Management Tools
        {
          name: 'get_all_users',
          description: 'Get a list of all users in Countly',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'create_app_user',
          description: 'Create a new app user',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              user_data: { type: 'string', description: 'JSON string containing user data' },
            },
            anyOf: [
              { required: ['app_id', 'user_data'] },
              { required: ['app_name', 'user_data'] }
            ],
          },
        },
        {
          name: 'delete_app_user',
          description: 'Delete an app user',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              uid: { type: 'string', description: 'User ID to delete' },
              force: { type: 'boolean', description: 'Force delete if multiple users match', default: false },
            },
            anyOf: [
              { required: ['app_id', 'uid'] },
              { required: ['app_name', 'uid'] }
            ],
          },
        },
        {
          name: 'export_app_users',
          description: 'Export all data for app users',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              export_type: { 
                type: 'string', 
                enum: ['json', 'csv'], 
                description: 'Export format',
                default: 'json'
              },
            },
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },

        // User Retention Tools
        {
          name: 'get_slipping_away_users',
          description: 'Get users who are slipping away based on inactivity period',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              period: { 
                type: 'number', 
                enum: [7, 14, 30, 60, 90], 
                description: 'Time period to check for (days)',
                default: 7
              },
              limit: { type: 'number', description: 'Maximum number of users to return', default: 50 },
              skip: { type: 'number', description: 'Number of users to skip for pagination', default: 0 },
            },
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },

        // Event Management Tools
        {
          name: 'create_event',
          description: 'Record a new custom event. Send event data to be recorded in analytics.',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              event_key: { type: 'string', description: 'Event name/key (required)' },
              device_id: { type: 'string', description: 'Device ID for the event (optional, defaults to "mcp_server")' },
              count: { type: 'number', description: 'Event count (optional, defaults to 1)' },
              sum: { type: 'number', description: 'Sum value for the event (optional)' },
              dur: { type: 'number', description: 'Duration in seconds (optional)' },
              segmentation: { type: 'object', description: 'Custom segmentation data (optional)' },
            },
            anyOf: [
              { required: ['app_id', 'event_key'] },
              { required: ['app_name', 'event_key'] }
            ],
          },
        },
        {
          name: 'create_event_definition',
          description: 'Create/configure an event definition with display name and description',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              event_key: { type: 'string', description: 'Event key/name' },
              display_name: { type: 'string', description: 'Display name for the event' },
              description: { type: 'string', description: 'Description for the event' },
            },
            anyOf: [
              { required: ['app_id', 'event_key'] },
              { required: ['app_name', 'event_key'] }
            ],
          },
        },
        {
          name: 'manage_events',
          description: 'Manage event configurations (edit visibility, map, order)',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              method: {
                type: 'string',
                enum: ['edit_visibility', 'edit_map', 'edit_order'],
                description: 'Management method'
              },
              event_data: { type: 'string', description: 'JSON string containing event management data' },
            },
            anyOf: [
              { required: ['app_id', 'method', 'event_data'] },
              { required: ['app_name', 'method', 'event_data'] }
            ],
          },
        },

        // Alert Management Tools
        {
          name: 'create_alert',
          description: 'Create or update an alert configuration',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Target app ID of the alert (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              alert_config: { type: 'string', description: 'Alert configuration as JSON string' },
            },
            anyOf: [
              { required: ['app_id', 'alert_config'] },
              { required: ['app_name', 'alert_config'] }
            ],
          },
        },
        {
          name: 'delete_alert',
          description: 'Delete an alert',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              alert_id: { type: 'string', description: 'Alert ID to delete' },
            },
            anyOf: [
              { required: ['app_id', 'alert_id'] },
              { required: ['app_name', 'alert_id'] }
            ],
          },
        },
        {
          name: 'list_alerts',
          description: 'List all alerts for an application',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
            },
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },

        // Push Notifications Tools
        {
          name: 'get_push_overview',
          description: 'Get push notifications overview data',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              period: { type: 'string', description: 'Time period (e.g., "30days")' },
            },
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },

        // Remote Config Tools
        {
          name: 'create_remote_config',
          description: 'Create a new remote configuration',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              config_data: { type: 'string', description: 'JSON string containing configuration data' },
            },
            anyOf: [
              { required: ['app_id', 'config_data'] },
              { required: ['app_name', 'config_data'] }
            ],
          },
        },

        // Note Management Tools  
        {
          name: 'create_note',
          description: 'Create a new note',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              note_data: { type: 'string', description: 'JSON string containing note data' },
            },
            anyOf: [
              { required: ['app_id', 'note_data'] },
              { required: ['app_name', 'note_data'] }
            ],
          },
        },
        {
          name: 'delete_note',
          description: 'Delete a note',
          inputSchema: {
            type: 'object',
            properties: {
              note_id: { type: 'string', description: 'Note ID to delete' },
            },
            required: ['note_id'],
          },
        },

        // Token Management Tools
        {
          name: 'list_tokens',
          description: 'List all authentication tokens for the current user',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'create_token',
          description: 'Create a new authentication token',
          inputSchema: {
            type: 'object',
            properties: {
              purpose: { type: 'string', description: 'Purpose of the token' },
              endpoint: { type: 'string', description: 'Endpoint the token can access' },
              ttl: { type: 'number', description: 'Time to live in seconds' },
            },
            required: ['purpose'],
          },
        },
        {
          name: 'delete_token',
          description: 'Delete an authentication token',
          inputSchema: {
            type: 'object',
            properties: {
              token_id: { type: 'string', description: 'Token ID to delete' },
            },
            required: ['token_id'],
          },
        },
        {
          name: 'check_token',
          description: 'Check token validity and remaining time',
          inputSchema: {
            type: 'object',
            properties: {
              token: { type: 'string', description: 'Token to check' },
            },
            required: ['token'],
          },
        },

        // Database Viewer Tools
        {
          name: 'list_databases',
          description: 'List all available databases and their collections',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'query_database',
          description: 'Query documents from a database collection with filtering, sorting, and pagination',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID to filter results (optional)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              database: { 
                type: 'string', 
                enum: ['countly', 'countly_drill', 'countly_out', 'countly_fs'],
                description: 'Database name',
                default: 'countly'
              },
              collection: { type: 'string', description: 'Collection name to query' },
              filter: { type: 'string', description: 'MongoDB query filter as JSON string (optional)' },
              projection: { type: 'string', description: 'MongoDB projection as JSON string (optional)' },
              sort: { type: 'string', description: 'MongoDB sort criteria as JSON string (optional)' },
              limit: { type: 'number', description: 'Maximum number of documents to return (1-1000)', minimum: 1, maximum: 1000, default: 20 },
              skip: { type: 'number', description: 'Number of documents to skip for pagination', minimum: 0, default: 0 },
              search: { type: 'string', description: 'Search term for document IDs (optional)' },
            },
            required: ['collection'],
          },
        },
        {
          name: 'get_document',
          description: 'Get a specific document by ID from a collection',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID to filter results (optional)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              database: { 
                type: 'string', 
                enum: ['countly', 'countly_drill', 'countly_out', 'countly_fs'],
                description: 'Database name',
                default: 'countly'
              },
              collection: { type: 'string', description: 'Collection name' },
              document_id: { type: 'string', description: 'Document ID to retrieve' },
            },
            required: ['collection', 'document_id'],
          },
        },
        {
          name: 'aggregate_collection',
          description: 'Run MongoDB aggregation pipeline on a collection',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID to filter results (optional)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              database: { 
                type: 'string', 
                enum: ['countly', 'countly_drill', 'countly_out', 'countly_fs'],
                description: 'Database name',
                default: 'countly'
              },
              collection: { type: 'string', description: 'Collection name' },
              aggregation: { type: 'string', description: 'MongoDB aggregation pipeline as JSON string' },
            },
            required: ['collection', 'aggregation'],
          },
        },
        {
          name: 'get_collection_indexes',
          description: 'Get indexes for a specific collection',
          inputSchema: {
            type: 'object',
            properties: {
              database: { 
                type: 'string', 
                enum: ['countly', 'countly_drill', 'countly_out', 'countly_fs'],
                description: 'Database name',
                default: 'countly'
              },
              collection: { type: 'string', description: 'Collection name' },
            },
            required: ['collection'],
          },
        },
        {
          name: 'get_db_statistics',
          description: 'Get MongoDB statistics (mongotop and mongostat)',
          inputSchema: {
            type: 'object',
            properties: {
              stat_type: {
                type: 'string',
                enum: ['mongotop', 'mongostat'],
                description: 'Type of statistics to retrieve'
              },
            },
            required: ['stat_type'],
          },
        },
        // Crash Analytics Tools
        {
          name: 'resolve_crash',
          description: 'Mark a crash group as resolved',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              crash_id: { type: 'string', description: 'Crash ID to resolve' },
            },
            required: ['crash_id'],
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'unresolve_crash',
          description: 'Mark a crash group as unresolved',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              crash_id: { type: 'string', description: 'Crash ID to unresolve' },
            },
            required: ['crash_id'],
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'view_crash',
          description: 'Mark a crash group as viewed',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              crash_id: { type: 'string', description: 'Crash ID to view' },
            },
            required: ['crash_id'],
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'share_crash',
          description: 'Share crash data with external users',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              crash_id: { type: 'string', description: 'Crash ID to share' },
            },
            required: ['crash_id'],
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'unshare_crash',
          description: 'Stop sharing crash data',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              crash_id: { type: 'string', description: 'Crash ID to unshare' },
            },
            required: ['crash_id'],
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'hide_crash',
          description: 'Hide a crash group from view',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              crash_id: { type: 'string', description: 'Crash ID to hide' },
            },
            required: ['crash_id'],
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'show_crash',
          description: 'Show a hidden crash group',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              crash_id: { type: 'string', description: 'Crash ID to show' },
            },
            required: ['crash_id'],
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'add_crash_comment',
          description: 'Add a comment to a crash group',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              crash_id: { type: 'string', description: 'Crash ID to comment on' },
              comment: { type: 'string', description: 'Comment text to add' },
            },
            required: ['crash_id', 'comment'],
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'edit_crash_comment',
          description: 'Edit an existing comment on a crash group',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              crash_id: { type: 'string', description: 'Crash ID containing the comment' },
              comment_id: { type: 'string', description: 'ID of the comment to edit' },
              comment: { type: 'string', description: 'New comment text' },
            },
            required: ['crash_id', 'comment_id', 'comment'],
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
        {
          name: 'delete_crash_comment',
          description: 'Delete a comment from a crash group',
          inputSchema: {
            type: 'object',
            properties: {
              app_id: { type: 'string', description: 'Application ID (optional if app_name is provided)' },
              app_name: { type: 'string', description: 'Application name (alternative to app_id)' },
              crash_id: { type: 'string', description: 'Crash ID containing the comment' },
              comment_id: { type: 'string', description: 'ID of the comment to delete' },
            },
            required: ['crash_id', 'comment_id'],
            anyOf: [
              { required: ['app_id'] },
              { required: ['app_name'] }
            ],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();
      let success = false;

      try {
        let result;
        switch (name) {
          // OpenAI Required Tools for ChatGPT Connectors
          case 'search':
            result = await this.search(args);
            break;
          case 'fetch':
            result = await this.fetch(args);
            break;
          // App Management Tools
          case 'list_apps':
            result = await this.listApps(args);

            break;
          case 'get_app_by_name':
            result = await this.getAppByName(args);

            break;
          case 'create_app':
            result = await this.createApp(args);

            break;
          case 'update_app':
            result = await this.updateApp(args);

            break;
          case 'delete_app':
            result = await this.deleteApp(args);

            break;
          case 'reset_app':
            result = await this.resetApp(args);

            break;
          case 'update_app_plugins':
            result = await this.updateAppPlugins(args);

            break;
          case 'get_analytics_data':
            result = await this.getAnalyticsData(args);

            break;
          case 'get_dashboard_data':
            result = await this.getDashboardData(args);

            break;
          case 'get_session_data':
            result = await this.getSessionData(args);

            break;
          case 'get_user_data':
            result = await this.getUserData(args);

            break;
          case 'get_events_data':
            result = await this.getEventsData(args);

            break;
          case 'get_events_overview':
            result = await this.getEventsOverview(args);

            break;
          case 'get_top_events':
            result = await this.getTopEvents(args);

            break;
          case 'get_countries_data':
            result = await this.getCountriesData(args);

            break;
          case 'get_locations_data':
            result = await this.getLocationsData(args);

            break;
          case 'get_all_users':
            result = await this.getAllUsers(args);

            break;
          case 'create_app_user':
            result = await this.createAppUser(args);

            break;
          case 'delete_app_user':
            result = await this.deleteAppUser(args);

            break;
          case 'export_app_users':
            result = await this.exportAppUsers(args);

            break;
          case 'get_slipping_away_users':
            result = await this.getSlippingAwayUsers(args);

            break;
          case 'create_event':
            result = await this.createEvent(args);

            break;
          case 'create_event_definition':
            result = await this.createEventDefinition(args);

            break;
          case 'manage_events':
            result = await this.manageEvents(args);

            break;
          case 'create_alert':
            result = await this.createAlert(args);

            break;
          case 'delete_alert':
            result = await this.deleteAlert(args);

            break;
          case 'list_alerts':
            result = await this.listAlerts(args);

            break;
          case 'get_push_overview':
            result = await this.getPushOverview(args);

            break;
          case 'create_remote_config':
            result = await this.createRemoteConfig(args);

            break;
          case 'create_note':
            result = await this.createNote(args);

            break;
          case 'delete_note':
            result = await this.deleteNote(args);

            break;
          case 'list_tokens':
            result = await this.listTokens(args);

            break;
          case 'create_token':
            result = await this.createToken(args);

            break;
          case 'delete_token':
            result = await this.deleteToken(args);

            break;
          case 'check_token':
            result = await this.checkToken(args);

            break;
          case 'list_databases':
            result = await this.listDatabases(args);

            break;
          case 'query_database':
            result = await this.queryDatabase(args);

            break;
          case 'get_document':
            result = await this.getDocument(args);

            break;
          case 'aggregate_collection':
            result = await this.aggregateCollection(args);

            break;
          case 'get_collection_indexes':
            result = await this.getCollectionIndexes(args);

            break;
          case 'get_db_statistics':
            result = await this.getDbStatistics(args);

            break;
          // Crash Analytics Tools
          case 'resolve_crash':
            result = await this.resolveCrash(args);

            break;
          case 'unresolve_crash':
            result = await this.unresolveCrash(args);

            break;
          case 'view_crash':
            result = await this.viewCrash(args);

            break;
          case 'share_crash':
            result = await this.shareCrash(args);

            break;
          case 'unshare_crash':
            result = await this.unshareCrash(args);

            break;
          case 'hide_crash':
            result = await this.hideCrash(args);

            break;
          case 'show_crash':
            result = await this.showCrash(args);

            break;
          case 'add_crash_comment':
            result = await this.addCrashComment(args);

            break;
          case 'edit_crash_comment':
            result = await this.editCrashComment(args);

            break;
          case 'delete_crash_comment':
            result = await this.deleteCrashComment(args);

            break;
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
        
        success = true;
        return result;
      } catch (error) {
        // Track error with analytics
        if (this.analytics && error instanceof Error) {
          this.analytics.trackError(error, { tool_name: name, args });
        }
        
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      } finally {
        // Track tool usage analytics
        if (this.analytics) {
          const responseTime = Date.now() - startTime;
          this.analytics.trackToolUsage(name, args, success, responseTime);
        }
      }
    });
  }

  // Helper Methods
  private async getApps(): Promise<CountlyApp[]> {
    // Cache apps for 5 minutes
    const now = Date.now();
    if (this.appsCache.length > 0 && now < this.appsCacheExpiry) {
      return this.appsCache;
    }

    const params = {
      api_key: this.config.apiKey,
    };

    const response = await this.httpClient.get('/o/apps/mine', { params });
    
    if (response.data && Array.isArray(response.data)) {
      this.appsCache = response.data;
    } else if (response.data && response.data.admin_of) {
      this.appsCache = Object.values(response.data.admin_of) as CountlyApp[];
    } else if (response.data && response.data.apps) {
      this.appsCache = response.data.apps;
    } else {
      this.appsCache = [];
    }
    
    // Track app cache refresh
    if (this.analytics) {
      this.analytics.trackAppAnalyticsAccess('system', 'apps_list', this.appsCache.length);
    }
    
    this.appsCacheExpiry = now + (5 * 60 * 1000); // 5 minutes
    return this.appsCache;
  }

  private async resolveAppId(args: any): Promise<string> {
    if (args.app_id) {
      return args.app_id;
    }
    
    if (args.app_name) {
      const apps = await this.getApps();
      const app = apps.find(a => a.name.toLowerCase() === args.app_name.toLowerCase());
      if (!app) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `App with name "${args.app_name}" not found. Available apps: ${apps.map(a => a.name).join(', ')}`
        );
      }
      return app._id;
    }
    
    // If neither app_id nor app_name is provided, show available apps
    const apps = await this.getApps();
    throw new McpError(
      ErrorCode.InvalidParams,
      `Please specify which app to use. Available apps:\n${apps.map(app => `- ${app.name} (ID: ${app._id})`).join('\n')}\n\nUse either:\n- app_name: "App Name Here"\n- app_id: "app_id_here"`
    );
  }

  // App Management Methods
  private async listApps(_: any) {
    const apps = await this.getApps();
    
    return {
      content: [
        {
          type: 'text',
          text: `Available applications:\\n${apps.map(app => `- ${app.name} (ID: ${app._id})`).join('\\n')}`,
        },
      ],
    };
  }

  private async getAppByName(args: any) {
    const { app_name } = args;
    const apps = await this.getApps();
    const app = apps.find(a => a.name.toLowerCase() === app_name.toLowerCase());
    
    if (!app) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `App with name "${app_name}" not found. Available apps: ${apps.map(a => a.name).join(', ')}`
      );
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `App information:\\n${JSON.stringify(app, null, 2)}`,
        },
      ],
    };
  }

  private async createApp(args: any) {
    const { name, country, timezone, category } = args;
    
    const appData: any = { name };
    if (country) appData.country = country;
    if (timezone) appData.timezone = timezone;
    if (category) appData.category = category;
    
    const response = await this.httpClient.get('/i/apps/create', {
      params: {
        api_key: this.config.apiKey,
        args: JSON.stringify(appData),
      },
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `App created successfully:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async updateApp(args: any) {
    const { app_id, app_name, name, country, timezone, category } = args;
    const targetAppId = await this.resolveAppId({ app_id, app_name });
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (country) updateData.country = country;
    if (timezone) updateData.timezone = timezone;
    if (category) updateData.category = category;
    
    // Include app_id in the args for updates
    updateData.app_id = targetAppId;
    
    const response = await this.httpClient.get('/i/apps/update', {
      params: {
        api_key: this.config.apiKey,
        app_id: targetAppId,
        args: JSON.stringify(updateData),
      },
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `App updated successfully:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async deleteApp(args: any) {
    const { app_id, app_name } = args;
    const targetAppId = await this.resolveAppId({ app_id, app_name });
    
    const response = await this.httpClient.get('/i/apps/delete', {
      params: {
        api_key: this.config.apiKey,
        args: JSON.stringify({ app_id: targetAppId }),
      },
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `App deleted successfully:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async resetApp(args: any) {
    const { app_id, app_name } = args;
    const targetAppId = await this.resolveAppId({ app_id, app_name });
    
    const response = await this.httpClient.get('/i/apps/reset', {
      params: {
        api_key: this.config.apiKey,
        args: JSON.stringify({ app_id: targetAppId, period: 'reset' }),
      },
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `App reset successfully:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async updateAppPlugins(args: any) {
    const { app_id, app_name, plugins } = args;
    const targetAppId = await this.resolveAppId({ app_id, app_name });
    
    const response = await this.httpClient.get('/i/apps/update/plugins', {
      params: {
        api_key: this.config.apiKey,
        app_id: targetAppId,
        args: JSON.stringify({ plugins }),
      },
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `App plugins updated successfully:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  // Analytics Methods
  private async getAnalyticsData(args: any) {
    const app_id = await this.resolveAppId(args);
    const { method, period, event, segmentation } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      app_id,
      method,
    };
    
    if (period) params.period = period;
    if (event) params.event = event;
    if (segmentation) params.segmentation = segmentation;

    const response = await this.httpClient.get('/o', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Analytics data for ${method}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async getDashboardData(args: any) {
    const app_id = await this.resolveAppId(args);
    const { period } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      app_id,
    };
    
    if (period) params.period = period;

    const response = await this.httpClient.get('/o/analytics/dashboard', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Dashboard data for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async getSessionData(args: any) {
    const app_id = await this.resolveAppId(args);
    const { period } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      app_id,
    };
    
    if (period) params.period = period;

    const response = await this.httpClient.get('/o/analytics/sessions', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Session data for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async getUserData(args: any) {
    const app_id = await this.resolveAppId(args);
    const { period } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      app_id,
    };
    
    if (period) params.period = period;

    const response = await this.httpClient.get('/o/users', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `User data for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async getEventsData(args: any) {
    const app_id = await this.resolveAppId(args);
    const { period, event } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      app_id,
    };
    
    if (period) params.period = period;
    if (event) params.event = event;

    const response = await this.httpClient.get('/o/analytics/events', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Events data for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async getEventsOverview(args: any) {
    const app_id = await this.resolveAppId(args);
    const { period } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      app_id,
    };
    
    if (period) params.period = period;

    const response = await this.httpClient.get('/o/analytics/events/overview', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Events overview for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async getTopEvents(args: any) {
    const app_id = await this.resolveAppId(args);
    const { period, limit = 10 } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      app_id,
      limit,
    };
    
    if (period) params.period = period;

    const response = await this.httpClient.get('/o/analytics/events/top', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Top ${limit} events for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async getCountriesData(args: any) {
    const app_id = await this.resolveAppId(args);
    const { period } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      app_id,
    };
    
    if (period) params.period = period;

    const response = await this.httpClient.get('/o/countries', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Countries data for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async getLocationsData(args: any) {
    const app_id = await this.resolveAppId(args);
    const { period } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      app_id,
    };
    
    if (period) params.period = period;

    const response = await this.httpClient.get('/o/locations', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Locations data for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  // User Management Methods
  private async getAllUsers(_: any) {
    const params = {
      api_key: this.config.apiKey,
    };

    const response = await this.httpClient.get('/o/users/all', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `All users:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async createAppUser(args: any) {
    const app_id = await this.resolveAppId(args);
    const { user_data } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      user_data,
    };

    const response = await this.httpClient.post('/i/app_users/create', null, { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `User created for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async deleteAppUser(args: any) {
    const app_id = await this.resolveAppId(args);
    const { uid, force = false } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      uid,
      force,
    };

    const response = await this.httpClient.post('/i/app_users/delete', null, { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `User ${uid} deleted from app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async exportAppUsers(args: any) {
    const app_id = await this.resolveAppId(args);
    const { export_type = 'json' } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      export_type,
    };

    const response = await this.httpClient.get('/i/app_users/export', { params });
    
    // Track data export
    if (this.analytics) {
      const recordCount = response.data?.length || 0;
      this.analytics.trackDataExport('users', args.app_name || app_id, recordCount);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `Users export for app ${app_id} (${export_type}):\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  // User Retention Methods
  private async getSlippingAwayUsers(args: any) {
    const app_id = await this.resolveAppId(args);
    const { period = 7, limit = 50, skip = 0 } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      period,
      limit,
      skip,
    };

    const response = await this.httpClient.get('/o/slipping', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Slipping away users for app ${app_id} (${period} days):\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  // Event Management Methods
  private async createEvent(args: any) {
    const app_id = await this.resolveAppId(args);
    const { event_key, device_id = 'mcp_server', count = 1, sum, dur, segmentation } = args;
    
    // Get app key from app_id - we need this for the /i endpoint
    const apps = await this.getApps();
    const app = apps.find(a => a._id === app_id);
    if (!app) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `App with ID "${app_id}" not found`
      );
    }

    const eventData: any = {
      key: event_key,
      count,
    };
    
    if (sum !== undefined) eventData.sum = sum;
    if (dur !== undefined) eventData.dur = dur;
    if (segmentation) eventData.segmentation = segmentation;

    const requestBody = {
      events: [eventData]
    };

    const params = {
      app_key: app.key,
      device_id,
      timestamp: Date.now(),
    };

    const response = await this.httpClient.post('/i', requestBody, { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Event "${event_key}" recorded for app ${app.name}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async createEventDefinition(args: any) {
    const app_id = await this.resolveAppId(args);
    const { event_key, display_name, description } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      app_id,
      event_key,
    };
    
    if (display_name) params.display_name = display_name;
    if (description) params.description = description;

    const response = await this.httpClient.post('/i/events/create', null, { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Event definition created for "${event_key}" in app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async manageEvents(args: any) {
    const app_id = await this.resolveAppId(args);
    const { method, event_data } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      method,
      events: event_data,
    };

    const response = await this.httpClient.post('/i/events', null, { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Events managed for app ${app_id} (${method}):\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  // Alert Management Methods
  private async createAlert(args: any) {
    const app_id = await this.resolveAppId(args);
    const { alert_config } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      alert_config,
    };

    const response = await this.httpClient.get('/i/alert/save', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Alert created/updated for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async deleteAlert(args: any) {
    const app_id = await this.resolveAppId(args);
    const { alert_id } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      alert_id,
    };

    const response = await this.httpClient.get('/i/alert/delete', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Alert ${alert_id} deleted from app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async listAlerts(args: any) {
    const app_id = await this.resolveAppId(args);
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
    };

    const response = await this.httpClient.get('/o/alert/list', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Alerts for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  // Push Notifications Methods
  private async getPushOverview(args: any) {
    const app_id = await this.resolveAppId(args);
    const { period } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      app_id,
    };
    
    if (period) params.period = period;

    const response = await this.httpClient.get('/o/push/overview', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Push notifications overview for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  // Remote Config Methods
  private async createRemoteConfig(args: any) {
    const app_id = await this.resolveAppId(args);
    const { config_data } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      config_data,
    };

    const response = await this.httpClient.post('/i/remote-config/create', null, { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Remote config created for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  // Note Management Methods
  private async createNote(args: any) {
    const app_id = await this.resolveAppId(args);
    const { note_data } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      note_data,
    };

    const response = await this.httpClient.get('/i/notes/create', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Note created for app ${app_id}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async deleteNote(args: any) {
    const { note_id } = args;
    
    const params = {
      api_key: this.config.apiKey,
      note_id,
    };

    const response = await this.httpClient.get('/i/notes/delete', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Note ${note_id} deleted:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  // Token Management Methods
  private async listTokens(_: any) {
    const params = {
      api_key: this.config.apiKey,
    };

    const response = await this.httpClient.get('/o/token/list', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Available authentication tokens:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async createToken(args: any) {
    const { purpose, endpoint, ttl } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      purpose,
    };
    
    if (endpoint) params.endpoint = endpoint;
    if (ttl) params.ttl = ttl;

    const response = await this.httpClient.get('/i/token/create', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Token created for purpose "${purpose}":\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async deleteToken(args: any) {
    const { token_id } = args;
    
    const params = {
      api_key: this.config.apiKey,
      tokenid: token_id,
    };

    const response = await this.httpClient.get('/i/token/delete', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Token ${token_id} deleted:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async checkToken(args: any) {
    const { token } = args;
    
    const params = {
      api_key: this.config.apiKey,
      token,
    };

    const response = await this.httpClient.get('/o/token/check', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Token validity check:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  // Database Viewer Methods
  private async listDatabases(_: any) {
    const params = {
      api_key: this.config.apiKey,
    };

    const response = await this.httpClient.get('/o/db', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Available databases and collections:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async queryDatabase(args: any) {
    const { database = 'countly', collection, filter, projection, sort, limit = 20, skip = 0, search } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      db: database,
      collection,
      limit,
      skip,
    };

    // Add app_id if provided (either directly or resolved from app_name)
    if (args.app_id || args.app_name) {
      try {
        params.app_id = await this.resolveAppId(args);
      } catch (error) {
        // If app resolution fails, continue without app_id filter
      }
    }

    if (filter) params.filter = filter;
    if (projection) params.projection = projection;
    if (sort) params.sort = sort;
    if (search) params.sSearch = search;

    const response = await this.httpClient.get('/o/db', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Query results from ${database}.${collection}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async getDocument(args: any) {
    const { database = 'countly', collection, document_id } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      db: database,
      collection,
      document: document_id,
    };

    // Add app_id if provided (either directly or resolved from app_name)
    if (args.app_id || args.app_name) {
      try {
        params.app_id = await this.resolveAppId(args);
      } catch (error) {
        // If app resolution fails, continue without app_id filter
      }
    }

    const response = await this.httpClient.get('/o/db', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Document ${document_id} from ${database}.${collection}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async aggregateCollection(args: any) {
    const { database = 'countly', collection, aggregation } = args;
    
    const params: any = {
      api_key: this.config.apiKey,
      db: database,
      collection,
      aggregation,
    };

    // Add app_id if provided (either directly or resolved from app_name)
    if (args.app_id || args.app_name) {
      try {
        params.app_id = await this.resolveAppId(args);
      } catch (error) {
        // If app resolution fails, continue without app_id filter
      }
    }

    const response = await this.httpClient.get('/o/db', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Aggregation results from ${database}.${collection}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async getCollectionIndexes(args: any) {
    const { database = 'countly', collection } = args;
    
    const params = {
      api_key: this.config.apiKey,
      db: database,
      collection,
      action: 'get_indexes',
    };

    const response = await this.httpClient.get('/o/db', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Indexes for ${database}.${collection}:\\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async getDbStatistics(args: any) {
    const { stat_type } = args;
    
    const params = {
      api_key: this.config.apiKey,
    };

    const endpoint = stat_type === 'mongotop' ? '/o/db/mongotop' : '/o/db/mongostat';
    const response = await this.httpClient.get(endpoint, { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `MongoDB ${stat_type} statistics:\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  // Crash Analytics Methods
  private async resolveCrash(args: any) {
    const app_id = await this.resolveAppId(args);
    const { crash_id } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      args: JSON.stringify({ crash_id }),
    };

    const response = await this.httpClient.get('/i/crashes/resolve', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Crash ${crash_id} resolved successfully: ${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async unresolveCrash(args: any) {
    const app_id = await this.resolveAppId(args);
    const { crash_id } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      args: JSON.stringify({ crash_id }),
    };

    const response = await this.httpClient.get('/i/crashes/unresolve', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Crash ${crash_id} unresolved successfully: ${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async viewCrash(args: any) {
    const app_id = await this.resolveAppId(args);
    const { crash_id } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      args: JSON.stringify({ crash_id }),
    };

    const response = await this.httpClient.get('/i/crashes/view', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Crash ${crash_id} marked as viewed: ${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async shareCrash(args: any) {
    const app_id = await this.resolveAppId(args);
    const { crash_id } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      args: JSON.stringify({ crash_id }),
    };

    const response = await this.httpClient.get('/i/crashes/share', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Crash ${crash_id} shared successfully: ${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async unshareCrash(args: any) {
    const app_id = await this.resolveAppId(args);
    const { crash_id } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      args: JSON.stringify({ crash_id }),
    };

    const response = await this.httpClient.get('/i/crashes/unshare', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Crash ${crash_id} unshared successfully: ${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async hideCrash(args: any) {
    const app_id = await this.resolveAppId(args);
    const { crash_id } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      args: JSON.stringify({ crash_id }),
    };

    const response = await this.httpClient.get('/i/crashes/hide', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Crash ${crash_id} hidden successfully: ${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async showCrash(args: any) {
    const app_id = await this.resolveAppId(args);
    const { crash_id } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      args: JSON.stringify({ crash_id }),
    };

    const response = await this.httpClient.get('/i/crashes/show', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Crash ${crash_id} shown successfully: ${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async addCrashComment(args: any) {
    const app_id = await this.resolveAppId(args);
    const { crash_id, comment } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      args: JSON.stringify({ crash_id, comment }),
    };

    const response = await this.httpClient.get('/i/crashes/add_comment', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Comment added to crash ${crash_id}: ${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async editCrashComment(args: any) {
    const app_id = await this.resolveAppId(args);
    const { crash_id, comment_id, comment } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      args: JSON.stringify({ crash_id, comment_id, comment }),
    };

    const response = await this.httpClient.get('/i/crashes/edit_comment', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Comment ${comment_id} edited on crash ${crash_id}: ${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async deleteCrashComment(args: any) {
    const app_id = await this.resolveAppId(args);
    const { crash_id, comment_id } = args;
    
    const params = {
      api_key: this.config.apiKey,
      app_id,
      args: JSON.stringify({ crash_id, comment_id }),
    };

    const response = await this.httpClient.get('/i/crashes/delete_comment', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: `Comment ${comment_id} deleted from crash ${crash_id}: ${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  // OpenAI Required Tools for ChatGPT Connectors
  private async search(args: any) {
    const { query } = args;
    
    try {
      // Get all apps for context
      const apps = await this.getApps();
      
      // Search across different Countly data sources based on query
      const results: any[] = [];
      
      // Search in apps
      const appMatches = apps.filter(app => 
        app.name.toLowerCase().includes(query.toLowerCase()) ||
        app.key.toLowerCase().includes(query.toLowerCase()) ||
        (app.category && app.category.toLowerCase().includes(query.toLowerCase()))
      );
      
      appMatches.forEach(app => {
        results.push({
          id: `app:${app._id}`,
          title: `App: ${app.name}`,
          url: `${this.config.serverUrl}#/analytics/apps/${app._id}`
        });
      });
      
      // Search in analytics data for the first available app (if any)
      if (apps.length > 0) {
        const firstApp = apps[0];
        
        // Try to search events that might match the query
        try {
          const eventsResponse = await this.httpClient.get('/o', {
            params: {
              api_key: this.config.apiKey,
              app_id: firstApp._id,
              method: 'get_events'
            }
          });
          
          if (eventsResponse.data && eventsResponse.data.result) {
            const events = Object.keys(eventsResponse.data.result);
            const eventMatches = events.filter(event => 
              event.toLowerCase().includes(query.toLowerCase())
            );
            
            eventMatches.forEach(event => {
              results.push({
                id: `event:${firstApp._id}:${event}`,
                title: `Event: ${event} (${firstApp.name})`,
                url: `${this.config.serverUrl}#/analytics/events/${firstApp._id}`
              });
            });
          }
        } catch (error) {
          // Events search failed, continue with app results
          console.error('Events search failed:', error);
        }
      }
      
      // If no specific results found, provide general guidance
      if (results.length === 0) {
        results.push({
          id: `general:${Date.now()}`,
          title: `Countly Analytics Search: "${query}"`,
          url: `${this.config.serverUrl}#/analytics`
        });
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ results })
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async fetch(args: any) {
    const { id } = args;
    
    try {
      const [type, ...parts] = id.split(':');
      
      switch (type) {
        case 'app': {
          const appId = parts[0];
          const apps = await this.getApps();
          const app = apps.find(a => a._id === appId);
          
          if (!app) {
            throw new Error(`App with ID ${appId} not found`);
          }
          
          // Get comprehensive app data
          const dashboardData = await this.httpClient.get('/o', {
            params: {
              api_key: this.config.apiKey,
              app_id: appId,
              method: 'dashboard'
            }
          });
          
          const result = {
            id,
            title: `App: ${app.name}`,
            text: `Application Details:
Name: ${app.name}
Key: ${app.key}
Created: ${new Date(app.created_at * 1000).toISOString()}
Timezone: ${app.timezone}
Category: ${app.category || 'Not set'}

Dashboard Data:
${JSON.stringify(dashboardData.data, null, 2)}`,
            url: `${this.config.serverUrl}#/analytics/apps/${appId}`,
            metadata: {
              source: 'countly_apps',
              app_id: appId,
              app_name: app.name
            }
          };
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result)
              }
            ]
          };
        }
        
        case 'event': {
          const [appId, eventName] = parts;
          const apps = await this.getApps();
          const app = apps.find(a => a._id === appId);
          
          if (!app) {
            throw new Error(`App with ID ${appId} not found`);
          }
          
          // Get event data
          const eventData = await this.httpClient.get('/o', {
            params: {
              api_key: this.config.apiKey,
              app_id: appId,
              method: 'events',
              events: JSON.stringify([eventName])
            }
          });
          
          const result = {
            id,
            title: `Event: ${eventName} (${app.name})`,
            text: `Event Analysis:
Event Name: ${eventName}
App: ${app.name}
Data: ${JSON.stringify(eventData.data, null, 2)}`,
            url: `${this.config.serverUrl}#/analytics/events/${appId}`,
            metadata: {
              source: 'countly_events',
              app_id: appId,
              app_name: app.name,
              event_name: eventName
            }
          };
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result)
              }
            ]
          };
        }
        
        case 'general': {
          // General Countly information
          const apps = await this.getApps();
          
          const result = {
            id,
            title: 'Countly Analytics Platform Overview',
            text: `Countly Analytics Platform
Server: ${this.config.serverUrl}
Available Apps: ${apps.length}

Apps List:
${apps.map(app => `- ${app.name} (${app._id})`).join('\n')}

Available Analytics:
- Session Analytics
- User Analytics  
- Event Analytics
- Crash Analytics
- Push Notifications
- User Profiles
- Funnels and Cohorts
- Real-time Dashboard`,
            url: `${this.config.serverUrl}#/analytics`,
            metadata: {
              source: 'countly_overview',
              apps_count: apps.length
            }
          };
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result)
              }
            ]
          };
        }
        
        default:
          throw new Error(`Unknown document type: ${type}`);
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async run(transportType: 'stdio' | 'http' = 'stdio', httpConfig?: HttpConfig) {
    // Track transport type with analytics
    if (this.analytics) {
      this.analytics.setTransportType(transportType, httpConfig);
    }

    if (transportType === 'http') {
      const port = httpConfig?.port || 3101;
      const hostname = httpConfig?.hostname || 'localhost';
      const corsEnabled = httpConfig?.cors || true;
      
      // MCP server only responds to /mcp endpoint - other endpoints are available for other applications
      const mcpEndpoint = '/mcp';
      const mcpPingEndpoint = '/mcp/ping';
      
      console.error(`Starting Countly MCP server on HTTP at http://${hostname}:${port}${mcpEndpoint}`);
      console.error(`MCP server will ONLY handle requests to: ${mcpEndpoint} and ${mcpPingEndpoint}`);
      console.error(`Ping/health check available at: ${mcpPingEndpoint}`);
      console.error(`All other endpoints are available for other applications on this server`);
      
      const httpServer = http.createServer((req, res) => {
        // Handle CORS for MCP and health endpoints only
        if (corsEnabled) {
          const parsedUrl = url.parse(req.url || '', true);
          const pathname = parsedUrl.pathname;
          
          // Only set CORS headers for our endpoints
          if (pathname === mcpEndpoint || pathname === mcpPingEndpoint) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            
            if (req.method === 'OPTIONS') {
              res.writeHead(200);
              res.end();
              return;
            }
          }
        }
        
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;
        
        // MCP ping/health check endpoint - subpath under MCP namespace
        if (pathname === `${mcpEndpoint}/ping`) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'healthy', 
            service: 'countly-mcp-server',
            version: '1.0.0',
            mcp: {
              endpoint: mcpEndpoint,
              ping: `${mcpEndpoint}/ping`,
              protocol: 'Server-Sent Events'
            },
            timestamp: new Date().toISOString()
          }));
          return;
        }
        
        // MCP endpoint - ONLY endpoint that handles MCP protocol requests
        if (pathname === mcpEndpoint) {
          try {
            const transport = new SSEServerTransport(mcpEndpoint, res);
            this.server.connect(transport).catch((error) => {
              console.error('MCP transport connection error:', error);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'MCP connection failed' }));
              }
            });
          } catch (error) {
            console.error('MCP transport creation error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to create MCP transport' }));
          }
          return;
        }
        
        // All other endpoints - return 404 with clear message that this is MCP server only
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Not Found',
          message: 'This server only handles MCP protocol requests',
          availableEndpoints: {
            mcp: mcpEndpoint,
            ping: mcpPingEndpoint
          },
          info: 'Other endpoints on this server are available for other applications'
        }));
      });
      
      httpServer.listen(port, hostname, () => {
        console.error(`✅ Countly MCP server running on HTTP at http://${hostname}:${port}${mcpEndpoint}`);
        console.error(`✅ Ping/health check available at: http://${hostname}:${port}${mcpPingEndpoint}`);
        console.error(`ℹ️  Other endpoints (not ${mcpEndpoint} or ${mcpPingEndpoint}) are available for other applications`);
      });
      
      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.error('Received SIGTERM, shutting down gracefully...');
        httpServer.close(() => {
          console.error('HTTP server closed.');
          process.exit(0);
        });
      });
      
      process.on('SIGINT', () => {
        console.error('Received SIGINT, shutting down gracefully...');
        httpServer.close(() => {
          console.error('HTTP server closed.');
          process.exit(0);
        });
      });
      
    } else {
      // Default stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Countly MCP server running on stdio');
    }
  }

  // Getter for analytics (for testing purposes)
  getAnalyticsTracker() {
    return this.analytics;
  }
}

// Export the class for testing
export { CountlyMCPServer };

// Run the server only if this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new CountlyMCPServer();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const transportType = args.includes('--http') ? 'http' : 'stdio';

  if (transportType === 'http') {
    const portIndex = args.findIndex(arg => arg === '--port');
    const hostnameIndex = args.findIndex(arg => arg === '--hostname');
    const corsDisabled = args.includes('--no-cors');
    
    const httpConfig: HttpConfig = {
      port: portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1]) : 3101,
      hostname: hostnameIndex !== -1 && args[hostnameIndex + 1] ? args[hostnameIndex + 1] : 'localhost',
      cors: !corsDisabled
    };
    
    server.run('http', httpConfig).catch(console.error);
  } else {
    server.run().catch(console.error);
  }
}
