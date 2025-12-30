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
function formatDimension(value, decimals = 2) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (Number.isNaN(num)) {
        return 'N/A';
    }
    return num.toFixed(decimals);
}

function formatDetailLabel(key) {
    if (!key) return '';
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase())
        .trim();
}

function formatDetailValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    }
    return String(value);
}

function buildProductDetailsString(product) {
    const dimensions = product?.dimensions || {};
    const entries = Object.entries(dimensions)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => `${formatDetailLabel(key)}: ${formatDetailValue(value)}`);
    return entries.length ? entries.join(' | ') : 'N/A';
}

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
                const chemicalUnit = product.dimensions?.chemicalUnit || 'ltrs';
                const productFormatRaw = product.dimensions?.productFormat;
                const productFormatValue = parseFloat(productFormatRaw);

                // Stock quantity is number of containers (total stock divided by container size)
                if (productFormatValue && productFormatValue > 0) {
                    const containerCount = stockLevel / productFormatValue;
                    stockQuantity = containerCount.toFixed(containerCount % 1 === 0 ? 0 : 2);
                } else {
                    stockQuantity = stockLevel.toFixed(2);
                }
                stockQuantityUnit = 'containers';

                // Stock size shows total volume
                stockSize = stockLevel.toFixed(2);
                stockSizeUnit = chemicalUnit;
            } else if (product.category === 'rules') {
                stockQuantity = stockLevel.toFixed(0);
                stockQuantityUnit = '';

                const containerLength = product.dimensions?.ruleContainerLength;
                const containerWidth = product.dimensions?.ruleContainerWidth;
                const containerType = product.dimensions?.ruleContainerType;

                if (containerLength != null && containerWidth != null && containerType) {
                    const lengthDisplay = formatDimension(containerLength);
                    const widthDisplay = formatDimension(containerWidth);
                    stockSize = `${lengthDisplay} x ${widthDisplay} x ${containerType}`;
                } else {
                    stockSize = 'N/A';
                }
                stockSizeUnit = '';
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
                stockSize = stockLevel.toFixed(2); // Show product stock instead of sq.mtr
                stockSizeUnit = 'units';
            }
        }
        
        // Get product-specific details info
        let detailsInfo;
        if (product.category === 'litho perf') {
            const pieceType = product.dimensions?.lithoPieceType || 'N/A';
            const perforationType = product.dimensions?.perforationType || 'N/A';
            detailsInfo = `${pieceType} / ${perforationType}`;
        } else if (product.category === 'matrix') {
            const width = product.dimensions?.matrixSizeWidth || 'N/A';
            const height = product.dimensions?.matrixSizeHeight || 'N/A';
            // Format to preserve decimal places
            const formattedWidth = width !== 'N/A' ? parseFloat(width).toFixed(1) : width;
            const formattedHeight = height !== 'N/A' ? parseFloat(height).toFixed(1) : height;
            detailsInfo = `${formattedWidth} x ${formattedHeight}`;
        } else if (product.category === 'chemicals') {
            const productFormat = product.dimensions?.productFormat || 'N/A';
            const chemicalUnit = product.dimensions?.chemicalUnit || 'ltrs';
            detailsInfo = `${productFormat} ${chemicalUnit} container format`;
        } else if (product.category === 'rules') {
            const rawFormat = product.dimensions?.ruleFormat || 'N/A';
            const packedAs = product.dimensions?.rulePackedAs || 'N/A';
            const formatLabelRaw = rawFormat.replace(/\s*rule$/i, '').trim();
            const formatLabel = formatLabelRaw ? formatLabelRaw.toLowerCase() : rawFormat.toLowerCase();
            const packedLabel = packedAs ? packedAs.toLowerCase() : 'n/a';
            detailsInfo = `${formatLabel || 'n/a'} - ${packedLabel}`;
        } else {
            detailsInfo = product.dimensions?.rollNumber || 'N/A';
        }
        
        // Create differentiated product name for display (with thickness in brackets)
        let displayName = product.name;
        if (product.category === 'matrix') {
            const width = product.dimensions?.matrixSizeWidth || 'N/A';
            const height = product.dimensions?.matrixSizeHeight || 'N/A';
            // Format to preserve decimal places
            const formattedWidth = width !== 'N/A' ? parseFloat(width).toFixed(1) : width;
            const formattedHeight = height !== 'N/A' ? parseFloat(height).toFixed(1) : height;
            const thickness = product.dimensions?.thickness;
            if (thickness) {
                const thicknessUnit = product.dimensions.thicknessUnit === 'micron' ? 
                    thickness + 'μ' : thickness + 'mm';
                displayName += ` (${formattedWidth} x ${formattedHeight}, ${thicknessUnit})`;
            } else {
                displayName += ` (${formattedWidth} x ${formattedHeight})`;
            }
        } else if (product.dimensions?.thickness) {
            const thickness = product.dimensions.thicknessUnit === 'micron' ? 
                product.dimensions.thickness + 'μ' : 
                product.dimensions.thickness + 'mm';
            displayName += ` (${thickness})`;
        } else if (isBlanketPieces) {
            displayName += ' (Pieces)';
        }

        const quantityUnitDisplay = stockQuantityUnit ? ` <span style="color: #666; font-size: 0.9em;">[${stockQuantityUnit}]</span>` : '';
        const sizeUnitDisplay = stockSizeUnit ? ` <span style="color: #666; font-size: 0.9em;">[${stockSizeUnit}]</span>` : '';

        row.innerHTML = `
            <td>
                ${displayName}
                <button class="info-btn" onclick="showProductInfo('${product._id}')" title="More Info">
                    <i>i</i>
                </button>
            </td>
            <td>${product.category}</td>
            <td>${stockQuantity}${quantityUnitDisplay}</td>
            <td>${stockSize}${sizeUnitDisplay}</td>
            <td>${detailsInfo}</td>
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
                        
                        <!-- Product-specific details -->
                        ${product.category === 'litho perf' ? `
                            <p><strong>Piece Type:</strong> ${dimensions.lithoPieceType || 'N/A'}</p>
                            <p><strong>Perforation Type:</strong> ${dimensions.perforationType || 'N/A'}</p>
                            ${dimensions.productTPI ? `<p><strong>TPI:</strong> ${dimensions.productTPI}</p>` : ''}
                        ` : ''}
                        ${product.category === 'matrix' ? `
                            <p><strong>Format:</strong> ${dimensions.matrixFormat || 'N/A'}</p>
                            <p><strong>Size:</strong> ${dimensions.matrixSizeWidth || 'N/A'} x ${dimensions.matrixSizeHeight || 'N/A'}</p>
                            <p><strong>Stock Unit:</strong> ${dimensions.stockUnit || 'N/A'}</p>
                        ` : ''}
                        ${product.category === 'rules' ? `
                            <p><strong>Format:</strong> ${dimensions.ruleFormat || 'N/A'}</p>
                            <p><strong>Packed As:</strong> ${dimensions.rulePackedAs || 'N/A'}</p>
                            <p><strong>Stock Unit:</strong> ${dimensions.stockUnit || 'N/A'}</p>
                            ${(dimensions.ruleContainerLength != null && dimensions.ruleContainerWidth != null) ? `<p><strong>Container Size:</strong> ${formatDimension(dimensions.ruleContainerLength)} x ${formatDimension(dimensions.ruleContainerWidth)} x ${dimensions.ruleContainerType || 'N/A'}</p>` : ''}
                        ` : ''}
                        ${product.category === 'chemicals' ? `
                            <p><strong>Format:</strong> ${dimensions.productFormat || 'N/A'}</p>
                            <p><strong>Unit:</strong> ${dimensions.chemicalUnit || 'N/A'}</p>
                        ` : ''}
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
    modal.classList.add('product-info-overlay');
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
    const modal = document.querySelector('.product-info-overlay');
    if (modal) {
        modal.remove();
    }
}

// Close modal when clicking outside the modal content
document.addEventListener('click', (e) => {
    const modalOverlay = document.querySelector('.product-info-overlay');
    if (modalOverlay && e.target === modalOverlay) {
        modalOverlay.remove();
    }
});

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
    const importedFilter = document.getElementById('imported-filter').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    // If no category selected, clear filtered products and display message
    if (!categoryFilter) {
        filteredProducts = [];
        displayProducts();
        return;
    }
    
    filteredProducts = allProducts.filter(product => {
        const matchesCategory = product.category === categoryFilter;
        const matchesImported = !importedFilter || 
            (importedFilter === 'true' && product.imported) ||
            (importedFilter === 'false' && !product.imported);
        const matchesSearch = !searchTerm || 
            product.name.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesImported && matchesSearch;
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
    if (!allProducts.length) {
        alert('No products loaded to export');
        return;
    }

    const includeAllData = confirm('Do you want to export ALL product data? Click Cancel to export only what is currently shown.');
    const dataToExport = includeAllData ? allProducts : filteredProducts;

    if (!dataToExport.length) {
        alert('No products to export with the current view.');
        return;
    }

    // Group products by category
    const productsByCategory = {};
    dataToExport.forEach(product => {
        if (!productsByCategory[product.category]) {
            productsByCategory[product.category] = [];
        }
        productsByCategory[product.category].push(product);
    });

    // Collect all possible dimension keys across all products
    const allDimensionKeys = new Set();
    dataToExport.forEach(product => {
        if (product.dimensions) {
            Object.keys(product.dimensions).forEach(key => allDimensionKeys.add(key));
        }
    });

    // Create headers - use consistent column names across all categories
    const baseHeaders = ['Product Name', 'Category', 'Stock Quantity', 'Stock Size', 'Last Updated', 'Status'];
    
    // Define consistent dimension headers for all categories
    const consistentDimensionHeaders = [
        'Stock Type',
        'Length',
        'Length Unit',
        'Width',
        'Width Unit',
        'Thickness',
        'Thickness Unit',
        'Roll Number',
        'Number Of Pieces',
        'Sq Mtr Per Piece',
        'Total Sq Mtr',
        'Litho Piece Type',
        'Perforation Type',
        'Product TPI',
        'Matrix Format',
        'Matrix Size Width',
        'Matrix Size Height',
        'Stock Unit',
        'Rule Format',
        'Rule Packed As',
        'Rule Container Length',
        'Rule Container Width',
        'Rule Container Type',
        'Product Format',
        'Chemical Unit',
        'Import Date',
        'Taken Date'
    ];
    
    // Only include headers that actually exist in the data
    const dimensionHeaders = consistentDimensionHeaders.filter(header => {
        const normalizedHeader = header.toLowerCase().replace(/ /g, '');
        return Array.from(allDimensionKeys).some(key => 
            formatDetailLabel(key).toLowerCase().replace(/ /g, '') === normalizedHeader
        );
    });
    
    const headers = [...baseHeaders, ...dimensionHeaders];

    // Create CSV content with category grouping
    const csvRows = [headers.join(',')];
    
    Object.keys(productsByCategory).sort().forEach(category => {
        const products = productsByCategory[category];
        
        // Add category header with spacing
        csvRows.push(''); // Empty row before category
        csvRows.push(`"${category.toUpperCase()} - ${products.length} PRODUCTS"`);
        csvRows.push(''); // Empty row after category header
        
        // Add products for this category
        products.forEach(product => {
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
                stockQuantity = stockLevel.toFixed(0);
                stockQuantityUnit = 'pcs';
                const sqMtrPerPiece = product.dimensions?.sqMtrPerPiece || 0;
                stockSize = `${sqMtrPerPiece.toFixed(4)} sq.mtr/pc (${stockLevel} pcs)`;
                stockSizeUnit = '';
            } else if (product.dimensions?.length && product.dimensions?.width && !isBlanketPieces) {
                const lengthInMtr = product.dimensions?.lengthUnit === 'mm' ? 
                    (product.dimensions?.length || 0) / 1000 : 
                    (product.dimensions?.length || 0);
                const widthInMtr = product.dimensions?.widthUnit === 'mm' ? 
                    (product.dimensions?.width || 0) / 1000 : 
                    (product.dimensions?.width || 0);
                const calculatedSqMtr = lengthInMtr * widthInMtr;
                
                if (product.category === 'underpacking') {
                    stockQuantity = widthInMtr.toFixed(2);
                    stockQuantityUnit = 'mtr';
                    stockSize = `${calculatedSqMtr.toFixed(4)} sq.mtr`;
                    stockSizeUnit = '';
                } else if (product.category === 'blankets') {
                    stockQuantity = lengthInMtr.toFixed(2);
                    stockQuantityUnit = 'mtr';
                    stockSize = `${calculatedSqMtr.toFixed(4)} sq.mtr`;
                    stockSizeUnit = '';
                } else {
                    stockQuantity = stockLevel.toFixed(2);
                    stockQuantityUnit = 'units';
                    stockSize = stockLevel.toFixed(2);
                    stockSizeUnit = 'units';
                }
            } else {
                if (product.category === 'chemicals') {
                    const chemicalUnit = product.dimensions?.chemicalUnit || 'ltrs';
                    stockQuantity = stockLevel.toFixed(2);
                    stockQuantityUnit = chemicalUnit;
                    stockSize = stockLevel.toFixed(2);
                    stockSizeUnit = chemicalUnit;
                } else if (product.category === 'rules') {
                    stockQuantity = stockLevel.toFixed(0);
                    stockQuantityUnit = product.dimensions?.stockUnit || '';
                    const containerLength = product.dimensions?.ruleContainerLength;
                    const containerWidth = product.dimensions?.ruleContainerWidth;
                    const containerType = product.dimensions?.ruleContainerType;
                    if (containerLength != null && containerWidth != null && containerType) {
                        const lengthDisplay = formatDimension(containerLength);
                        const widthDisplay = formatDimension(containerWidth);
                        stockSize = `${lengthDisplay} x ${widthDisplay} x ${containerType}`;
                        stockSizeUnit = '';
                    } else {
                        stockSize = stockLevel.toFixed(0);
                        stockSizeUnit = product.dimensions?.stockUnit || '';
                    }
                } else if (product.category === 'matrix') {
                    stockQuantity = stockLevel.toFixed(0);
                    stockQuantityUnit = 'pkts';
                    stockSize = stockLevel.toFixed(0);
                    stockSizeUnit = 'pkts';
                } else if (product.category === 'litho perf') {
                    stockQuantity = stockLevel.toFixed(0);
                    stockQuantityUnit = 'pkts';
                    stockSize = stockLevel.toFixed(0);
                    stockSizeUnit = 'pkts';
                } else {
                    stockQuantity = stockLevel.toFixed(2);
                    stockQuantityUnit = 'units';
                    stockSize = stockLevel.toFixed(2);
                    stockSizeUnit = 'units';
                }
            }

            const quantityDisplay = stockQuantityUnit ? `${stockQuantity} [${stockQuantityUnit}]` : `${stockQuantity}`;
            const sizeDisplay = stockSizeUnit ? `${stockSize} [${stockSizeUnit}]` : `${stockSize}`;
            
            // Create differentiated product name
            let displayName = product.name;
            if (product.category === 'matrix') {
                const width = product.dimensions?.matrixSizeWidth || 'N/A';
                const height = product.dimensions?.matrixSizeHeight || 'N/A';
                const formattedWidth = width !== 'N/A' ? parseFloat(width).toFixed(1) : width;
                const formattedHeight = height !== 'N/A' ? parseFloat(height).toFixed(1) : height;
                const thickness = product.dimensions?.thickness;
                if (thickness) {
                    const thicknessUnit = product.dimensions.thicknessUnit === 'micron' ? 
                        thickness + 'μ' : thickness + 'mm';
                    displayName += ` (${formattedWidth} x ${formattedHeight}, ${thicknessUnit})`;
                } else {
                    displayName += ` (${formattedWidth} x ${formattedHeight})`;
                }
            } else if (product.dimensions?.thickness) {
                const thickness = product.dimensions.thicknessUnit === 'micron' ? 
                    product.dimensions.thickness + 'μ' : 
                    product.dimensions.thickness + 'mm';
                displayName += ` (${thickness})`;
            } else if (isBlanketPieces) {
                displayName += ' (Pieces)';
            }

            // Create row with dimension values
            const baseValues = [
                `"${displayName}"`,
                `"${product.category}"`,
                `"${quantityDisplay}"`,
                `"${sizeDisplay}"`,
                `"${lastUpdated}"`,
                `"${status}"`
            ];

            // Add dimension values in the same order as headers
            const dimensionValues = dimensionHeaders.map(header => {
                const normalizedHeader = header.toLowerCase().replace(/ /g, '');
                const actualKey = Array.from(allDimensionKeys).find(k => 
                    formatDetailLabel(k).toLowerCase().replace(/ /g, '') === normalizedHeader
                );
                const value = actualKey ? product.dimensions?.[actualKey] : '';
                return `"${formatDetailValue(value)}"`;
            });

            csvRows.push([...baseValues, ...dimensionValues].join(','));
        });
        
        // Add spacing after each category (except last)
        csvRows.push('');
    });

    const csvContent = csvRows.join('\n');

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
