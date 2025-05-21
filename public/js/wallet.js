const API_BASE_URL = 'https://project-ads-dx4s.onrender.com';
const FRONTEND_API = 'fair-mastodon-60.clerk.accounts.dev';
let globalToken = null;

async function fetchConToken(url, opciones = {}) {
	if (!globalToken) {
		console.error('❌ Token no disponible todavía');
		throw new Error('Token no disponible');
	}

	const headers = {
		...(opciones.headers || {}),
		Authorization: `Bearer ${globalToken}`,
		'Content-Type': 'application/json'
	};

	return fetch(url, {
		...opciones,
		headers
	});
}

async function waitForClerk() {
	return new Promise((resolve) => {
		const interval = setInterval(() => {
			if (window.Clerk) {
				clearInterval(interval);
				resolve();
			}
		}, 50);
	});
}

async function initClerk() {
	await waitForClerk();

	try {
		await window.Clerk.load();

		const session = window.Clerk.session;

		if (!session) {
			console.error('❌ No hay sesión activa');
			return;
		}

		const token = await session.getToken();
		globalToken = token;
	} catch (error) {
		console.error('Error en initClerk:', error);
	}
}

function formatCurrency(amount) {
	return '$' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function formatDate(dateString) {
	const options = { day: 'numeric', month: 'short', year: 'numeric' };
	return new Date(dateString).toLocaleDateString('es-ES', options);
}

function getTransactionIcon(type) {
	switch (type) {
		case 'CREDITO':
			return '<i class="fas fa-arrow-up"></i>';
		case 'DEBITO':
			return '<i class="fas fa-arrow-down"></i>';
		default:
			return '<i class="fas fa-exchange-alt"></i>';
	}
}

function getTransactionTitle(type) {
	switch (type) {
		case 'CREDITO':
			return 'Ingreso registrado';
		case 'DEBITO':
			return 'Gasto registrado';
		default:
			return 'Movimiento registrado';
	}
}

function renderTransactions(transactions) {
	const transactionList = document.getElementById('transaction-list');
	transactionList.innerHTML = '';

	if (transactions.length === 0) {
		transactionList.innerHTML = `
                    <div class="transaction-empty">
                        <i class="fas fa-info-circle"></i>
                        <span>No hay transacciones para mostrar</span>
                    </div>
                `;
		return;
	}

	transactions.forEach((transaction) => {
		const isIncome = transaction.tipo_de_movimiento === 'CREDITO';
		const transactionClass = isIncome ? 'income' : 'expense';
		const amountSign = isIncome ? '+' : '-';

		const transactionElement = document.createElement('div');
		transactionElement.className = `transaction-card ${transaction.tipo_de_movimiento}`;
		transactionElement.innerHTML = `
                    <div class="transaction-icon ${transactionClass}">
                        ${getTransactionIcon(transaction.tipo_de_movimiento)}
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-title">${getTransactionTitle(transaction.tipo_de_movimiento)}</div>
                        <div class="transaction-meta">
                            <span>Saldo anterior: ${formatCurrency(transaction.ultimo_monto)}</span>
                            <span>${formatDate(transaction.fecha_ingreso)}</span>
                        </div>
                    </div>
                    <div class="transaction-amount ${transactionClass}">
                        ${amountSign}${formatCurrency(transaction.monto)}
                    </div>
                `;

		transactionList.appendChild(transactionElement);
	});
}

function setupFilterTabs() {
	const tabs = document.querySelectorAll('.filter-tabs .tab');
	tabs.forEach((tab) => {
		tab.addEventListener('click', function () {
			tabs.forEach((t) => t.classList.remove('active'));

			this.classList.add('active');

			const filter = this.getAttribute('data-filter');
			filterTransactions(filter);
		});
	});
}

function filterTransactions(filter) {
	if (filter === 'all') {
		renderTransactions(window.allTransactions);
	} else {
		const filtered = window.allTransactions.filter((t) => t.tipo_de_movimiento === filter);
		renderTransactions(filtered);
	}
}

async function loadData() {
	await initClerk();
	document.getElementById('loading-overlay').style.display = 'flex';

	fetchConToken(`${API_BASE_URL}/wallet/apiwallet/`, {
		method: 'GET'
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		})
		.then((data) => {
			document.getElementById('balance-amount').textContent = formatCurrency(data.balance);
			document.querySelector('#balance-ingresos span').textContent = `Ingresos: ${formatCurrency(data.total_ingresos)}`;
			document.querySelector('#balance-gastos span').textContent = `Gastos: ${formatCurrency(data.total_gastos)}`;

			window.allTransactions = data.registros;
			renderTransactions(data.registros);
			setupFilterTabs();
		})
		.catch((error) => {
			console.error('Error al obtener los datos:', error);

			document.getElementById('transaction-list').innerHTML = `
                        <div class="transaction-error">
                            <i class="fas fa-exclamation-circle"></i>
                            <span>Error al cargar los datos. Intente nuevamente más tarde.</span>
                        </div>
                    `;
		})
		.finally(() => {
			setTimeout(() => {
				document.getElementById('loading-overlay').style.display = 'none';
			}, 1000);
		});
}

document.addEventListener('DOMContentLoaded', loadData);
