// Load companies on page load
document.addEventListener('DOMContentLoaded', loadCompanies);

// Load companies from database
async function loadCompanies() {
    try {
        const companies = await api.getCompanies();
        const companySelect = document.getElementById('company-select');
        
        // Clear existing options except "Add New Company"
        const addNewOption = companySelect.querySelector('option[value="new"]');
        companySelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Company';
        companySelect.appendChild(defaultOption);
        
        // Add companies from database
        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company.code;
            option.textContent = `${company.name} (${company.short_form})`;
            companySelect.appendChild(option);
        });
        
        // Add "Add New Company" option back
        companySelect.appendChild(addNewOption);
        
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

function handleCompanySelect() {
    const select = document.getElementById('company-select');
    const newCompanyInput = document.getElementById('new-company');
    const shortformLabel = document.getElementById('company-shortform-label');
    const shortformInput = document.getElementById('company-shortform');
    const numericEl = document.getElementById('company-numeric');

    if (select.value === 'new') {
        newCompanyInput.style.display = 'block';
        shortformLabel.style.display = 'block';
        shortformInput.style.display = 'block';
        numericEl.style.display = 'block';
        newCompanyInput.value = '';
        shortformInput.value = '';
        numericEl.textContent = '';
        shortformInput.disabled = false;
    } else if (select.value) {
        // Hide new company inputs
        newCompanyInput.style.display = 'none';
        shortformLabel.style.display = 'none';
        shortformInput.style.display = 'none';
        shortformInput.disabled = true;
        
        // Show company info from database
        showCompanyInfo(select.value);
    } else {
        // No selection
        newCompanyInput.style.display = 'none';
        shortformLabel.style.display = 'none';
        shortformInput.style.display = 'none';
        numericEl.style.display = 'none';
        shortformInput.disabled = false;
    }
}

async function showCompanyInfo(companyCode) {
    try {
        const companies = await api.getCompanies();
        const company = companies.find(c => c.code === companyCode);
        
        if (company) {
            const numericEl = document.getElementById('company-numeric');
            numericEl.style.display = 'block';
            numericEl.textContent = `Company: ${company.name} (${company.short_form})`;
        }
    } catch (error) {
        console.error('Error showing company info:', error);
    }
}

const generateShortform = (type) => {
    const nameInput = document.getElementById(type === 'company' ? 'new-company' : 'brand-name');
    const shortformInput = document.getElementById(type === 'company' ? 'company-shortform' : 'brand-shortform');
    const name = nameInput.value.trim();
    if (name && shortformInput.style.display !== 'none') {
        const shortform = name.substring(0, 2).toUpperCase();
        shortformInput.value = shortform;
    }
};

const checkDimensionsAndToggleBarring = () => {
    const thickness = document.getElementById('thickness').value;
    const length = document.getElementById('length').value;
    const width = document.getElementById('width').value;
    const barringSelect = document.getElementById('barring');
    
    if (thickness && length && width) {
        barringSelect.disabled = false;
    } else {
        barringSelect.disabled = true;
        barringSelect.value = '';
        document.getElementById('bar-number-label').style.display = 'none';
        document.getElementById('bar-number').style.display = 'none';
    }
};

function handleBarring() {
    const barringSelect = document.getElementById('barring');
    const barNumberLabel = document.getElementById('bar-number-label');
    const barNumberInput = document.getElementById('bar-number');

    if (barringSelect.value === 'yes') {
        barNumberLabel.style.display = 'block';
        barNumberInput.style.display = 'block';
        barNumberInput.required = true;
    } else {
        barNumberLabel.style.display = 'none';
        barNumberInput.style.display = 'none';
        barNumberInput.required = false;
        barNumberInput.value = '';
    }
}

// Generate SKU and create product
async function generateSKU() {
    const companySelect = document.getElementById('company-select');
    const productName = document.getElementById('product-name').value.trim();
    const productType = document.getElementById('product-type').value;
    const thickness = document.getElementById('thickness').value.trim();
    const length = document.getElementById('length').value.trim();
    const width = document.getElementById('width').value.trim();
    const barring = document.getElementById('barring').value;
    const barNumber = document.getElementById('bar-number').value.trim();

    // Validation
    if (!companySelect.value || !productName || !productType) {
        alert('Please fill all required fields.');
        return;
    }

    if (companySelect.value === 'new') {
        const newCompanyName = document.getElementById('new-company').value.trim();
        const companyShortform = document.getElementById('company-shortform').value.trim();
        
        if (!newCompanyName || !companyShortform) {
            alert('Please fill in the new company details.');
            return;
        }
    }

    // Build specifications object
    const specifications = {
        thickness: thickness || null,
        length: length || null,
        width: width || null,
        barring: barring || null,
        barNumber: barring === 'yes' ? barNumber : null
    };

    try {
        // Check for duplicate product first
        const duplicateCheck = await api.checkDuplicateProduct(productName);
        
        if (duplicateCheck.exists) {
            document.getElementById('sku-result').innerHTML = 
                `Product already exists!<br>SKU: ${duplicateCheck.sku}<br>
                <button onclick="viewProduct('${duplicateCheck.productId}')">View Product</button>`;
            return;
        }

        // Generate SKU and create product
        const result = await api.generateSKU({
            company: companySelect.value === 'new' ? 
                document.getElementById('new-company').value.trim() : companySelect.value,
            productName: productName,
            productType: productType,
            specifications: specifications
        });

        document.getElementById('sku-result').innerHTML = 
            `Product created successfully!<br>SKU: ${result.sku}<br>
            <button onclick="viewProduct('${result.productId}')">View Product</button>`;
        
        // Reset form
        document.getElementById('sku-form').reset();
        handleCompanySelect();
        
    } catch (error) {
        alert('Error creating product: ' + error.message);
    }
}

function viewProduct(productId) {
    // Redirect to products page
    window.location.href = 'products.html';
}

// Add API functions to api.js
if (typeof api !== 'undefined') {
    api.getCompanies = () => apiCall('/sku/companies');
    api.generateSKU = (data) => apiCall('/sku/generate', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    api.checkDuplicateProduct = (productName) => apiCall('/sku/check-duplicate', {
        method: 'POST',
        body: JSON.stringify({ productName }),
    });
} else {
    // Fallback if api.js not loaded
    const API_BASE = '/api';
    
    async function apiCall(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        };
        
        const response = await fetch(url, config);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }
    
    window.api = {
        getCompanies: () => apiCall('/sku/companies'),
        generateSKU: (data) => apiCall('/sku/generate', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        checkDuplicateProduct: (productName) => apiCall('/sku/check-duplicate', {
            method: 'POST',
            body: JSON.stringify({ productName }),
        }),
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // Initially disable barring dropdown
    document.getElementById('barring').disabled = true;
    
    // Add event listeners to dimension inputs
    document.getElementById('thickness').addEventListener('input', checkDimensionsAndToggleBarring);
    document.getElementById('length').addEventListener('input', checkDimensionsAndToggleBarring);
    document.getElementById('width').addEventListener('input', checkDimensionsAndToggleBarring);
});
