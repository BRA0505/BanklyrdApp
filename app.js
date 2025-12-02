const DB_KEY = "bankly_system_v8"; 
const SESSION_KEY = "bankly_v8_session";

document.addEventListener("DOMContentLoaded", () => { initApp(); });

let currentUser = null;
let pendingAction = null;

function initApp() {
    try {
        const session = localStorage.getItem(SESSION_KEY);
        if (session) { 
            currentUser = JSON.parse(session); 
            if(currentUser && currentUser.username) { showDashboard(); } 
            else { localStorage.removeItem(SESSION_KEY); showAuth(); }
        } else { showAuth(); }
    } catch (e) {
        localStorage.removeItem(SESSION_KEY); showAuth();
    }
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById("go-to-register").onclick = (e) => { e.preventDefault(); toggleView("register"); };
    document.getElementById("go-to-login").onclick = (e) => { e.preventDefault(); toggleView("login"); };
    document.getElementById("register-form").onsubmit = (e) => { e.preventDefault(); registerUser(); };
    document.getElementById("login-form").onsubmit = (e) => { e.preventDefault(); loginUser(); };
    
    // FORMULARIOS DE ACCIÓN
    document.getElementById("transfer-form").onsubmit = (e) => { e.preventDefault(); makeTransfer(); };
    document.getElementById("form-pay-card").onsubmit = (e) => { e.preventDefault(); payCreditCard(); };
    document.getElementById("check-deposit-form").onsubmit = (e) => { e.preventDefault(); depositCheck(); };
    document.getElementById("add-beneficiary-form").onsubmit = (e) => { e.preventDefault(); saveBeneficiary(); };
    document.getElementById("form-loan-request").onsubmit = (e) => { e.preventDefault(); processLoan(); };
    document.getElementById("form-services").onsubmit = (e) => { e.preventDefault(); processPayment("Servicio Pagado"); };
    document.getElementById("form-recharge").onsubmit = (e) => { e.preventDefault(); processPayment("Recarga Exitosa"); };
    document.getElementById("form-chequera").onsubmit = (e) => { e.preventDefault(); simpleRequest("Chequera Solicitada"); };
    document.getElementById("form-limit").onsubmit = (e) => { e.preventDefault(); simpleRequest("Aumento Solicitado"); };
    
    // SETTINGS & RECOVERY
    document.getElementById("form-auth-pin").onsubmit = (e) => { e.preventDefault(); verifyPin(); };
    document.getElementById("change-pass-form").onsubmit = (e) => { e.preventDefault(); changePassword(); };
    document.getElementById("update-profile-form").onsubmit = (e) => { e.preventDefault(); updateProfile(); };
    document.getElementById("forgot-form").onsubmit = (e) => { e.preventDefault(); findPassword(); };
}

// LOGICA PIN DE SEGURIDAD
function requestPin(action) {
    if (!currentUser) { alert("Debes iniciar sesión primero."); return; }
    pendingAction = action;
    document.getElementById("auth-pin-input").value = "";
    openModal("pin-auth-modal");
}

function verifyPin() {
    const inputPin = document.getElementById("auth-pin-input").value;
    if (inputPin === currentUser.pin) {
        closeModal("pin-auth-modal");
        if (pendingAction === 'token') {
            const modal = document.getElementById("token-modal");
            modal.classList.remove("hidden");
            document.getElementById("token-code").textContent = Math.floor(100000 + Math.random() * 900000);
        } else if (pendingAction === 'wallet') {
            document.getElementById("nfc-wallet-modal").classList.remove("hidden");
        }
        pendingAction = null;
    } else {
        alert("PIN Incorrecto");
        document.getElementById("auth-pin-input").value = "";
    }
}

function toggleView(view) {
    if(view === "register") { document.getElementById("login-form").classList.add("hidden"); document.getElementById("register-form").classList.remove("hidden"); }
    else { document.getElementById("register-form").classList.add("hidden"); document.getElementById("login-form").classList.remove("hidden"); }
}

// LOGICA USUARIOS
function registerUser() {
    const user = document.getElementById("reg-user").value.trim();
    const pass = document.getElementById("reg-pass").value.trim();
    const pin = document.getElementById("reg-pin").value.trim();
    if(!user || !pass || !pin) { alert("Campos vacíos."); return; }
    if(pin.length !== 4) { alert("El PIN debe ser de 4 dígitos."); return; }
    let usersDB = JSON.parse(localStorage.getItem(DB_KEY)) || {};
    if (usersDB[user]) { alert("Usuario ya existe."); return; }
    const newUser = {
        username: user, password: pass, pin: pin,
        accounts: { savings: 10000.00, payroll: 25000.00, digital: 5000.00, invest: 50000.00 },
        creditCard: { limit: 50000.00, balance: 1200.00, isBlocked: false },
        loans: [], beneficiaries: [], profile: { email: "", phone: "", notif: true },
        movements: [{ concept: "Bono Bienvenida", date: getToday(), amount: 10000.00 }]
    };
    usersDB[user] = newUser; localStorage.setItem(DB_KEY, JSON.stringify(usersDB));
    alert("¡Cuenta creada! Inicia sesión."); toggleView("login");
}

function loginUser() {
    const user = document.getElementById("login-user").value.trim();
    const pass = document.getElementById("login-pass").value.trim();
    let usersDB = JSON.parse(localStorage.getItem(DB_KEY)) || {};
    const storedUser = usersDB[user];
    if (storedUser && storedUser.password === pass) {
        currentUser = storedUser;
        if(!currentUser.pin) currentUser.pin = "0000";
        if(!currentUser.accounts.invest) currentUser.accounts.invest = 0;
        if(!currentUser.creditCard.hasOwnProperty('isBlocked')) currentUser.creditCard.isBlocked = false;
        localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
        showDashboard();
    } else { alert("Datos incorrectos."); }
}

function logout() { localStorage.removeItem(SESSION_KEY); currentUser = null; location.reload(); }
function showAuth() { document.getElementById("auth-screen").classList.remove("hidden"); document.getElementById("dashboard-screen").classList.add("hidden"); }
function showDashboard() {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("dashboard-screen").classList.remove("hidden");
    document.getElementById("display-username").textContent = currentUser.username;
    // Nuevo: Poner nombre en el sidebar footer
    document.getElementById("sidebar-username").textContent = currentUser.username;
    setGreeting(); updateUI();
}

function updateUI() {
    const fmt = (n) => "RD$ " + n.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById("bal-savings").textContent = fmt(currentUser.accounts.savings);
    document.getElementById("bal-payroll").textContent = fmt(currentUser.accounts.payroll);
    document.getElementById("bal-digital").textContent = fmt(currentUser.accounts.digital);
    document.getElementById("bal-invest").textContent = fmt(currentUser.accounts.invest);
    document.getElementById("cc-balance").textContent = fmt(currentUser.creditCard.balance);
    document.getElementById("modal-cc-debt").textContent = fmt(currentUser.creditCard.balance);
    const tbody = document.getElementById("movements-body"); tbody.innerHTML = "";
    currentUser.movements.slice().reverse().slice(0, 5).forEach(m => { 
        tbody.innerHTML += `<tr><td>${m.concept}</td><td>${m.date}</td><td style="font-weight:600; color:${m.amount > 0 ? 'green' : 'red'}">${fmt(m.amount)}</td></tr>`;
    });
    renderChart(); renderBeneficiaries();
    const cardVisual = document.getElementById("my-credit-card");
    if(currentUser.creditCard.isBlocked) { cardVisual.classList.add("blocked"); } else { cardVisual.classList.remove("blocked"); }
}

function toggleCardBlock() {
    currentUser.creditCard.isBlocked = !currentUser.creditCard.isBlocked;
    saveData();
    const msg = currentUser.creditCard.isBlocked ? "Tarjeta BLOQUEADA" : "Tarjeta DESBLOQUEADA";
    showNotification(msg);
    updateUI();
    navigate('cards');
}

window.toggleSidebar = function() { document.getElementById("main-sidebar").classList.toggle("collapsed"); }
window.toggleSubmenu = function(id, iconId) {
    const menu = document.getElementById(id);
    const icon = document.getElementById(iconId);
    if (menu.classList.contains('open')) { menu.classList.remove('open'); icon.classList.remove('rotate-chevron'); } 
    else { document.querySelectorAll('.sub-menu').forEach(m => m.classList.remove('open')); document.querySelectorAll('.chevron').forEach(c => c.classList.remove('rotate-chevron')); menu.classList.add('open'); icon.classList.add('rotate-chevron'); }
}

window.navigate = function(viewId) { document.querySelectorAll(".view-section").forEach(s => s.classList.add("hidden")); const target = document.getElementById(`view-${viewId}`); if(target) target.classList.remove("hidden"); }

function renderChart() {
    let income = 0, expense = 0;
    currentUser.movements.forEach(m => { if(m.amount > 0) income += m.amount; else expense += Math.abs(m.amount); });
    const total = income + expense;
    const pct = total === 0 ? 0 : Math.round((income / total) * 100);
    document.getElementById("expense-chart").style.background = `conic-gradient(#00a8e8 0% ${pct}%, #eee ${pct}% 100%)`;
    document.getElementById("chart-percent").textContent = pct + "%";
}

window.prepareTransfer = function(type) {
    navigate('transfers');
    const title = document.getElementById('transfer-title'); const destLabel = document.getElementById('dest-label'); const bankSelect = document.getElementById('dest-bank');
    if(type === 'me') { title.textContent = "Transferir entre mis cuentas"; destLabel.textContent = "Cuenta Destino"; bankSelect.innerHTML = "<option>Cuenta Nómina</option><option>Cuenta Digital</option>"; } 
    else if(type === 'third') { title.textContent = "Transferir a Terceros (Bankly)"; destLabel.textContent = "Banco"; bankSelect.innerHTML = "<option>Bankly</option>"; } 
    else if(type === 'ach') { title.textContent = "Transferir Otros Bancos (ACH/LBTR)"; destLabel.textContent = "Banco Destino"; bankSelect.innerHTML = "<option>Banco Popular</option><option>BHD</option><option>Banreservas</option><option>Scotiabank</option>"; }
}

function makeTransfer() {
    const origin = document.getElementById("origin-account").value; const amount = parseFloat(document.getElementById("transfer-amount").value);
    if(amount <= 0 || currentUser.accounts[origin] < amount) { alert("Saldo insuficiente."); return; }
    currentUser.accounts[origin] -= amount; currentUser.movements.push({ concept: "Transferencia", date: getToday(), amount: -amount });
    saveData(); showNotification("Transferencia enviada"); document.getElementById("transfer-form").reset();
}

function processPayment(msg) {
    if(currentUser.creditCard.isBlocked) { alert("Tarjeta Bloqueada. No puede realizar pagos."); return; }
    showNotification(msg); document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
}

function payCreditCard() {
    const origin = document.getElementById("pay-origin-account").value; const amount = parseFloat(document.getElementById("pay-card-amount").value);
    if(amount > currentUser.creditCard.balance) { alert("Monto excede deuda"); return; }
    if(currentUser.accounts[origin] < amount) { alert("Fondos insuficientes"); return; }
    currentUser.accounts[origin] -= amount; currentUser.creditCard.balance -= amount;
    currentUser.movements.push({ concept: "Pago Tarjeta", date: getToday(), amount: -amount });
    saveData(); showNotification("Tarjeta pagada"); closeModal('pay-card-modal');
}

function simpleRequest(msg) { showNotification(msg); document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden")); }
function depositCheck() {
    const dest = document.getElementById("check-dest-account").value; const amount = parseFloat(document.getElementById("check-amount").value);
    currentUser.accounts[dest] += amount; currentUser.movements.push({ concept: "Depósito Cheque", date: getToday(), amount: amount });
    saveData(); showNotification("Cheque depositado");
}
function saveBeneficiary() {
    const name = document.getElementById("ben-name").value; const alias = document.getElementById("ben-alias").value;
    currentUser.beneficiaries.push({ name, alias }); saveData(); showNotification("Beneficiario guardado"); hideAddBeneficiaryForm();
}
function renderBeneficiaries() {
    const grid = document.getElementById("beneficiaries-list"); grid.innerHTML = "";
    currentUser.beneficiaries.forEach(b => { grid.innerHTML += `<div class="ben-card"><div class="ben-icon"><i class="fa-solid fa-user"></i></div><div class="ben-alias">${b.alias}</div></div>`; });
}

function saveData() { let u = JSON.parse(localStorage.getItem(DB_KEY)); u[currentUser.username] = currentUser; localStorage.setItem(DB_KEY, JSON.stringify(u)); localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); updateUI(); }
function getToday() { const d = new Date(); return `${d.getDate()}/${d.getMonth()+1}`; }
function setGreeting() { const h = new Date().getHours(); document.getElementById("dynamic-greeting").textContent = h < 12 ? "Buenos días," : h < 19 ? "Buenas tardes," : "Buenas noches,"; }
function showNotification(m) { const n = document.getElementById("notification"); document.getElementById("notif-msg").textContent = m; n.classList.remove("hidden"); setTimeout(() => n.classList.add("hidden"), 3000); }
window.dummyAction = (a) => showNotification(`Acción: ${a}`);

// MODAL CONTROLS
window.openModal = (id) => document.getElementById(id).classList.remove("hidden");
window.closeModal = (id) => document.getElementById(id).classList.add("hidden");
window.toggleSettings = () => { const m = document.getElementById("settings-modal"); m.classList.contains("hidden") ? m.classList.remove("hidden") : m.classList.add("hidden"); };
window.toggleToken = () => { const m=document.getElementById("token-modal"); m.classList.toggle("hidden"); if(!m.classList.contains("hidden")) document.getElementById("token-code").textContent = Math.floor(100000+Math.random()*900000); };
window.toggleNFCWallet = () => document.getElementById("nfc-wallet-modal").classList.toggle("hidden");
window.showTab = (t) => { document.querySelectorAll(".tab-content").forEach(x=>x.classList.add("hidden")); document.getElementById(`tab-${t}`).classList.remove("hidden"); document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active")); event.target.classList.add("active"); };
window.showAddBeneficiaryForm = () => document.getElementById("add-beneficiary-container").classList.remove("hidden");
window.hideAddBeneficiaryForm = () => document.getElementById("add-beneficiary-container").classList.add("hidden");
window.togglePass = (id) => { const i = document.getElementById(id); i.type = i.type === "password" ? "text" : "password"; };
window.toggleForgotModal = () => document.getElementById("forgot-modal").classList.toggle("hidden");
function findPassword() { const user = document.getElementById("recover-user").value.trim(); let usersDB = JSON.parse(localStorage.getItem(DB_KEY)) || {}; const res = document.getElementById("recover-result"); if(usersDB[user]) { res.textContent = `Tu clave es: ${usersDB[user].password}`; res.classList.remove("hidden"); } else { res.textContent = "Usuario no encontrado"; res.classList.remove("hidden"); } }
function changePassword() { const newPass = document.getElementById("new-pass").value.trim(); if(newPass) { currentUser.password = newPass; saveData(); showNotification("Clave actualizada"); toggleSettings(); } }
function updateProfile() { showNotification("Perfil guardado"); toggleSettings(); }
function processLoan() { const a = parseFloat(document.getElementById("loan-amount").value); currentUser.loans.push({amount:a}); currentUser.accounts.savings += a; saveData(); showNotification("Préstamo aprobado"); }
function showLoanForm() { document.getElementById("loan-request-form").classList.remove("hidden"); }