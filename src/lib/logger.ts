type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  operation?: string;
  message: string;
  error?: {
    code?: string;
    message: string;
    stack?: string;
  };
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private isDevelopment = import.meta.env.DEV;

  private generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    options?: {
      component?: string;
      operation?: string;
      error?: Error | any;
      context?: Record<string, any>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
    }
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      correlationId: options?.correlationId || this.generateCorrelationId(),
      userId: options?.userId,
      sessionId: options?.sessionId,
      component: options?.component,
      operation: options?.operation,
      message,
      context: options?.context,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
    };

    if (options?.error) {
      entry.error = {
        code: options.error.code || options.error.name,
        message: options.error.message,
        stack: this.isDevelopment ? options.error.stack : undefined,
      };
    }

    return entry;
  }

  private storeLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private consoleLog(entry: LogEntry) {
    const logMethod = {
      DEBUG: console.debug,
      INFO: console.info,
      WARN: console.warn,
      ERROR: console.error,
    }[entry.level];

    logMethod(
      `[${entry.level}] ${entry.component ? `[${entry.component}]` : ''} ${entry.operation ? `[${entry.operation}]` : ''} ${entry.message}`,
      {
        ...entry,
        context: entry.context,
        error: entry.error,
      }
    );
  }

  debug(message: string, options?: Partial<LogEntry>) {
    const entry = this.createLogEntry('DEBUG', message, options);
    this.storeLog(entry);
    if (this.isDevelopment) {
      this.consoleLog(entry);
    }
  }

  info(message: string, options?: Partial<LogEntry>) {
    const entry = this.createLogEntry('INFO', message, options);
    this.storeLog(entry);
    this.consoleLog(entry);
  }

  warn(message: string, options?: Partial<LogEntry>) {
    const entry = this.createLogEntry('WARN', message, options);
    this.storeLog(entry);
    this.consoleLog(entry);
  }

  error(message: string, options?: Partial<LogEntry>) {
    const entry = this.createLogEntry('ERROR', message, options);
    this.storeLog(entry);
    this.consoleLog(entry);
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs() {
    this.logs = [];
  }

  // Helper method to create a scoped logger for a component
  forComponent(component: string) {
    return {
      debug: (message: string, options?: Partial<LogEntry>) =>
        this.debug(message, { ...options, component }),
      info: (message: string, options?: Partial<LogEntry>) =>
        this.info(message, { ...options, component }),
      warn: (message: string, options?: Partial<LogEntry>) =>
        this.warn(message, { ...options, component }),
      error: (message: string, options?: Partial<LogEntry>) =>
        this.error(message, { ...options, component }),
    };
  }
}

export const logger = new Logger();
export type { LogEntry, LogLevel };
