import Countly from 'countly-sdk-nodejs';
import crypto from 'crypto';
import os from 'os';

interface MCPAnalyticsConfig {
  serverUrl: string;
  appKey: string;
  enabled: boolean;
  deviceId?: string;
}

interface ToolUsageMetrics {
  tool_name: string;
  success: boolean;
  response_time: number;
  has_app_id: boolean;
  arg_count: number;
  error_type?: string;
  transport_type: 'stdio' | 'http';
}

interface ConnectionMetrics {
  action: 'connect' | 'disconnect' | 'error';
  transport_type: 'stdio' | 'http';
  hostname?: string;
  port?: number;
}

interface ServerMetrics {
  node_version: string;
  platform: string;
  arch: string;
  memory_usage: number;
  uptime: number;
  transport_type: 'stdio' | 'http';
  http_port?: number;
  http_hostname?: string;
}

export class MCPAnalyticsTracker {
  private config: MCPAnalyticsConfig;
  private sessionStartTime: number;
  private toolCallCount: number = 0;
  private errorCount: number = 0;
  private transportType: 'stdio' | 'http' = 'stdio';

  constructor(config: MCPAnalyticsConfig) {
    this.config = config;
    this.sessionStartTime = Date.now();

    if (!config.enabled) {
      return;
    }

    // Initialize Countly SDK
    Countly.init({
      app_key: config.appKey,
      url: config.serverUrl,
      device_id: config.deviceId || this.generateDeviceId(),
      debug: process.env.MCP_ANALYTICS_DEBUG === 'true',
      interval: 5000, // Send data every 5 seconds
      max_events: 100 // Maximum events to queue
    });

    // Set user details
    this.setUserDetails();

    // Track session start
    this.trackSessionStart();

    // Set up periodic metrics
    this.setupPeriodicMetrics();

    // Handle graceful shutdown
    this.setupGracefulShutdown();
  }

  private generateDeviceId(): string {
    // Generate a consistent device ID based on machine characteristics
    const machineInfo = `${os.hostname()}-${os.platform()}-${os.arch()}`;
    return crypto.createHash('sha256').update(machineInfo).digest('hex').substring(0, 16);
  }

  private setUserDetails(): void {
    if (!this.config.enabled) return;

    Countly.user_details({
      name: `MCP Server (${os.hostname()})`,
      custom: {
        node_version: process.version,
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        server_type: 'countly-mcp-server',
        version: '1.0.0'
      }
    });
  }

  private trackSessionStart(): void {
    if (!this.config.enabled) return;

    const startMetrics: ServerMetrics = {
      node_version: process.version,
      platform: os.platform(),
      arch: os.arch(),
      memory_usage: process.memoryUsage().heapUsed,
      uptime: process.uptime(),
      transport_type: this.transportType
    };

    Countly.add_event({
      key: 'mcp_server_start',
      count: 1,
      segmentation: startMetrics
    });

    // Begin session
    Countly.begin_session();
  }

  setTransportType(type: 'stdio' | 'http', options?: { hostname?: string; port?: number }): void {
    this.transportType = type;
    
    if (!this.config.enabled) return;

    const connectionMetrics: ConnectionMetrics = {
      action: 'connect',
      transport_type: type,
      hostname: options?.hostname,
      port: options?.port
    };

    Countly.add_event({
      key: 'mcp_transport_initialized',
      count: 1,
      segmentation: connectionMetrics
    });
  }

  trackToolUsage(toolName: string, args: any, success: boolean, responseTime: number, error?: Error): void {
    if (!this.config.enabled) return;

    this.toolCallCount++;
    if (!success) this.errorCount++;

    const metrics: ToolUsageMetrics = {
      tool_name: toolName,
      success,
      response_time: responseTime,
      has_app_id: !!(args?.app_id || args?.app_name),
      arg_count: args ? Object.keys(args).length : 0,
      transport_type: this.transportType
    };

    if (error) {
      metrics.error_type = error.constructor.name;
    }

    // Track the tool usage event
    Countly.add_event({
      key: 'mcp_tool_used',
      count: 1,
      dur: responseTime,
      segmentation: metrics
    });

    // Track performance metrics
    if (responseTime > 5000) { // Slow requests (>5s)
      Countly.add_event({
        key: 'mcp_slow_request',
        count: 1,
        dur: responseTime,
        segmentation: {
          tool_name: toolName,
          response_time: responseTime,
          transport_type: this.transportType
        }
      });
    }

    // Track specific Countly feature usage
    this.trackCountlyFeatureUsage(toolName, args);
  }

  private trackCountlyFeatureUsage(toolName: string, args: any): void {
    // Map MCP tools to Countly features
    const featureMap: Record<string, string> = {
      'get_analytics_data': 'analytics',
      'get_dashboard_data': 'analytics',
      'get_session_data': 'analytics',
      'get_events_data': 'events',
      'create_event': 'events',
      'get_push_overview': 'push',
      'resolve_crash': 'crashes',
      'add_crash_comment': 'crashes',
      'create_app_user': 'users',
      'delete_app_user': 'users',
      'create_app': 'apps',
      'delete_app': 'apps',
      'query_database': 'database',
      'list_databases': 'database'
    };

    const feature = featureMap[toolName];
    if (feature) {
      Countly.add_event({
        key: 'countly_feature_used',
        count: 1,
        segmentation: {
          feature,
          tool_name: toolName,
          has_app_context: !!(args?.app_id || args?.app_name),
          transport_type: this.transportType
        }
      });
    }
  }

  trackError(error: Error, context: any = {}): void {
    if (!this.config.enabled) return;

    this.errorCount++;

    Countly.add_event({
      key: 'mcp_error',
      count: 1,
      segmentation: {
        error_name: error.constructor.name,
        error_message: error.message.substring(0, 200), // Limit message length
        context_type: context.tool_name || 'general',
        transport_type: this.transportType,
        stack_trace: error.stack ? 'yes' : 'no'
      }
    });

    // Log crash for severe errors
    if (error.name === 'McpError' || error.message.includes('ECONNREFUSED')) {
      Countly.log_error(error, {
        _custom: {
          transport_type: this.transportType,
          context: JSON.stringify(context)
        }
      });
    }
  }

  trackConnection(action: 'connect' | 'disconnect' | 'error', details: any = {}): void {
    if (!this.config.enabled) return;

    const connectionMetrics: ConnectionMetrics = {
      action,
      transport_type: this.transportType,
      ...details
    };

    Countly.add_event({
      key: 'mcp_connection',
      count: 1,
      segmentation: connectionMetrics
    });
  }

  private setupPeriodicMetrics(): void {
    if (!this.config.enabled) return;

    // Send periodic server health metrics every 60 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      Countly.add_event({
        key: 'mcp_server_health',
        count: 1,
        segmentation: {
          memory_heap_used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          memory_heap_total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          memory_rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          cpu_user_microseconds: cpuUsage.user,
          cpu_system_microseconds: cpuUsage.system,
          uptime_seconds: Math.round(process.uptime()),
          session_duration: Math.round((Date.now() - this.sessionStartTime) / 1000),
          tool_calls_total: this.toolCallCount,
          errors_total: this.errorCount,
          transport_type: this.transportType
        }
      });
    }, 60000); // Every 60 seconds
  }

  private setupGracefulShutdown(): void {
    if (!this.config.enabled) return;

    const shutdown = () => {
      const sessionDuration = Math.round((Date.now() - this.sessionStartTime) / 1000);
      
      Countly.add_event({
        key: 'mcp_server_shutdown',
        count: 1,
        segmentation: {
          session_duration_seconds: sessionDuration,
          total_tool_calls: this.toolCallCount,
          total_errors: this.errorCount,
          transport_type: this.transportType,
          graceful: true
        }
      });

      // End session and flush data
      Countly.end_session();
      
      // Give time for data to be sent
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  // Manual session management for long-running servers
  extendSession(): void {
    if (!this.config.enabled) return;
    Countly.session_duration(60); // Extend by 60 seconds
  }

  // Track custom business metrics
  trackAppAnalyticsAccess(appName: string, dataType: string, recordCount?: number): void {
    if (!this.config.enabled) return;

    Countly.add_event({
      key: 'countly_app_data_access',
      count: 1,
      segmentation: {
        app_name: appName,
        data_type: dataType, // 'sessions', 'events', 'users', etc.
        record_count: recordCount || 0,
        transport_type: this.transportType
      }
    });
  }

  // Track data export activities
  trackDataExport(exportType: string, appName?: string, recordCount?: number): void {
    if (!this.config.enabled) return;

    Countly.add_event({
      key: 'countly_data_export',
      count: 1,
      segmentation: {
        export_type: exportType, // 'users', 'events', 'crashes'
        app_name: appName || 'unknown',
        record_count: recordCount || 0,
        transport_type: this.transportType
      }
    });
  }

  // Get current session metrics (for debugging)
  getSessionMetrics() {
    return {
      sessionDuration: Math.round((Date.now() - this.sessionStartTime) / 1000),
      toolCallCount: this.toolCallCount,
      errorCount: this.errorCount,
      transportType: this.transportType,
      enabled: this.config.enabled
    };
  }
}
