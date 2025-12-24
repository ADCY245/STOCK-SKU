// Load products for stock forms
async function loadProductsForStock() {
    try {
        const products = await api.getProducts();
        const productSelect = document.getElementById('product');
        productSelect.innerHTML = '<option value="">Select Product</option>';
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product._id;
            option.textContent = `${product.name} (${product.category})`;
            productSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Handle stock in form
if (document.getElementById('stock-in-form')) {
    document.getElementById('stock-in-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const productId = document.getElementById('product').value;
        const quantity = parseInt(document.getElementById('quantity').value);

        try {
            await api.addStock({ productId, quantity, type: 'in' });
            document.getElementById('stock-in-form').reset();
            alert('Stock added successfully');
        } catch (error) {
            alert('Error adding stock: ' + error.message);
        }
    });

    document.addEventListener('DOMContentLoaded', loadProductsForStock);
}

// Handle stock out form
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
