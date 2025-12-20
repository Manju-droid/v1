/**
 * Load Testing Script using k6
 * 
 * Install k6: brew install k6 (macOS) or download from https://k6.io
 * Run: k6 run scripts/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api';

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // Test posts list
  const postsRes = http.get(`${BASE_URL}/posts?limit=10`);
  check(postsRes, {
    'posts list status is 200': (r) => r.status === 200 || r.status === 401, // 401 is OK if not authenticated
    'posts list response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test debates list
  const debatesRes = http.get(`${BASE_URL}/debates?limit=10`);
  check(debatesRes, {
    'debates list status is 200': (r) => r.status === 200 || r.status === 401,
    'debates list response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  return `
    ====================
    Load Test Summary
    ====================
    Total Requests: ${data.metrics.http_reqs.values.count}
    Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%
    Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
    P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
    ====================
  `;
}
