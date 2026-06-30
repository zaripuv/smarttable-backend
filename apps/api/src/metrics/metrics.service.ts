import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly orderCounter: promClient.Counter;
  private readonly paymentCounter: promClient.Counter;
  private readonly httpRequestDuration: promClient.Histogram;
  private readonly activeConnections: promClient.Gauge;

  constructor() {
    promClient.collectDefaultMetrics();

    this.orderCounter = new promClient.Counter({
      name: 'smarttable_orders_total',
      help: 'Total number of orders',
      labelNames: ['restaurant_id', 'status'],
    });

    this.paymentCounter = new promClient.Counter({
      name: 'smarttable_payments_total',
      help: 'Total number of payments',
      labelNames: ['restaurant_id', 'method', 'status'],
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: 'smarttable_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    });

    this.activeConnections = new promClient.Gauge({
      name: 'smarttable_active_ws_connections',
      help: 'Number of active WebSocket connections',
    });
  }

  recordOrder(restaurantId: number, status: string) {
    this.orderCounter.inc({ restaurant_id: String(restaurantId), status });
  }

  recordPayment(restaurantId: number, method: string, status: string) {
    this.paymentCounter.inc({
      restaurant_id: String(restaurantId),
      method,
      status,
    });
  }

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration.observe({ method, route, status_code: String(statusCode) }, duration);
  }

  incrementConnections() {
    this.activeConnections.inc();
  }

  decrementConnections() {
    this.activeConnections.dec();
  }

  async getMetrics(): Promise<string> {
    return promClient.register.metrics();
  }

  getContentType(): string {
    return promClient.register.contentType;
  }
}
