let cachedCompanies = [];

if (typeof api === 'undefined') {
    const API_BASE = '/api';

    async function apiCall(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        };

        const response = await fetch(url, config);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
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

function handleShortformInput(type) {
    const inputId = type === 'company' ? 'company-shortform' : 'brand-shortform';
    const input = document.getElementById(inputId);
    if (!input) {
        return;
    }

    const sanitized = (input.value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 2);
    input.value = sanitized;
}

function getSelectedCompany(code) {
    return cachedCompanies.find((company) => company.code === code);
}

async function loadCompanies() {
    try {
        const companies = await api.getCompanies();
        cachedCompanies = companies || [];
        const companySelect = document.getElementById('company-select');
        if (!companySelect) {
            return;
        }

        const addNewOption = companySelect.querySelector('option[value="new"]');
        companySelect.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Company';
        companySelect.appendChild(defaultOption);

        companies.forEach((company) => {
            const option = document.createElement('option');
            option.value = company.code;
            option.textContent = `${company.name} (${company.short_form})`;
            companySelect.appendChild(option);
        });

        if (addNewOption) {
            companySelect.appendChild(addNewOption);
        }
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

function handleCompanySelect() {
    const select = document.getElementById('company-select');
    const newCompanyInput = document.getElementById('new-company');
    const shortformLabel = document.getElementById('company-shortform-label');
    const shortformInput = document.getElementById('company-shortform');

    if (!select || !newCompanyInput || !shortformLabel || !shortformInput) {
        return;
    }

    if (select.value === 'new') {
        newCompanyInput.style.display = 'block';
        shortformLabel.style.display = 'block';
        shortformInput.style.display = 'block';
        newCompanyInput.value = '';
        shortformInput.value = '';
        shortformInput.disabled = false;
    } else if (select.value) {
        newCompanyInput.style.display = 'none';
        shortformLabel.style.display = 'none';
        shortformInput.style.display = 'none';
        shortformInput.disabled = true;
    } else {
        newCompanyInput.style.display = 'none';
        shortformLabel.style.display = 'none';
        shortformInput.style.display = 'none';
        shortformInput.disabled = false;
    }
}

const generateShortform = (type) => {
    const nameInput = document.getElementById(type === 'company' ? 'new-company' : 'brand-name');
    const shortformInput = document.getElementById(type === 'company' ? 'company-shortform' : 'brand-shortform');

    if (!nameInput || !shortformInput) {
        return;
    }

    const name = nameInput.value.trim();
    if (name && shortformInput.style.display !== 'none') {
        shortformInput.value = name.substring(0, 2).toUpperCase();
        handleShortformInput(type);
    }
};

const checkDimensionsAndToggleBarring = () => {
    const thicknessInput = document.getElementById('thickness');
    const lengthInput = document.getElementById('length');
    const widthInput = document.getElementById('width');
    const barringSelect = document.getElementById('barring');
    const barNumberLabel = document.getElementById('bar-number-label');
    const barNumberInput = document.getElementById('bar-number');

    if (!thicknessInput || !lengthInput || !widthInput || !barringSelect || !barNumberLabel || !barNumberInput) {
        return;
    }

    if (thicknessInput.value && lengthInput.value && widthInput.value) {
        barringSelect.disabled = false;
    } else {
        barringSelect.disabled = true;
        barringSelect.value = '';
        barNumberLabel.style.display = 'none';
        barNumberInput.style.display = 'none';
    }
};

function handleBarring() {
    const barringSelect = document.getElementById('barring');
    const barNumberLabel = document.getElementById('bar-number-label');
    const barNumberInput = document.getElementById('bar-number');

    if (!barringSelect || !barNumberLabel || !barNumberInput) {
        return;
    }

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

function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

function getDownloadFilename(response, fallbackName) {
    const disposition = response.headers.get('Content-Disposition') || '';
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match && utf8Match[1]) {
        return decodeURIComponent(utf8Match[1]);
    }

    const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
    if (plainMatch && plainMatch[1]) {
        return plainMatch[1];
    }

    return fallbackName;
}

function downloadSkuTemplate() {
    const headers = ['Name', 'Description', 'Product Format'];
    const sampleRows = [
        ['Day Graphica Rubber Blanket', 'Compressible rubber blanket 1050 x 800 x 1.95 mm', '1.95 mm'],
        ['Cito Matrix', 'Creasing matrix for carton jobs', '9 MM'],
        ['Varn Spray Powder', 'Fine spray powder for offset printing', '1 kg'],
    ];

    const csvContent = [headers.join(','), ...sampleRows.map((row) => row.map((value) => `"${value}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'sku_analysis_template.csv');
}

async function analyzeSkuExcel() {
    const fileInput = document.getElementById('sku-excel-file');
    const statusElement = document.getElementById('sku-upload-status');
    const file = fileInput?.files?.[0];

    if (!file || !statusElement) {
        if (statusElement) {
            statusElement.textContent = 'Please choose an Excel file first.';
            statusElement.style.color = 'red';
        }
        return;
    }

    const formData = new FormData();
    formData.append('excel-file', file);

    statusElement.textContent = 'Analyzing Excel file. Large files may take a little time...';
    statusElement.style.color = '#007bff';

    try {
        const response = await fetch('/api/sku/analyze-excel', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const contentType = response.headers.get('Content-Type') || '';
            let errorMessage = 'Failed to analyze the Excel file.';

            if (contentType.includes('application/json')) {
                const payload = await response.json();
                errorMessage = payload.error || errorMessage;
            }

            throw new Error(errorMessage);
        }

        const processedRows = response.headers.get('X-Processed-Rows') || '0';
        const categorizedRows = response.headers.get('X-Categorized-Rows') || '0';
        const fallbackName = file.name.replace(/\.(xlsx|xls)$/i, '') + '_analyzed.xlsx';
        const downloadName = getDownloadFilename(response, fallbackName);
        const blob = await response.blob();

        downloadBlob(blob, downloadName);
        statusElement.textContent = `Analysis complete. ${categorizedRows} of ${processedRows} rows were categorized, and the updated workbook has been downloaded.`;
        statusElement.style.color = 'green';
        fileInput.value = '';
    } catch (error) {
        statusElement.textContent = `Analysis failed: ${error.message}`;
        statusElement.style.color = 'red';
    }
}

async function generateSKU() {
    const companySelect = document.getElementById('company-select');
    const brandNameInput = document.getElementById('brand-name');
    const brandShortformInput = document.getElementById('brand-shortform');
    const importedCodeInput = document.getElementById('imported-code');
    const companyShortformInput = document.getElementById('company-shortform');

    if (!companySelect || !brandNameInput || !brandShortformInput || !importedCodeInput || !companyShortformInput) {
        alert('Unable to find SKU form fields. Please refresh the page.');
        return;
    }

    const productName = brandNameInput.value.trim();
    const brandShortform = brandShortformInput.value.trim().toUpperCase();
    const importedCode = importedCodeInput.value.trim();
    const thickness = (document.getElementById('thickness')?.value || '').trim();
    const length = (document.getElementById('length')?.value || '').trim();
    const width = (document.getElementById('width')?.value || '').trim();
    const barring = document.getElementById('barring')?.value || '';
    const barNumber = (document.getElementById('bar-number')?.value || '').trim();

    if (!companySelect.value) {
        alert('Please select a company.');
        return;
    }

    if (!productName || !brandShortform || !importedCode) {
        alert('Please fill all required fields.');
        return;
    }

    if (companySelect.value === 'new') {
        const newCompanyName = document.getElementById('new-company')?.value.trim() || '';
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
        ? document.getElementById('new-company')?.value.trim() || ''
        : selectedCompany?.name || '';

    const specifications = {
        thickness: thickness || null,
        length: length || null,
        width: width || null,
        barring: barring || null,
        barNumber: barring === 'yes' ? barNumber : null,
    };

    try {
        const result = await api.generateSKU({
            company: companySelect.value === 'new' ? null : companySelect.value,
            companyName,
            companyShortform,
            brandName: productName,
            brandShortform,
            importedCode,
            specifications,
        });

        const resultElement = document.getElementById('sku-result');
        if (resultElement) {
            resultElement.innerHTML = `
                <div>
                    <p>Generated Numeric SKU:</p>
                    <strong>${result.sku}</strong>
                </div>
            `;
        }

        const form = document.getElementById('sku-form');
        if (form) {
            form.reset();
        }
        handleCompanySelect();
        checkDimensionsAndToggleBarring();
    } catch (error) {
        alert('Error creating product: ' + error.message);
    }
}

function viewProduct() {
    window.location.href = 'products.html';
}

document.addEventListener('DOMContentLoaded', () => {
    loadCompanies();

    const barringSelect = document.getElementById('barring');
    const thicknessInput = document.getElementById('thickness');
    const lengthInput = document.getElementById('length');
    const widthInput = document.getElementById('width');

    if (barringSelect) {
        barringSelect.disabled = true;
    }
    if (thicknessInput) {
        thicknessInput.addEventListener('input', checkDimensionsAndToggleBarring);
    }
    if (lengthInput) {
        lengthInput.addEventListener('input', checkDimensionsAndToggleBarring);
    }
    if (widthInput) {
        widthInput.addEventListener('input', checkDimensionsAndToggleBarring);
    }

    handleCompanySelect();
    checkDimensionsAndToggleBarring();
});
