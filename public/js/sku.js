const letterToNumber = (letter) => {
    return letter.charCodeAt(0) - 64;
};

const computeNumeric = (shortform) => {
    if (shortform.length !== 2) return '';
    const upper = shortform.toUpperCase();
    const num1 = letterToNumber(upper[0]);
    const num2 = letterToNumber(upper[1]);
    return num1.toString() + num2.toString();
};

const generateShortform = (type) => {
    const nameInput = document.getElementById(type === 'company' ? 'new-company' : 'brand-name');
    const shortformInput = document.getElementById(type === 'company' ? 'company-shortform' : 'brand-shortform');
    const name = nameInput.value.trim();
    if (name && shortformInput.style.display !== 'none') {
        const shortform = name.substring(0, 2).toUpperCase();
        shortformInput.value = shortform;
        computeNumericForType(type);
    }
};

const computeNumericForType = (type) => {
    const shortformInput = document.getElementById(type === 'company' ? 'company-shortform' : 'brand-shortform');
    const numericEl = document.getElementById(type === 'company' ? 'company-numeric' : 'brand-numeric');
    const numeric = computeNumeric(shortformInput.value);
    numericEl.textContent = `Numeric Code: ${numeric}`;
};

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
    } else if (select.value) {
        // Predefined company
        const predefined = {
            'co': { shortform: 'CO', numeric: '315' },
            'hz': { shortform: 'HZ', numeric: '826' },
            'ps': { shortform: 'PS', numeric: '1619' },
            'pa': { shortform: 'PA', numeric: '161' },
            'mz': { shortform: 'MZ', numeric: '1326' },
            'mt': { shortform: 'MT', numeric: '1320' },
            'im': { shortform: 'IM', numeric: '913' },
            'cg': { shortform: 'CG', numeric: '37' },
            'oh': { shortform: 'OH', numeric: '158' },
            'sg': { shortform: 'SG', numeric: '197' },
            'st': { shortform: 'ST', numeric: '1920' },
            'dg': { shortform: 'DG', numeric: '47' },
            'or': { shortform: 'OR', numeric: '1518' },
            'tb': { shortform: 'TB', numeric: '202' },
            'sp': { shortform: 'SP', numeric: '1916' },
            'jy': { shortform: 'JY', numeric: '1025' },
            'sz': { shortform: 'SZ', numeric: '1926' },
            'og': { shortform: 'OG', numeric: '157' },
            'te': { shortform: 'TE', numeric: '205' },
            'an': { shortform: 'AN', numeric: '114' },
            'as': { shortform: 'AS', numeric: '119' },
            'tf': { shortform: 'TF', numeric: '206' },
            'mg': { shortform: 'MG', numeric: '137' },
            'se': { shortform: 'SE', numeric: '195' },
            'ss': { shortform: 'SS', numeric: '1919' }
        };
        const data = predefined[select.value];
        shortformInput.value = data.shortform;
        numericEl.textContent = `Numeric Code: ${data.numeric}`;
        // Hide new inputs
        newCompanyInput.style.display = 'none';
        shortformLabel.style.display = 'none';
        shortformInput.style.display = 'none';
        numericEl.style.display = 'block';
        shortformInput.disabled = true; // Unchangeable
    } else {
        // No selection
        newCompanyInput.style.display = 'none';
        shortformLabel.style.display = 'none';
        shortformInput.style.display = 'none';
        numericEl.style.display = 'none';
        shortformInput.disabled = false;
    }
    computeNumericForType('company');
}

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

function generateSKU() {
    const companyNumeric = document.getElementById('company-numeric').textContent.replace('Numeric Code: ', '');
    const brandNumeric = document.getElementById('brand-numeric').textContent.replace('Numeric Code: ', '');
    const importedCode = document.getElementById('imported-code').value.trim();
    const thickness = document.getElementById('thickness').value.trim();
    const length = document.getElementById('length').value.trim();
    const width = document.getElementById('width').value.trim();
    const barring = document.getElementById('barring').value;
    const barNumber = document.getElementById('bar-number').value.trim();

    if (!companyNumeric || !brandNumeric || !importedCode) {
        alert('Please fill all required fields.');
        return;
    }

    if (barring === 'yes' && !barNumber) {
        alert('Bar number is required when barring is Yes.');
        return;
    }

    let dimensions = '';
    if (thickness && length && width) {
        dimensions = `-${thickness}-${length}-${width}`;
    }

    let sku = `${companyNumeric}.${brandNumeric}.${importedCode}${dimensions}`;
    if (barring === 'yes') {
        sku += `-${barNumber}`;
    } else if (barring === 'no' || !barring) {
        // No bar added
    }

    document.getElementById('sku-result').textContent = `Generated SKU: ${sku}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // For brand, always show shortform and numeric
    document.getElementById('brand-shortform').style.display = 'block';
    document.getElementById('brand-numeric').style.display = 'block';
});
