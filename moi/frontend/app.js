// Auth Protection
if (!sessionStorage.getItem('isLoggedIn')) {
    window.location.href = 'login.html';
}

// API Details
const API_URL = 'http://localhost:8080/api';

// DOM Elements
const eventSelector = document.getElementById('eventSelector');
const btnCreateEventModal = document.getElementById('btnCreateEventModal');
const createEventModal = document.getElementById('createEventModal');
const closeEventModal = document.getElementById('closeEventModal');
const createEventForm = document.getElementById('createEventForm');

const selectEventPrompt = document.getElementById('selectEventPrompt');
const viewsContainer = document.getElementById('viewsContainer');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');

const recordMoiForm = document.getElementById('recordMoiForm');
const transactionsTableBody = document.getElementById('transactionsTableBody');
const emptyState = document.getElementById('emptyState');

// Form Elements
const editingTransactionId = document.getElementById('editingTransactionId');
const contributorNameEl = document.getElementById('contributorName');
const villageEl = document.getElementById('village');
const amountEl = document.getElementById('amount');
const notesEl = document.getElementById('notes');
const submitMoiBtn = document.getElementById('submitMoiBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const formTitle = document.getElementById('formTitle');

// Stats Elements
const totalContributorsEl = document.getElementById('totalContributors');
const totalAmountEl = document.getElementById('totalAmount');
const recentCountEl = document.getElementById('recentCount');

// Reports Elements
const reportsTableBody = document.getElementById('reportsTableBody');
const btnExportPDF = document.getElementById('btnExportPDF');
const btnExportExcel = document.getElementById('btnExportExcel');

let currentEventId = null;
let cachedTransactions = []; // Store transactions for quick editing
let allReportsData = []; // Store all data for reports

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    loadVillages();
});

// Event Name Search Filter
const eventSearchInput = document.getElementById('eventSearch');
if(eventSearchInput) {
    eventSearchInput.addEventListener('input', function() {
        const filter = this.value.toLowerCase();
        const rows = document.querySelectorAll('#transactionsTableBody tr');
        
        rows.forEach((row, index) => {
            if (row.cells.length === 1) return; // Skip "No transactions" row
            
            const nameCell = row.cells[1]; // Name is 1
            if (nameCell) {
                const nameText = nameCell.textContent.toLowerCase();
                
                if (filter === "") {
                    // If no search, only show the first 6 (last 6 transactions)
                    row.style.display = index < 6 ? '' : 'none';
                } else {
                    // If searching, show any that match
                    if (nameText.includes(filter)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            }
        });
    });
}

// Navigation Views logic
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all nav items
        navItems.forEach(n => n.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Toggle Views
        const targetViewId = e.currentTarget.getAttribute('data-view');
        document.querySelectorAll('.view-section').forEach(view => {
            view.style.display = 'none';
        });
        
        if (document.getElementById(targetViewId)) {
            document.getElementById(targetViewId).style.display = 'block';
        }

        // Update Headers
        if(targetViewId === 'dashboardView') {
            pageTitle.innerText = "Collection Dashboard";
            pageSubtitle.innerText = "Overview of your cash gifts.";
        } else if (targetViewId === 'eventsView') {
            pageTitle.innerText = "Manage Event & Records";
            pageSubtitle.innerText = "Add and update contributor details.";
        } else if (targetViewId === 'reportsView') {
            pageTitle.innerText = "Reports";
            pageSubtitle.innerText = "Analyze your collection data.";
            loadAllReports();
        }
    });
});

// Logout Logic
const logoutBtn = document.querySelector('.logout-btn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    });
}

// Load All Reports
async function loadAllReports() {
    try {
        const res = await fetch(`${API_URL}/moi`);
        allReportsData = await res.json();
        
        reportsTableBody.innerHTML = '';
        allReportsData.forEach(tx => {
            const tr = document.createElement('tr');
            const date = new Date(tx.transactionDate).toLocaleDateString();
            tr.innerHTML = `
                <td>${tx.serialNumber}</td>
                <td><span class="badge">Event ${tx.eventId}</span></td>
                <td style="font-weight: 500">${tx.contributorName}</td>
                <td>${tx.village}</td>
                <td class="amt-cell">₹${tx.amount.toFixed(2)}</td>
                <td>${date}</td>
                <td>${tx.notes || '-'}</td>
            `;
            reportsTableBody.appendChild(tr);
        });
    } catch(err) {
        console.error("Failed to load reports:", err);
    }
}

// Export PDF
btnExportPDF.addEventListener('click', () => {
    if (allReportsData.length === 0) return alert("No data to export!");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text("Moi Collection Report", 14, 15);
    
    const tableColumn = ["S.No", "Event ID", "Name", "Village", "Amount (Rs)", "Date", "Notes"];
    const tableRows = [];
    let pdfTotalAmount = 0;
    
    allReportsData.forEach(tx => {
        pdfTotalAmount += tx.amount;
        const txData = [
            tx.serialNumber,
            tx.eventId,
            tx.contributorName,
            tx.village,
            tx.amount.toFixed(2),
            new Date(tx.transactionDate).toLocaleDateString(),
            tx.notes || ''
        ];
        tableRows.push(txData);
    });
    
    // Add Total Row
    tableRows.push([
        "", "", "", "GRAND TOTAL:", pdfTotalAmount.toFixed(2), "", ""
    ]);
    
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        didDrawCell: function(data) {
            // Bold the total row
            if (data.row.index === tableRows.length - 1) {
                doc.setFont("helvetica", "bold");
            }
        }
    });
    
    doc.save(`Moi_Report_${new Date().toISOString().slice(0,10)}.pdf`);
});

// Export Excel
btnExportExcel.addEventListener('click', () => {
    if (allReportsData.length === 0) return alert("No data to export!");
    
    let excelTotalAmount = 0;
    const formattedData = allReportsData.map(tx => {
        excelTotalAmount += tx.amount;
        return {
            "S.No": tx.serialNumber,
            "Event ID": tx.eventId,
            "Contributor Name": tx.contributorName,
            "Village": tx.village,
            "Amount (₹)": tx.amount,
            "Date": new Date(tx.transactionDate).toLocaleDateString(),
            "Notes": tx.notes || ''
        };
    });
    
    // Add Total Row
    formattedData.push({
        "S.No": "",
        "Event ID": "",
        "Contributor Name": "",
        "Village": "GRAND TOTAL:",
        "Amount (₹)": excelTotalAmount,
        "Date": "",
        "Notes": ""
    });
    
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `Moi_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
});

// Load Villages Autocomplete
async function loadVillages() {
    try {
        const res = await fetch(`${API_URL}/moi/villages`);
        if (!res.ok) return;
        const villages = await res.json();
        
        const dataList = document.getElementById('villageList');
        dataList.innerHTML = '';
        villages.forEach(v => {
            const option = document.createElement('option');
            option.value = v;
            dataList.appendChild(option);
        });
    } catch(err) {
        console.error("Failed to load villages:", err);
    }
}

// Load Events
async function loadEvents() {
    try {
        const res = await fetch(`${API_URL}/events`);
        const events = await res.json();
        
        eventSelector.innerHTML = '<option value="" disabled selected>Select an Event</option>';
        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            const date = new Date(event.eventDate).toLocaleDateString();
            option.textContent = `${event.name} (${date})`;
            eventSelector.appendChild(option);
        });

        if(currentEventId) {
            eventSelector.value = currentEventId;
            selectEvent(currentEventId);
        }

    } catch(err) {
        console.error("Failed to load events:", err);
    }
}

// Event Selector Change
eventSelector.addEventListener('change', (e) => {
    selectEvent(e.target.value);
});

function selectEvent(eventId) {
    currentEventId = eventId;
    selectEventPrompt.style.display = 'none';
    viewsContainer.style.display = 'block';
    
    // Auto-switch to Events View to prompt data entry
    document.getElementById('nav-events').click();
    
    loadTransactions(eventId);
}

// Load Transactions
async function loadTransactions(eventId) {
    try {
        const res = await fetch(`${API_URL}/moi/event/${eventId}`);
        cachedTransactions = await res.json();
        updateTableAndStats();
    } catch(err) {
        console.error("Failed to load transactions:", err);
    }
}

function updateTableAndStats() {
    transactionsTableBody.innerHTML = '';
    
    let totalAmount = 0;
    const uniqueContributors = new Set();

    if(cachedTransactions.length === 0) {
        emptyState.style.display = 'block';
        document.querySelector('.data-table').style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        document.querySelector('.data-table').style.display = 'table';

        // Sort by date desc initially (most recent at top)
        cachedTransactions.sort((a,b) => new Date(b.transactionDate) - new Date(a.transactionDate));

        cachedTransactions.forEach((tx, index) => {
            totalAmount += tx.amount;
            uniqueContributors.add(tx.contributorName);

            const tr = document.createElement('tr');
            const date = new Date(tx.transactionDate).toLocaleDateString();
            
            // Only show the top 6 rows by default
            if (index >= 6) {
                tr.style.display = 'none';
            }
            
            tr.innerHTML = `
                <td><span class="badge">${tx.serialNumber}</span></td>
                <td style="font-weight: 500">${tx.contributorName}</td>
                <td>${tx.village}</td>
                <td class="amt-cell">₹${tx.amount.toFixed(2)}</td>
                <td>${date}</td>
                <td style="white-space: nowrap;">
                    <button class="btn btn-edit" title="Edit" onclick="editTransaction(${tx.transactionId})" style="padding: 6px; background: none; color: var(--primary-color); border: none; cursor: pointer;"><i class="fa-solid fa-edit"></i></button>
                    <button class="btn btn-delete" title="Delete" onclick="deleteTransaction(${tx.transactionId})" style="padding: 6px; background: none; color: var(--danger); border: none; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            transactionsTableBody.appendChild(tr);
        });
    }

    // Update Stats
    totalContributorsEl.innerText = uniqueContributors.size;
    totalAmountEl.innerText = `₹${totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    recentCountEl.innerText = cachedTransactions.length;
}

// Edit Mode Logic
window.editTransaction = function(txId) {
    const tx = cachedTransactions.find(t => t.transactionId === txId);
    if (!tx) return;

    editingTransactionId.value = tx.transactionId;
    contributorNameEl.value = tx.contributorName;
    villageEl.value = tx.village;
    amountEl.value = tx.amount;
    notesEl.value = tx.notes || '';

    // Switch form to "Update" mode
    formTitle.innerHTML = `<i class="fa-solid fa-pen"></i> Update Transaction`;
    submitMoiBtn.innerHTML = `<i class="fa-solid fa-check"></i> Update`;
    cancelEditBtn.style.display = 'inline-block';
    
    // Jump to form
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
}

cancelEditBtn.addEventListener('click', () => {
    resetForm();
});

window.deleteTransaction = async function(txId) {
    if(!confirm('Are you sure you want to delete this transaction?')) return;
    try {
        const res = await fetch(`${API_URL}/moi/${txId}`, { method: 'DELETE' });
        if(res.ok) {
            showToast("Transaction deleted.");
            loadTransactions(currentEventId);
        } else {
            alert('Failed to delete transaction');
        }
    } catch (err) {
        console.error(err);
    }
}

function resetForm() {
    recordMoiForm.reset();
    editingTransactionId.value = '';
    formTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Record New Moi`;
    submitMoiBtn.innerHTML = `<i class="fa-solid fa-save"></i> Save Transaction`;
    cancelEditBtn.style.display = 'none';
}

// Record/Update Moi Transaction
recordMoiForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!currentEventId) return;

    const payload = {
        eventId: currentEventId,
        contributorName: contributorNameEl.value,
        village: villageEl.value,
        amount: parseFloat(amountEl.value),
        notes: notesEl.value
    };

    const isEdit = editingTransactionId.value !== '';
    const url = isEdit ? `${API_URL}/moi/${editingTransactionId.value}` : `${API_URL}/moi`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            resetForm();
            showToast(isEdit ? "Transaction updated successfully!" : "Moi recorded successfully!");
            // Reload current event data and villages
            loadTransactions(currentEventId);
            loadVillages();
        } else {
            alert('Failed to save transaction');
        }
    } catch (err) {
        console.error(err);
        alert('Server connection error');
    }
});

// Create Event
createEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('eventName').value,
        eventDate: document.getElementById('eventDate').value,
        location: document.getElementById('eventLocation').value
    };

    try {
        const res = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            const newEvent = await res.json();
            createEventForm.reset();
            createEventModal.style.display = 'none';
            currentEventId = newEvent.id;
            loadEvents();
            showToast("Event created gracefully!");
        } else {
            alert('Failed to create event');
        }
    } catch (err) {
        console.error(err);
        alert('Server connection error');
    }
});

// Modal Logic
btnCreateEventModal.addEventListener('click', () => {
    createEventModal.style.display = 'flex';
});

closeEventModal.addEventListener('click', () => {
    createEventModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === createEventModal) {
        createEventModal.style.display = 'none';
    }
});

// Toast Logic
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
