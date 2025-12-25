// Global variables
let allProducts = [];
let filteredProducts = [];

// Load products on page load
document.addEventListener('DOMContentLoaded', loadProducts);

// Load and display products
async function loadProducts() {
    try {
        allProducts = await api.getProducts();
        filteredProducts = [...allProducts];
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Display products in table
function displayProducts() {
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '';

    filteredProducts.forEach(product => {
        const row = document.createElement('tr');
        const stockLevel = product.stock || 0;
        const isBlanketPieces = product.category === 'blankets' && 
                              product.dimensions && 
                              product.dimensions.numberOfPieces;
        const status = getStockStatus(stockLevel, isBlanketPieces);
        const statusClass = getStatusClass(status);
        const lastUpdated = product.lastUpdated ? 
            new Date(product.lastUpdated).toLocaleDateString() : 'Never';

        // Display stock based on type
        let stockDisplay;
        if (isBlanketPieces) {
            stockDisplay = `${stockLevel.toFixed(0)} pieces`;
        } else {
            stockDisplay = `${stockLevel.toFixed(2)} sq.mtr`;
        }

        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${stockDisplay}</td>
            <td>${lastUpdated}</td>
            <td><span class="status ${statusClass}">${status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Get stock status text
function getStockStatus(stock, isBlanketPieces = false) {
    if (isBlanketPieces) {
        // Different thresholds for blanket pieces
        if (stock === 0) return 'Out of Stock';
        if (stock < 3) return 'Low Stock';
        if (stock < 10) return 'Medium Stock';
        return 'In Stock';
    } else {
        // Original thresholds for sq.mtr
        if (stock === 0) return 'Out of Stock';
        if (stock < 10) return 'Low Stock';
        if (stock < 50) return 'Medium Stock';
        return 'In Stock';
    }
}

// Get status CSS class
function getStatusClass(status) {
    switch(status) {
        case 'Out of Stock': return 'out-of-stock';
        case 'Low Stock': return 'low-stock';
        case 'Medium Stock': return 'medium-stock';
        case 'In Stock': return 'in-stock';
        default: return '';
    }
}

// Filter products by category
function filterProducts() {
    const categoryFilter = document.getElementById('category-filter').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    filteredProducts = allProducts.filter(product => {
        const matchesCategory = !categoryFilter || product.category === categoryFilter;
        const matchesSearch = !searchTerm || 
            product.name.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });
    
    sortProducts();
}

// Search products
function searchProducts() {
    filterProducts();
}

// Sort products
function sortProducts() {
    const sortBy = document.getElementById('sort-by').value;
    const sortOrder = document.getElementById('sort-order').value;
    
    filteredProducts.sort((a, b) => {
        let aVal, bVal;
        
        switch(sortBy) {
            case 'name':
                aVal = a.name.toLowerCase();
                bVal = b.name.toLowerCase();
                break;
            case 'category':
                aVal = a.category.toLowerCase();
                bVal = b.category.toLowerCase();
                break;
            case 'stock':
                aVal = a.stock || 0;
                bVal = b.stock || 0;
                break;
            case 'lastUpdated':
                aVal = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0);
                bVal = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0);
                break;
            default:
                return 0;
        }
        
        if (sortOrder === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });
    
    displayProducts();
}

// Export current filtered products to Excel
function exportToExcel() {
    if (filteredProducts.length === 0) {
        alert('No products to export');
        return;
    }

    // Create CSV content
    const headers = ['Product Name', 'Category', 'Current Stock', 'Last Updated', 'Status'];
    const csvContent = [
        headers.join(','),
        ...filteredProducts.map(product => {
            const stockLevel = product.stock || 0;
            const isBlanketPieces = product.category === 'blankets' && 
                                  product.dimensions && 
                                  product.dimensions.numberOfPieces;
            const status = getStockStatus(stockLevel, isBlanketPieces);
            const lastUpdated = product.lastUpdated ? 
                new Date(product.lastUpdated).toLocaleDateString() : 'Never';
            
            // Display stock based on type
            let stockDisplay;
            if (isBlanketPieces) {
                stockDisplay = `${stockLevel.toFixed(0)} pieces`;
            } else {
                stockDisplay = `${stockLevel.toFixed(2)} sq.mtr`;
            }
            
            return [
                `"${product.name}"`,
                `"${product.category}"`,
                `"${stockDisplay}"`,
                `"${lastUpdated}"`,
                `"${status}"`
            ].join(',');
        })
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
