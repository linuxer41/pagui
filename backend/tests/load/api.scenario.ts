/**
 * k6 Load Test Scenario
 * Run: k6 run tests/load/api.scenario.ts
 *
 * Install: choco install k6 (Windows) or brew install k6 (macOS)
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const FAIL_RATE = new Rate('failed_requests')
const RESPONSE_TIME = new Trend('response_time')

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // ramp up
    { duration: '1m', target: 50 },   // steady
    { duration: '30s', target: 100 },  // spike
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    failed_requests: ['rate<0.05'],
    response_time: ['p(95)<500'],
    http_req_duration: ['p(99)<1000'],
  },
}

export default function () {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`)
    check(res, { 'health ok': (r) => r.status === 200 })
    FAIL_RATE.add(res.status !== 200)
    RESPONSE_TIME.add(res.timings.duration)
  })

  group('Auth endpoints', () => {
    const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: `user${__VU}@test.com`,
      password: 'test123',
    }), { headers: { 'Content-Type': 'application/json' } })
    check(res, { 'login handled': (r) => r.status !== 500 })
    FAIL_RATE.add(res.status >= 500)
  })

  sleep(1)

  group('Health API', () => {
    const res = http.get(`${BASE_URL}/health/api`)
    check(res, { 'db check handled': (r) => r.status !== 500 })
  })

  group('Public endpoints', () => {
    const endpoints = ['/health', '/health/readiness', '/health/liveness']
    for (const ep of endpoints) {
      const res = http.get(`${BASE_URL}${ep}`)
      check(res, { [`${ep} ok`]: (r) => r.status === 200 })
    }
  })

  sleep(0.5)
}
