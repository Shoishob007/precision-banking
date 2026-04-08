import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    scenarios: {
        concurrent_transactions: {
            executor: 'constant-vus',
            vus: 1000,
            duration: '10s'
        }
    },
    thresholds: {
        http_req_failed: ['rate<0.05'],
        http_req_duration: ['p(95)<1500']
    }
};

const API_BASE_URL = __ENV.API_BASE_URL ?? 'http://localhost:4000';
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL ?? 'julian@vance.corp';
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD ?? 'banking123';
const ACCOUNT_ID = __ENV.ACCOUNT_ID ?? 'ACC1001';
const AMOUNT = Number(__ENV.AMOUNT ?? '1');

function login() {
    const response = http.post(
        `${API_BASE_URL}/api/auth/login`,
        JSON.stringify({
            email: LOGIN_EMAIL,
            password: LOGIN_PASSWORD
        }),
        {
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );

    check(response, {
        'login succeeded': (res) => res.status === 200,
        'login returned token': (res) => Boolean(res.json('token'))
    });

    return response.json('token');
}

export default function () {
    const token = login();

    const response = http.post(
        `${API_BASE_URL}/api/transactions`,
        JSON.stringify({
            type: 'deposit',
            accountId: ACCOUNT_ID,
            amount: AMOUNT,
            metadata: {
                source: 'k6-load-test'
            }
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        }
    );

    check(response, {
        'transaction accepted': (res) => res.status === 201 || res.status === 409,
        'response is json': (res) => res.headers['Content-Type']?.includes('application/json') ?? false
    });

    sleep(1);
}
