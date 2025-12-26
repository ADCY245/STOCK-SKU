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
    const categoryFilter = document.getElementById('category-filter').value;
    
    // Clear table
    tbody.innerHTML = '';
    
    // If no category selected, show message
    if (!categoryFilter) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">Please select a category to view products</td></tr>';
        return;
    }

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
        let stockQuantity, stockSize, stockQuantityUnit, stockSizeUnit;
        if (isBlanketPieces) {
            stockQuantity = stockLevel.toFixed(0); // Number of pieces
            stockQuantityUnit = 'pcs';
            const sqMtrPerPiece = product.dimensions?.sqMtrPerPiece || 0;
            stockSize = `${sqMtrPerPiece.toFixed(4)}`;
            stockSizeUnit = 'sq.mtr/pc';
        } else if (product.dimensions?.length && product.dimensions?.width && !isBlanketPieces) {
            // For rolls (check if has length and width dimensions but not blanket pieces)
            const lengthInMtr = product.dimensions?.lengthUnit === 'mm' ? 
                (product.dimensions?.length || 0) / 1000 : 
                (product.dimensions?.length || 0);
            const widthInMtr = product.dimensions?.widthUnit === 'mm' ? 
                (product.dimensions?.width || 0) / 1000 : 
                (product.dimensions?.width || 0);
            const calculatedSqMtr = lengthInMtr * widthInMtr;
            
            // For underpacking, stock quantity is width; for others, it's length
            if (product.category === 'underpacking') {
                stockQuantity = widthInMtr.toFixed(2); // Width in meters for underpacking
                stockQuantityUnit = 'mtr';
            } else {
                stockQuantity = lengthInMtr.toFixed(2); // Length in meters for other rolls
                stockQuantityUnit = 'mtr';
            }
            stockSize = `${calculatedSqMtr.toFixed(4)}`;
            stockSizeUnit = 'sq.mtr';
        } else {
            // Default case for other products - determine units based on category
            if (product.category === 'chemicals') {
                stockQuantity = stockLevel.toFixed(2);
                stockQuantityUnit = 'ltrs';
                stockSize = stockLevel.toFixed(2); // Show product stock instead of sq.mtr
                stockSizeUnit = 'ltrs';
            } else if (product.category === 'rules') {
                stockQuantity = stockLevel.toFixed(0);
                stockQuantityUnit = 'coils';
                stockSize = stockLevel.toFixed(0); // Show product stock instead of sq.mtr
                stockSizeUnit = 'coils';
            } else if (product.category === 'matrix') {
                stockQuantity = stockLevel.toFixed(0);
                stockQuantityUnit = 'pkts';
                stockSize = stockLevel.toFixed(0); // Show product stock instead of sq.mtr
                stockSizeUnit = 'pkts';
            } else if (product.category === 'litho perf') {
                stockQuantity = stockLevel.toFixed(0);
                stockQuantityUnit = 'pkts';
                stockSize = stockLevel.toFixed(0); // Show product stock instead of sq.mtr
                stockSizeUnit = 'pkts';
            } else {
                stockQuantity = stockLevel.toFixed(2);
                stockQuantityUnit = 'units';
                stockSize = '-';
                stockSizeUnit = '';
            }
        }
        
        // Get roll number from dimensions or detailed stock
        let rollNumber = product.dimensions?.rollNumber || 'N/A';
        
        // Create differentiated product name for display (with thickness in brackets)
        let displayName = product.name;
        if (product.dimensions?.thickness) {
            const thickness = product.dimensions.thicknessUnit === 'micron' ? 
                product.dimensions.thickness + 'μ' : 
                product.dimensions.thickness + 'mm';
            displayName += ` (${thickness})`;
        } else if (isBlanketPieces) {
            displayName += ' (Pieces)';
        }

        row.innerHTML = `
            <td>
                ${displayName}
                <button class="info-btn" onclick="showProductInfo('${product._id}')" title="More Info">
                    <i>i</i>
                </button>
            </td>
            <td>${product.category}</td>
            <td>${stockQuantity} <span style="color: #666; font-size: 0.9em;">[${stockQuantityUnit}]</span></td>
            <td>${stockSize} <span style="color: #666; font-size: 0.9em;">[${stockSizeUnit}]</span></td>
            <td>${rollNumber}</td>
            <td>${lastUpdated}</td>
            <td><span class="status ${statusClass}">${status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Show detailed product information
function showProductInfo(productId) {
    // Find the product from the current data
    const product = allProducts.find(p => p._id === productId);
    if (!product) return;
    
    // Create detailed information HTML
    const dimensions = product.dimensions || {};
    const info = `
        <div class="product-info-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${product.name}</h3>
                    <button class="close-btn" onclick="closeProductInfo()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="info-section">
                        <h4>Basic Information</h4>
                        <p><strong>Product Name:</strong> ${product.name}</p>
                        <p><strong>Category:</strong> ${product.category}</p>
                        <p><strong>Stock Level:</strong> ${product.stock}</p>
                        <p><strong>Last Updated:</strong> ${product.lastUpdated ? new Date(product.lastUpdated).toLocaleString() : 'Never'}</p>
                    </div>
                    
                    <div class="info-section">
                        <h4>Dimensions</h4>
                        ${dimensions.length ? `<p><strong>Length:</strong> ${dimensions.length} ${dimensions.lengthUnit || 'mm'}</p>` : ''}
                        ${dimensions.width ? `<p><strong>Width:</strong> ${dimensions.width} ${dimensions.widthUnit || 'mm'}</p>` : ''}
                        ${dimensions.thickness ? `<p><strong>Thickness:</strong> ${dimensions.thickness} ${dimensions.thicknessUnit || 'mm'}</p>` : ''}
                        ${dimensions.rollNumber ? `<p><strong>Roll Number:</strong> ${dimensions.rollNumber}</p>` : ''}
                        ${dimensions.stockType ? `<p><strong>Stock Type:</strong> ${dimensions.stockType}</p>` : ''}
                        ${dimensions.numberOfPieces ? `<p><strong>Number of Pieces:</strong> ${dimensions.numberOfPieces}</p>` : ''}
                        ${dimensions.sqMtrPerPiece ? `<p><strong>Sq.mtr per Piece:</strong> ${dimensions.sqMtrPerPiece.toFixed(4)}</p>` : ''}
                        ${dimensions.totalSqMtr ? `<p><strong>Total Sq.mtr:</strong> ${dimensions.totalSqMtr.toFixed(4)}</p>` : ''}
                    </div>
                    
                    <div class="info-section">
                        <h4>Stock Information</h4>
                        <p><strong>Current Stock:</strong> ${product.stock}</p>
                        <p><strong>Status:</strong> ${getStockStatus(product.stock, product.category === 'blankets' && dimensions.stockType === 'pieces')}</p>
                        <p><strong>Imported:</strong> ${product.imported ? 'Yes' : 'No'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create and show modal
    const modal = document.createElement('div');
    modal.innerHTML = info;
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    document.body.appendChild(modal);
}

// Close product info modal
function closeProductInfo() {
    const modal = document.querySelector('.product-info-modal');
    if (modal) {
        modal.remove();
    }
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
    
    // If no category selected, clear filtered products and display message
    if (!categoryFilter) {
        filteredProducts = [];
        displayProducts();
        return;
    }
    
    filteredProducts = allProducts.filter(product => {
        const matchesCategory = product.category === categoryFilter;
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
            let stockQuantity, stockSize, stockQuantityUnit, stockSizeUnit;
            if (isBlanketPieces) {
                stockQuantity = stockLevel.toFixed(0); // Number of pieces
                stockQuantityUnit = 'pcs';
                const sqMtrPerPiece = product.dimensions?.sqMtrPerPiece || 0;
                stockSize = `${sqMtrPerPiece.toFixed(4)} sq.mtr/pc (${stockLevel} pcs)`;
                stockSizeUnit = '';
            } else if (product.dimensions?.length && product.dimensions?.width && !isBlanketPieces) {
                // For rolls (check if has length and width dimensions but not blanket pieces)
                const lengthInMtr = product.dimensions?.lengthUnit === 'mm' ? 
                    (product.dimensions?.length || 0) / 1000 : 
                    (product.dimensions?.length || 0);
                const widthInMtr = product.dimensions?.widthUnit === 'mm' ? 
                    (product.dimensions?.width || 0) / 1000 : 
                    (product.dimensions?.width || 0);
                const calculatedSqMtr = lengthInMtr * widthInMtr;
                
                // For underpacking, stock quantity is width; for others, it's length
                if (product.category === 'underpacking') {
                    stockQuantity = widthInMtr.toFixed(2); // Width in meters for underpacking
                    stockQuantityUnit = 'mtr';
                } else {
                    stockQuantity = lengthInMtr.toFixed(2); // Length in meters for other rolls
                    stockQuantityUnit = 'mtr';
                }
                stockSize = `${calculatedSqMtr.toFixed(4)} sq.mtr`;
                stockSizeUnit = '';
            } else {
                // Default case for other products - determine units based on category
                if (product.category === 'chemicals') {
                    stockQuantity = stockLevel.toFixed(2);
                    stockQuantityUnit = 'ltrs';
                    stockSize = '-';
                    stockSizeUnit = '';
                } else if (product.category === 'rules') {
                    stockQuantity = stockLevel.toFixed(0);
                    stockQuantityUnit = 'coils';
                    stockSize = '-';
                    stockSizeUnit = '';
                } else if (product.category === 'matrix') {
                    stockQuantity = stockLevel.toFixed(0);
                    stockQuantityUnit = 'pkts';
                    stockSize = '-';
                    stockSizeUnit = '';
                } else if (product.category === 'litho perf') {
                    stockQuantity = stockLevel.toFixed(0);
                    stockQuantityUnit = 'pkts';
                    stockSize = '-';
                    stockSizeUnit = '';
                } else {
                    stockQuantity = stockLevel.toFixed(2);
                    stockQuantityUnit = 'units';
                    stockSize = '-';
                    stockSizeUnit = '';
                }
            }
            
            // Get roll number from dimensions
            let rollNumber = product.dimensions?.rollNumber || 'N/A';
            
            // Create differentiated product name for display (without roll number brackets)
            let displayName = product.name;
            if (product.dimensions?.stockType === 'roll' && product.dimensions?.length && product.dimensions?.width) {
                const length = product.dimensions.lengthUnit === 'mm' ? 
                    (product.dimensions.length / 1000).toFixed(2) + 'm' : 
                    product.dimensions.length + 'm';
                const width = product.dimensions.widthUnit === 'mm' ? 
                    (product.dimensions.width / 1000).toFixed(2) + 'm' : 
                    product.dimensions.width + 'm';
                displayName += ` (${length} x ${width})`;
            } else if (isBlanketPieces) {
                displayName += ' (Pieces)';
            }
            
            return [
                `"${displayName}"`,
                `"${product.category}"`,
                `"${stockQuantity} [${stockQuantityUnit}]"`,
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
