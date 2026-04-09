const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";
const LOGIN_EMAIL = process.env.LOGIN_EMAIL ?? "julian@vance.corp";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD ?? "banking123";

async function login() {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    });

    if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data?.token) {
        throw new Error("Login response did not include token.");
    }

    return data.token;
}

async function fetchAccounts(token) {
    const response = await fetch(`${API_BASE_URL}/api/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        throw new Error(`Fetching accounts failed with status ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data?.accounts) ? data.accounts : [];
}

async function fetchRecentTransactions(token) {
    const response = await fetch(`${API_BASE_URL}/api/transactions?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        throw new Error(`Fetching transactions failed with status ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data?.items) ? data.items : [];
}

async function main() {
    const token = await login();
    const [accounts, transactions] = await Promise.all([
        fetchAccounts(token),
        fetchRecentTransactions(token),
    ]);

    const negativeBalances = accounts.filter((account) => Number(account.balance) < 0);
    const failedTransactions = transactions.filter((tx) => tx.status === "failed");

    console.log("=== Load Test Consistency Check ===");
    console.log(`Accounts checked: ${accounts.length}`);
    console.log(`Negative balances: ${negativeBalances.length}`);
    console.log(`Recent failed transactions (expected under contention): ${failedTransactions.length}`);

    if (negativeBalances.length > 0) {
        console.error("Inconsistency detected: negative balances found.");
        for (const account of negativeBalances) {
            console.error(`- ${account.accountId}: ${account.balance}`);
        }
        process.exit(1);
    }

    console.log("Consistency check passed: no negative balances found.");
}

main().catch((error) => {
    console.error("Consistency check failed:", error.message);
    process.exit(1);
});
