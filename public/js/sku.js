let cachedCompanies = [];

// Load companies on page load
document.addEventListener('DOMContentLoaded', loadCompanies);

function handleShortformInput(type) {
    const inputId = type === 'company' ? 'company-shortform' : 'brand-shortform';
    const input = document.getElementById(inputId);
    if (!input) return;

    const sanitized = (input.value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 2);
    input.value = sanitized;
}

function getSelectedCompany(code) {
    return cachedCompanies.find((company) => company.code === code);
}

// Load companies from database
async function loadCompanies() {
    try {
        const companies = await api.getCompanies();
        cachedCompanies = companies || [];
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

    if (select.value === 'new') {
        newCompanyInput.style.display = 'block';
        shortformLabel.style.display = 'block';
        shortformInput.style.display = 'block';
        newCompanyInput.value = '';
        shortformInput.value = '';
        shortformInput.disabled = false;
    } else if (select.value) {
        // Hide new company inputs
        newCompanyInput.style.display = 'none';
        shortformLabel.style.display = 'none';
        shortformInput.style.display = 'none';
        shortformInput.disabled = true;
    } else {
        // No selection
        newCompanyInput.style.display = 'none';
        shortformLabel.style.display = 'none';
        shortformInput.style.display = 'none';
        shortformInput.disabled = false;
    }
}

const generateShortform = (type) => {
    const nameInput = document.getElementById(type === 'company' ? 'new-company' : 'brand-name');
    const shortformInput = document.getElementById(type === 'company' ? 'company-shortform' : 'brand-shortform');
    const name = nameInput.value.trim();
    if (name && shortformInput.style.display !== 'none') {
        const shortform = name.substring(0, 2).toUpperCase();
        shortformInput.value = shortform;
        handleShortformInput(type);
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
    const brandNameInput = document.getElementById('brand-name');
    const brandShortformInput = document.getElementById('brand-shortform');
    const importedCodeInput = document.getElementById('imported-code');
    const companyShortformInput = document.getElementById('company-shortform');

    if (!companySelect || !brandNameInput || !brandShortformInput || !importedCodeInput) {
        alert('Unable to find SKU form fields. Please refresh the page.');
        return;
    }

    const productName = brandNameInput.value.trim();
    const brandShortform = brandShortformInput.value.trim().toUpperCase();
    const importedCode = importedCodeInput.value.trim();
    const thickness = (document.getElementById('thickness').value || '').trim();
    const length = (document.getElementById('length').value || '').trim();
    const width = (document.getElementById('width').value || '').trim();
    const barring = document.getElementById('barring').value;
    const barNumber = (document.getElementById('bar-number').value || '').trim();

    // Validation
    if (!companySelect.value) {
        alert('Please select a company.');
        return;
    }

    if (!productName || !brandShortform || !importedCode) {
        alert('Please fill all required fields.');
        return;
    }

    if (companySelect.value === 'new') {
        const newCompanyName = document.getElementById('new-company').value.trim();
        const companyShortform = companyShortformInput.value.trim().toUpperCase();

        if (!newCompanyName || !companyShortform) {
            alert('Please fill in the new company details.');
            return;
        }
    }

    const selectedCompany = companySelect.value !== 'new' ? getSelectedCompany(companySelect.value) : null;
    const companyShortform = companySelect.value === 'new'
        ? companyShortformInput.value.trim().toUpperCase()
        : selectedCompany?.short_form || '';
    const companyName = companySelect.value === 'new'
        ? document.getElementById('new-company').value.trim()
        : selectedCompany?.name || '';

    // Build specifications object
    const specifications = {
        thickness: thickness || null,
        length: length || null,
        width: width || null,
        barring: barring || null,
        barNumber: barring === 'yes' ? barNumber : null
    };

    try {
        const result = await api.generateSKU({
            company: companySelect.value === 'new' ? null : companySelect.value,
            companyName,
            companyShortform,
            brandName: productName,
            brandShortform,
            importedCode,
            specifications
        });

        const specLines = [];
        if (thickness) specLines.push(`Thickness: ${thickness}`);
        if (length && width) specLines.push(`Length: ${length}`, `Width: ${width}`);
        if (barring) specLines.push(`Barring: ${barring === 'yes' ? 'Yes' : 'No'}`);
        if (barring === 'yes' && barNumber) specLines.push(`Bar Number: ${barNumber}`);

        const detailHtml = specLines.length
            ? `<ul>${specLines.map((line) => `<li>${line}</li>`).join('')}</ul>`
            : '<p>No specification details provided.</p>';

        document.getElementById('sku-result').innerHTML = `
            <div>
                <p>Generated Numeric SKU:</p>
                <strong>${result.sku}</strong>
                <p class="sku-meta">Brand: ${productName} (${brandShortform})</p>
                <p class="sku-meta">Imported Code: ${importedCode}</p>
                ${detailHtml}
            </div>
        `;

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
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // Initially disable barring dropdown
    document.getElementById('barring').disabled = true;
    
    // Add event listeners to dimension inputs
    document.getElementById('thickness').addEventListener('input', checkDimensionsAndToggleBarring);
    document.getElementById('length').addEventListener('input', checkDimensionsAndToggleBarring);
    document.getElementById('width').addEventListener('input', checkDimensionsAndToggleBarring);
    handleCompanySelect();
});
