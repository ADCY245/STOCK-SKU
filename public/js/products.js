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

        // Determine stock quantity and size based on type
        let stockQuantity, stockSize;
        if (isBlanketPieces) {
            stockQuantity = stockLevel.toFixed(0); // Number of pieces
            const sqMtrPerPiece = product.dimensions?.sqMtrPerPiece || 0;
            const totalSqMtr = product.dimensions?.totalSqMtr || (stockLevel * sqMtrPerPiece);
            stockSize = `${totalSqMtr.toFixed(2)} sq.mtr`;
        } else if (product.dimensions?.stockType === 'roll') {
            // For rolls, quantity is length in meters, size is sq.mtr
            const lengthInMtr = product.dimensions?.lengthUnit === 'mm' ? 
                (product.dimensions?.length || 0) / 1000 : 
                (product.dimensions?.length || 0);
            stockQuantity = lengthInMtr.toFixed(2); // Length in meters
            stockSize = `${stockLevel.toFixed(2)} sq.mtr`;
        } else {
            // Default case for other products
            stockQuantity = stockLevel.toFixed(2);
            stockSize = 'sq.mtr';
        }
        
        // Get roll number from dimensions or detailed stock
        const rollNumber = product.dimensions?.rollNumber || 'N/A';

        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${stockQuantity}</td>
            <td>${stockSize}</td>
            <td>${rollNumber}</td>
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
    const headers = ['Product Name', 'Category', 'Stock Quantity', 'Stock Size', 'Roll Number', 'Last Updated', 'Status'];
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
            
            // Determine stock quantity and size based on type
            let stockQuantity, stockSize;
            if (isBlanketPieces) {
                stockQuantity = stockLevel.toFixed(0); // Number of pieces
                const sqMtrPerPiece = product.dimensions?.sqMtrPerPiece || 0;
                const totalSqMtr = product.dimensions?.totalSqMtr || (stockLevel * sqMtrPerPiece);
                stockSize = `${totalSqMtr.toFixed(2)} sq.mtr`;
            } else if (product.dimensions?.stockType === 'roll') {
                // For rolls, quantity is length in meters, size is sq.mtr
                const lengthInMtr = product.dimensions?.lengthUnit === 'mm' ? 
                    (product.dimensions?.length || 0) / 1000 : 
                    (product.dimensions?.length || 0);
                stockQuantity = lengthInMtr.toFixed(2); // Length in meters
                stockSize = `${stockLevel.toFixed(2)} sq.mtr`;
            } else {
                // Default case for other products
                stockQuantity = stockLevel.toFixed(2);
                stockSize = 'sq.mtr';
            }
            
            // Get roll number from dimensions
            const rollNumber = product.dimensions?.rollNumber || 'N/A';
            
            return [
                `"${product.name}"`,
                `"${product.category}"`,
                `"${stockQuantity}"`,
                `"${stockSize}"`,
                `"${rollNumber}"`,
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
