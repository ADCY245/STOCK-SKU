// Load products on page load
document.addEventListener('DOMContentLoaded', loadProducts);

// Handle form submission
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const category = document.getElementById('category').value;

    try {
        await api.addProduct({ name, category });
        document.getElementById('product-form').reset();
        loadProducts();
    } catch (error) {
        alert('Error adding product: ' + error.message);
    }
});

// Load and display products
async function loadProducts() {
    try {
        const products = await api.getProducts();
        const productsList = document.getElementById('products-list');
        productsList.innerHTML = '';

        products.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            productItem.innerHTML = `
                <span>${product.name} (${product.category})</span>
                <span>Stock: ${product.stock || 0}</span>
            `;
            productsList.appendChild(productItem);
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}
