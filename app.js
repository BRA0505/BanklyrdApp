const DB_KEY = "bankly_v4_users"; 
const SESSION_KEY = "bankly_v4_session";

document.addEventListener("DOMContentLoaded", () => { initApp(); });

let currentUser = null;

function initApp() {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) { currentUser = JSON.parse(session); showDashboard(); } 
    else { showAuth(); }
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById("go-to-register").onclick = (e) => { e.preventDefault(); document.getElementById("login-form").classList.add("hidden"); document.getElementById("register-form").classList.remove("hidden"); };
    document.getElementById("go-to-login").onclick = (e) => { e.preventDefault(); document.getElementById("register-form").classList.add("hidden"); document.getElementById("login-form").classList.remove("hidden"); };
    document.getElementById("register-form").onsubmit = (e) => { e.preventDefault(); registerUser(); };
    document.getElementById("login-form").onsubmit = (e) => { e.preventDefault(); loginUser(); };
    document.getElementById("transfer-form").onsubmit = (e) => { e.preventDefault(); makeTransfer(); };
    document.getElementById("form-loan-request").onsubmit = (e) => { e.preventDefault(); processLoan(); };
    document.getElementById("form-pay-card").onsubmit = (e) => { e.preventDefault(); payCreditCard(); };
    document.getElementById("check-deposit-form").onsubmit = (e) => { e.preventDefault(); depositCheck(); };
    document.getElementById("add-beneficiary-form").onsubmit = (e) => { e.preventDefault(); saveBeneficiary(); };

    // NUEVO: Listeners para Configuración
    document.getElementById("change-pass-form").onsubmit = (e) => { e.preventDefault(); changePassword(); };
    document.getElementById("update-profile-form").onsubmit = (e) => { e.preventDefault(); updateProfile(); };
}

function registerUser() {
    const user = document.getElementById("reg-user").value;
    const pass = document.getElementById("reg-pass").value;
    let usersDB = JSON.parse(localStorage.getItem(DB_KEY)) || {};
    if (usersDB[user]) { alert("Usuario existe."); return; }
    
    const newUser = {
        username: user, password: pass,
        accounts: { savings: 10000.00, payroll: 25000.00, digital: 5000.00 },
        creditCard: { limit: 50000.00, balance: 15000.00 },
        loans: [], movements: [{ concept: "Bono Bienvenida", date: getToday(), amount: 10000.00 }],
        beneficiaries: [],
        profile: { email: "", phone: "", notif: true } // Datos extra perfil
    };
    usersDB[user] = newUser;
    localStorage.setItem(DB_KEY, JSON.stringify(usersDB));
    alert("Usuario creado."); document.getElementById("go-to-login").click();
}

function loginUser() {
    const user = document.getElementById("login-user").value;
    const pass = document.getElementById("login-pass").value;
    let usersDB = JSON.parse(localStorage.getItem(DB_KEY)) || {};
    const storedUser = usersDB[user];
    if (storedUser && storedUser.password === pass) {
        currentUser = storedUser;
        if(!currentUser.beneficiaries) currentUser.beneficiaries = [];
        if(!currentUser.profile) currentUser.profile = { email: "", phone: "", notif: true };
        localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
        showDashboard();
    } else { alert("Incorrecto."); }
}

function logout() { localStorage.removeItem(SESSION_KEY); currentUser = null; location.reload(); }
function showAuth() { document.getElementById("auth-screen").classList.remove("hidden"); document.getElementById("dashboard-screen").classList.add("hidden"); }
function showDashboard() {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("dashboard-screen").classList.remove("hidden");
    document.getElementById("display-username").textContent = currentUser.username;
    document.getElementById("card-holder").textContent = currentUser.username;
    updateUI();
}

window.navigate = function(viewId) {
    document.querySelectorAll(".sidebar li").forEach(li => li.classList.remove("active"));
    event.currentTarget.classList.add("active");
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove("hidden");
    const titles = { 'home': 'Resumen Financiero', 'transfers': 'Zona de Transferencias', 'beneficiaries': 'Mis Contactos', 'checks': 'Depósito de Cheques', 'cards': 'Gestión de Tarjetas', 'loans': 'Préstamos', 'requests': 'Solicitudes', 'support': 'Ayuda' };
    document.getElementById("page-title").textContent = titles[viewId] || 'Bankly';
}

function updateUI() {
    const fmt = (num) => "RD$ " + num.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById("bal-savings").textContent = fmt(currentUser.accounts.savings);
    document.getElementById("bal-payroll").textContent = fmt(currentUser.accounts.payroll);
    document.getElementById("bal-digital").textContent = fmt(currentUser.accounts.digital);
    document.getElementById("cc-balance").textContent = fmt(currentUser.creditCard.balance);
    document.getElementById("modal-cc-debt").textContent = fmt(currentUser.creditCard.balance);
    document.getElementById("cc-available").textContent = fmt(currentUser.creditCard.limit - currentUser.creditCard.balance);
    
    const tbody = document.getElementById("movements-body"); tbody.innerHTML = "";
    currentUser.movements.slice().reverse().forEach(mov => {
        tbody.innerHTML += `<tr><td>${mov.concept}</td><td>${mov.date}</td><td style="font-weight:bold; color:${mov.amount > 0 ? 'green' : 'red'}">${fmt(mov.amount)}</td></tr>`;
    });
    const loanList = document.getElementById("active-loans-list");
    if (currentUser.loans.length === 0) loanList.innerHTML = "<p style='color:#888;'>No tienes préstamos.</p>";
    else { loanList.innerHTML = "<h3>Mis Préstamos</h3>"; currentUser.loans.forEach(loan => loanList.innerHTML += `<div style="background:#fff; padding:15px; border-left:4px solid var(--primary); margin-bottom:10px; border-radius:5px;"><h4>Préstamo</h4> <p>Monto: ${fmt(loan.amount)}</p></div>`); }
    renderBeneficiaries();
}

// --- LOGICA CONFIGURACIÓN (NUEVO) ---
window.toggleSettings = function() {
    const modal = document.getElementById("settings-modal");
    if(modal.classList.contains("hidden")) {
        modal.classList.remove("hidden");
        // Cargar datos actuales
        document.getElementById("profile-email").value = currentUser.profile.email || "";
        document.getElementById("profile-phone").value = currentUser.profile.phone || "";
        document.getElementById("notif-check").checked = currentUser.profile.notif;
    } else {
        modal.classList.add("hidden");
    }
}
window.showTab = function(tabName) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
    document.getElementById(`tab-${tabName}`).classList.remove("hidden");
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
}

function changePassword() {
    const oldPass = document.getElementById("old-pass").value;
    const newPass = document.getElementById("new-pass").value;
    const confirmPass = document.getElementById("confirm-pass").value;

    if (oldPass !== currentUser.password) { alert("Contraseña actual incorrecta."); return; }
    if (newPass !== confirmPass) { alert("Las nuevas contraseñas no coinciden."); return; }
    if (newPass.length < 4) { alert("La contraseña es muy corta."); return; }

    currentUser.password = newPass;
    saveData();
    alert("Contraseña actualizada con éxito.");
    document.getElementById("change-pass-form").reset();
    toggleSettings();
}

function updateProfile() {
    currentUser.profile.email = document.getElementById("profile-email").value;
    currentUser.profile.phone = document.getElementById("profile-phone").value;
    currentUser.profile.notif = document.getElementById("notif-check").checked;
    saveData();
    showNotification("Perfil actualizado.");
    toggleSettings();
}

// --- LOGICA BENEFICIARIOS ---
window.showAddBeneficiaryForm = function() { document.getElementById("add-beneficiary-container").classList.remove("hidden"); }
window.hideAddBeneficiaryForm = function() { document.getElementById("add-beneficiary-container").classList.add("hidden"); }
function saveBeneficiary() {
    const alias = document.getElementById("ben-alias").value;
    const bank = document.getElementById("ben-bank").value;
    const account = document.getElementById("ben-account").value;
    const cedula = document.getElementById("ben-cedula").value;
    const name = document.getElementById("ben-name").value;
    const newBen = { alias, bank, account, cedula, name };
    if(!currentUser.beneficiaries) currentUser.beneficiaries = [];
    currentUser.beneficiaries.push(newBen);
    saveData(); showNotification("Beneficiario agregado."); hideAddBeneficiaryForm(); document.getElementById("add-beneficiary-form").reset(); renderBeneficiaries();
}
function renderBeneficiaries() {
    const grid = document.getElementById("beneficiaries-list"); grid.innerHTML = "";
    if(!currentUser.beneficiaries || currentUser.beneficiaries.length === 0) { grid.innerHTML = "<p style='color:#888; grid-column:1/-1; text-align:center;'>No tienes contactos.</p>"; return; }
    currentUser.beneficiaries.forEach(ben => {
        grid.innerHTML += `<div class="ben-card"><div class="ben-icon"><i class="fa-solid fa-user"></i></div><div class="ben-alias">${ben.alias}</div><div class="ben-name">${ben.name}</div><div class="ben-bank">${ben.bank}</div><div style="font-size:0.8rem; margin-top:5px; color:#888;">${ben.account}</div></div>`;
    });
}

// --- FUNCIONES EXTRA ---
window.toggleToken = function() {
    const modal = document.getElementById("token-modal");
    if (modal.classList.contains("hidden")) { modal.classList.remove("hidden"); document.getElementById("token-code").textContent = Math.floor(100000 + Math.random() * 900000); } 
    else { modal.classList.add("hidden"); }
}
window.toggleNFCWallet = function() { document.getElementById("nfc-wallet-modal").classList.toggle("hidden"); }
window.openPayModal = function() { document.getElementById("pay-card-modal").classList.remove("hidden"); }
window.closePayModal = function() { document.getElementById("pay-card-modal").classList.add("hidden"); }
window.setFullPayment = function() { document.getElementById("pay-card-amount").value = currentUser.creditCard.balance; }
window.setMinPayment = function() { document.getElementById("pay-card-amount").value = (currentUser.creditCard.balance * 0.10).toFixed(2); }

function payCreditCard() {
    const origin = document.getElementById("pay-origin-account").value;
    const amount = parseFloat(document.getElementById("pay-card-amount").value);
    if (isNaN(amount) || amount <= 0) return;
    if (amount > currentUser.creditCard.balance) { alert("Monto excede deuda."); return; }
    if (currentUser.accounts[origin] < amount) { alert("Fondos insuficientes."); return; }
    currentUser.accounts[origin] -= amount; currentUser.creditCard.balance -= amount;
    currentUser.movements.push({ concept: "Pago Tarjeta", date: getToday(), amount: -amount });
    saveData(); showNotification("Pago realizado"); closePayModal(); document.getElementById("form-pay-card").reset();
}

function depositCheck() {
    const dest = document.getElementById("check-dest-account").value;
    const amount = parseFloat(document.getElementById("check-amount").value);
    if (isNaN(amount) || amount <= 0) return;
    currentUser.accounts[dest] += amount; currentUser.movements.push({ concept: "Depósito Cheque", date: getToday(), amount: amount });
    saveData(); showNotification("Cheque depositado"); document.getElementById("check-deposit-form").reset();
}
function makeTransfer() {
    const origin = document.getElementById("origin-account").value;
    const amount = parseFloat(document.getElementById("transfer-amount").value);
    if (isNaN(amount) || amount <= 0) return;
    if (currentUser.accounts[origin] < amount) { alert("Fondos insuficientes."); return; }
    currentUser.accounts[origin] -= amount; currentUser.movements.push({ concept: "Transferencia", date: getToday(), amount: -amount });
    saveData(); showNotification("Transferencia exitosa"); document.getElementById("transfer-form").reset();
}
function processLoan() {
    const amount = parseFloat(document.getElementById("loan-amount").value);
    if (isNaN(amount) || amount <= 0) return;
    currentUser.loans.push({ amount: amount }); currentUser.accounts.savings += amount;
    currentUser.movements.push({ concept: "Desembolso Préstamo", date: getToday(), amount: amount });
    saveData(); showNotification("Préstamo aprobado"); document.getElementById("loan-request-form").classList.add("hidden");
}
function showLoanForm() { document.getElementById("loan-request-form").classList.remove("hidden"); }
function saveData() {
    let usersDB = JSON.parse(localStorage.getItem(DB_KEY));
    usersDB[currentUser.username] = currentUser;
    localStorage.setItem(DB_KEY, JSON.stringify(usersDB));
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    updateUI();
}
function getToday() { const d = new Date(); return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`; }
function showNotification(msg) {
    const notif = document.getElementById("notification");
    document.getElementById("notif-msg").textContent = msg;
    notif.classList.remove("hidden");
    setTimeout(() => notif.classList.add("hidden"), 3000);
}