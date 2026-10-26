document.addEventListener('DOMContentLoaded', () => {
    loadAdminTables();
});

function loadAdminTables() {
    const workers = getWorkers();
    const pendingTable = document.getElementById('pending-table');
    const approvedTable = document.getElementById('approved-table');

    if (!pendingTable || !approvedTable) return;

    // Pendientes
    const pending = workers.filter(w => w.status === 'pending');
    pendingTable.innerHTML = pending.length > 0 ? pending.map(w => `
        <tr>
            <td>${w.name}</td>
            <td>${w.category}</td>
            <td>${w.zone}</td>
            <td>${w.phone}</td>
            <td>
                <button onclick="approveWorker('${w.id}')" class="btn-primary" style="background: var(--accent); font-size: 0.8rem; padding: 4px 8px;">Aprobar</button>
            </td>
        </tr>
    `).join('') : '<tr><td colspan="5">No hay solicitudes pendientes.</td></tr>';

    // Aprobados
    const approved = workers.filter(w => w.status === 'approved');
    approvedTable.innerHTML = approved.map(w => `
        <tr>
            <td>${w.name}</td>
            <td>${w.category}</td>
            <td>${w.verified ? '✅ Verificado' : '❌ No verificado'}</td>
            <td>${w.featured ? '⭐ Destacado' : 'No'}</td>
            <td>
                <button onclick="toggleVerify('${w.id}')" style="font-size: 0.75rem;">${w.verified ? 'Quitar Verificación' : 'Verificar ID'}</button>
                <button onclick="toggleFeatured('${w.id}')" style="font-size: 0.75rem;">${w.featured ? 'Quitar Destacado' : 'Hacer Destacado'}</button>
            </td>
        </tr>
    `).join('');
}

function approveWorker(id) {
    const workers = getWorkers();
    const worker = workers.find(w => w.id === id);
    if (worker) {
        worker.status = 'approved';
        saveWorkers(workers);
        loadAdminTables();
    }
}

function toggleVerify(id) {
    const workers = getWorkers();
    const worker = workers.find(w => w.id === id);
    if (worker) {
        worker.verified = !worker.verified;
        saveWorkers(workers);
        loadAdminTables();
    }
}

function toggleFeatured(id) {
    const workers = getWorkers();
    const worker = workers.find(w => w.id === id);
    if (worker) {
        worker.featured = !worker.featured;
        saveWorkers(workers);
        loadAdminTables();
    }
}