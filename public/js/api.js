// API base URL
const API_BASE = 'http://localhost:5000/api';

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    };

    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// API functions
const api = {
    // Products
    getProducts: () => apiCall('/products'),
    addProduct: (product) => apiCall('/products', {
        method: 'POST',
        body: JSON.stringify(product),
    }),

    // Stock
    addStock: (transaction) => apiCall('/stock/in', {
        method: 'POST',
        body: JSON.stringify(transaction),
    }),
    issueStock: (transaction) => apiCall('/stock/out', {
        method: 'POST',
        body: JSON.stringify(transaction),
    }),
    getStock: () => apiCall('/stock'),

    // Reports
    getReport: () => apiCall('/reports'),
};
