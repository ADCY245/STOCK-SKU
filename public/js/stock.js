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
        
        const formData = {
            productType: document.getElementById('product-type').value,
            productName: document.getElementById('product-name').value,
            length: parseFloat(document.getElementById('length').value),
            width: parseFloat(document.getElementById('width').value),
            thickness: parseFloat(document.getElementById('thickness').value),
            lengthUnit: document.getElementById('length-unit').value,
            widthUnit: document.getElementById('width-unit').value,
            thicknessUnit: document.getElementById('thickness-unit').value,
            rollNumber: document.getElementById('roll-number').value,
            importDate: document.getElementById('import-date').value || null,
            takenDate: document.getElementById('taken-date').value || null,
            sqMtr: parseFloat(document.getElementById('sq-mtr').value)
        };

        try {
            await api.addStockDetailed(formData);
            document.getElementById('stock-in-form').reset();
            document.getElementById('sq-mtr').value = '';
            alert('Stock added successfully');
        } catch (error) {
            alert('Error adding stock: ' + error.message);
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        loadProductsForStock();
        // Import date is now blank by default
    });
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
