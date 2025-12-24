// Handle generate report button
document.getElementById('generate-report').addEventListener('click', generateReport);

// Generate and display report
async function generateReport() {
    try {
        const report = await api.getReport();
        const reportContent = document.getElementById('report-content');
        reportContent.innerHTML = '';

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Last Updated</th>
                </tr>
            </thead>
            <tbody>
                ${report.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.category}</td>
                        <td>${item.stock}</td>
                        <td>${new Date(item.lastUpdated).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        reportContent.appendChild(table);
    } catch (error) {
        alert('Error generating report: ' + error.message);
    }
}
