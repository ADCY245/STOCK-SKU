// Load products for stock forms
async function loadProductsForStock() {
    try {
        const products = await api.getProducts();
        const productSelect = document.getElementById('product');
        if (productSelect) {
            productSelect.innerHTML = '<option value="">Select Product</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product._id;
                option.textContent = `${product.name} (${product.category})`;
                productSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Load product names based on product type (no longer needed for text input)
function loadProductNames() {
    // Function kept for compatibility but no longer needed since we use text input
    updateRollNumberRequirement();
}

// Update roll number requirement based on product type and stock type
function updateRollNumberRequirement() {
    const productType = document.getElementById('product-type').value;
    const stockType = document.getElementById('stock-type').value;
    const rollNumberRow = document.getElementById('roll-number-row');
    const rollNumberInput = document.getElementById('roll-number');
    
    // Roll number is required only for blankets with roll stock type
    if (productType === 'blankets' && stockType === 'roll') {
        rollNumberInput.required = true;
        rollNumberRow.style.display = 'flex';
    } else if (productType === 'blankets' && stockType === 'pieces') {
        // For blankets with cut pieces, hide roll number
        rollNumberInput.required = false;
        rollNumberInput.value = '';
        rollNumberRow.style.display = 'none';
    } else if (productType && productType !== 'blankets') {
        // For non-blanket products, make roll number optional
        rollNumberInput.required = false;
        rollNumberRow.style.display = 'flex';
    } else {
        // No selection yet
        rollNumberInput.required = false;
        rollNumberRow.style.display = 'flex';
    }
}

// Calculate square meters from length and width with unit conversion
function calculateSqMtr() {
    const length = parseFloat(document.getElementById('length').value) || 0;
    const width = parseFloat(document.getElementById('width').value) || 0;
    const lengthUnit = document.getElementById('length-unit').value;
    const widthUnit = document.getElementById('width-unit').value;
    
    // Convert everything to meters first
    let lengthInMtr, widthInMtr;
    
    // Convert length to meters
    if (lengthUnit === 'mm') {
        lengthInMtr = length / 1000; // mm to mtr
    } else {
        lengthInMtr = length; // already in mtr
    }
    
    // Convert width to meters
    if (widthUnit === 'mm') {
        widthInMtr = width / 1000; // mm to mtr
    } else {
        widthInMtr = width; // already in mtr
    }
    
    // Calculate square meters
    const sqMtr = lengthInMtr * widthInMtr;
    document.getElementById('sq-mtr').value = sqMtr.toFixed(2);
}

// Toggle between roll and pieces fields
function toggleStockType() {
    const stockType = document.getElementById('stock-type').value;
    const rollFields = document.getElementById('roll-fields');
    const piecesFields = document.getElementById('pieces-fields');
    const lengthInput = document.getElementById('length');
    const widthInput = document.getElementById('width');
    const lengthUnit = document.getElementById('length-unit');
    const widthUnit = document.getElementById('width-unit');
    
    if (stockType === 'roll') {
        rollFields.style.display = 'block';
        piecesFields.style.display = 'none';
        // Make dimensions required for roll calculation
        lengthInput.required = true;
        widthInput.required = true;
        lengthUnit.required = true;
        widthUnit.required = true;
    } else if (stockType === 'pieces') {
        rollFields.style.display = 'none';
        piecesFields.style.display = 'block';
        // Make dimensions optional for pieces
        lengthInput.required = false;
        widthInput.required = false;
        lengthUnit.required = false;
        widthUnit.required = false;
        // Clear sq.mtr when switching to pieces
        document.getElementById('sq-mtr').value = '';
    } else {
        rollFields.style.display = 'none';
        piecesFields.style.display = 'none';
        lengthInput.required = false;
        widthInput.required = false;
        lengthUnit.required = false;
        widthUnit.required = false;
    }
    
    // Update roll number requirement
    updateRollNumberRequirement();
}

// Download Excel template
function downloadTemplate() {
    // Create CSV template with proper headers
    const headers = [
        'productType',
        'productName', 
        'stockType',
        'length',
        'width',
        'thickness',
        'rollNumber',
        'numberOfPieces',
        'sqMtr',
        'importDate',
        'takenDate'
    ];
    
    // Create sample data row with comments
    const sampleRow = [
        'blankets',                    // Product type: blankets, litho perf, underpacking, rules, matrix, chemicals, film, plate, ink, other
        'Sample Blanket Product',      // Product name (text, can be long)
        'roll',                        // Stock type: roll OR pieces
        '1000',                        // Length (number, required for roll)
        '500',                         // Width (number, required for roll)
        '2.5',                         // Thickness (number, required)
        'ROLL001',                     // Roll number (text, required for blanket rolls, optional for others)
        '',                            // Number of pieces (number, required for pieces, leave blank for roll)
        '50.00',                       // Sq.mtr (number, required for roll, leave blank for pieces)
        '2024-12-25',                  // Import date (YYYY-MM-DD format, optional)
        '2024-12-25'                   // Taken date (YYYY-MM-DD format, optional)
    ];
    
    const csvContent = [
        headers.join(','),
        sampleRow.join(',')
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'stock_import_template.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Handle Excel file upload
async function uploadExcel() {
    const fileInput = document.getElementById('excel-file');
    const statusElement = document.getElementById('upload-status');
    
    if (!fileInput.files.length) {
        statusElement.textContent = 'Please select a file first';
        statusElement.style.color = 'red';
        return;
    }
    
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('excel-file', file);
    
    try {
        statusElement.textContent = 'Uploading...';
        statusElement.style.color = 'blue';
        
        const response = await fetch('/api/stock/upload-excel', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            statusElement.textContent = `Successfully uploaded ${result.count} records`;
            statusElement.style.color = 'green';
            fileInput.value = '';
        } else {
            const error = await response.json();
            statusElement.textContent = 'Upload failed: ' + error.error;
            statusElement.style.color = 'red';
        }
    } catch (error) {
        statusElement.textContent = 'Upload failed: ' + error.message;
        statusElement.style.color = 'red';
    }
}

// Handle stock in form (new version)
if (document.getElementById('stock-in-form')) {
    document.getElementById('stock-in-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const stockType = document.getElementById('stock-type').value;
        
        const formData = {
            productType: document.getElementById('product-type').value,
            productName: document.getElementById('product-name').value,
            stockType: stockType,
            length: stockType === 'roll' ? parseFloat(document.getElementById('length').value) : null,
            width: stockType === 'roll' ? parseFloat(document.getElementById('width').value) : null,
            thickness: parseFloat(document.getElementById('thickness').value),
            lengthUnit: stockType === 'roll' ? document.getElementById('length-unit').value : null,
            widthUnit: stockType === 'roll' ? document.getElementById('width-unit').value : null,
            thicknessUnit: document.getElementById('thickness-unit').value,
            rollNumber: document.getElementById('roll-number').value,
            numberOfPieces: stockType === 'pieces' ? parseInt(document.getElementById('number-of-pieces').value) : null,
            sqMtr: stockType === 'roll' ? parseFloat(document.getElementById('sq-mtr').value) : null,
            importDate: document.getElementById('import-date').value || null,
            takenDate: document.getElementById('taken-date').value || null
        };

        try {
            const response = await fetch('/api/stock/in/detailed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                document.getElementById('stock-in-form').reset();
                document.getElementById('sq-mtr').value = '';
                alert('Stock added successfully');
            } else if (response.status === 409 && result.error === 'DUPLICATE_ROLL') {
                // Handle duplicate roll
                handleDuplicateRoll(result, formData);
            } else {
                alert('Error adding stock: ' + result.error);
            }
        } catch (error) {
            alert('Error adding stock: ' + error.message);
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        loadProductsForStock();
        // Import date is now blank by default
    });
}

// Handle duplicate roll detection
async function handleDuplicateRoll(errorResponse, formData) {
    const existing = errorResponse.existingProduct;
    const message = errorResponse.message;
    
    // Show confirmation dialog
    const isDuplicate = confirm(
        `${message}\n\n` +
        `Existing Roll:\n` +
        `Roll Number: ${existing.rollNumber}\n` +
        `Length: ${existing.length}\n` +
        `Width: ${existing.width}\n` +
        `Import Date: ${existing.importDate}\n\n` +
        `Is this a duplicate?\n\n` +
        `Click OK if this IS a duplicate (entry will be discarded)\n` +
        `Click CANCEL if this is NOT a duplicate (will ask for import date)`
    );
    
    if (isDuplicate) {
        // User confirmed it's a duplicate - discard the entry
        alert('Duplicate entry discarded');
        document.getElementById('stock-in-form').reset();
        document.getElementById('sq-mtr').value = '';
    } else {
        // User says it's not a duplicate - ask for import date
        const importDate = prompt('Please enter import date (YYYY-MM-DD) to differentiate this entry:');
        
        if (!importDate) {
            alert('Import date is required for separate entry');
            return;
        }
        
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(importDate)) {
            alert('Invalid date format. Please use YYYY-MM-DD');
            return;
        }
        
        try {
            // Add with import date
            const response = await fetch('/api/stock/in/detailed/confirm-duplicate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'add_with_date',
                    rollData: {
                        ...formData,
                        importDate: importDate
                    }
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert(`Stock added successfully as: ${result.uniqueName}`);
                document.getElementById('stock-in-form').reset();
                document.getElementById('sq-mtr').value = '';
                // Reload products to show the new entry
                loadProductsForStock();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Error adding stock: ' + error.message);
        }
    }
}

// Handle stock out form (existing version)
if (document.getElementById('stock-out-form')) {
    document.getElementById('stock-out-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const productId = document.getElementById('product').value;
        const quantity = parseInt(document.getElementById('quantity').value);

        try {
            await api.issueStock({ productId, quantity, type: 'out' });
            document.getElementById('stock-out-form').reset();
            alert('Stock issued successfully');
        } catch (error) {
            alert('Error issuing stock: ' + error.message);
        }
    });

    document.addEventListener('DOMContentLoaded', loadProductsForStock);
}
