const API_BASE_URL = 'https://project-ads-dx4s.onrender.com';
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

document.addEventListener('DOMContentLoaded', async function () {
	await initClerk();

	function formatCurrency(value) {
		return (
			'$' +
			parseFloat(value).toLocaleString('en-US', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			})
		);
	}

	function updateCards(data) {
		const presupuestoCard = document.querySelector('#presupuesto_total .card-value');
		const gastadoTrend = document.querySelector('#presupuesto_total .trend-value');

		presupuestoCard.textContent = `$${data.presupuesto_total}`;
		gastadoTrend.textContent = `Gastado: $${data.gastado} (${data.porcentaje.toFixed(2)}%)`;

		const restanteCard = document.querySelector('#restante .card-value');
		restanteCard.textContent = `$${data.restante}`;

		const mesesEnEspanol = {
			January: 'Enero',
			February: 'Febrero',
			March: 'Marzo',
			April: 'Abril',
			May: 'Mayo',
			June: 'Junio',
			July: 'Julio',
			August: 'Agosto',
			September: 'Septiembre',
			October: 'Octubre',
			November: 'Noviembre',
			December: 'Diciembre'
		};

		const mesCard = document.querySelector('#mes_mas_frecuente .card-value');
		const mesTrend = document.querySelector('#mes_mas_frecuente .trend-value');

		const mesEnEspanol = mesesEnEspanol[data.mes_masfrecuente.mes] || data.mes_masfrecuente.mes;
		mesCard.textContent = mesEnEspanol;

		const gastadoNumerico = parseFloat(data.gastado.replace(/,/g, ''));
		const porcentajeMes = (data.mes_masfrecuente.Cuenta / gastadoNumerico) * 100;
		mesTrend.textContent = `$${data.mes_masfrecuente.Cuenta.toLocaleString('en-US')} (${porcentajeMes.toFixed(1)}%)`;
	}

	function updateCampanasTable(campanasData) {
		const tableBody = document.querySelector('#tablaCampanas tbody');
		tableBody.innerHTML = '';

		Object.entries(campanasData).forEach(([nombre, meses], index) => {
			const row = document.createElement('tr');
			row.style.setProperty('--row-order', index);

			const total = meses.reduce((sum, value) => sum + value, 0);

			const descCell = document.createElement('td');
			descCell.innerHTML = `
                <div class="category-wrapper">
                    <i class="fab fa-${nombre.toLowerCase()} icon-category"></i>
                    CAMPAÑAS ${nombre.toUpperCase()}
                </div>
            `;

			const monthCells = meses.map((value) => {
				const cell = document.createElement('td');
				if (value === 0) {
					cell.className = 'amount-cell zero';
					cell.textContent = '$0.00';
				} else {
					cell.className = 'amount-cell';
					cell.innerHTML = `
                        ${formatCurrency(value)}
                        <div class="value-bar" style="width: ${(value / Math.max(...meses.filter((v) => v > 0))) * 100 || 0}%"></div>
                    `;
				}
				return cell;
			});

			const totalCell = document.createElement('td');
			totalCell.className = 'amount-cell';
			totalCell.innerHTML = `
                ${formatCurrency(total)}
                <div class="value-bar" style="width: 100%"></div>
            `;

			row.appendChild(descCell);
			monthCells.forEach((cell) => row.appendChild(cell));
			row.appendChild(totalCell);

			tableBody.appendChild(row);
		});

		addTotalRow(campanasData);

		addRowInteractivity();
	}

	function addTotalRow(campanasData) {
		const tableBody = document.querySelector('#tablaCampanas tbody');
		const row = document.createElement('tr');
		row.className = 'total-row';
		row.style.setProperty('--row-order', Object.keys(campanasData).length);

		const mesesTotales = Array(12).fill(0);
		Object.values(campanasData).forEach((meses) => {
			meses.forEach((value, index) => {
				mesesTotales[index] += value;
			});
		});

		const granTotal = mesesTotales.reduce((sum, value) => sum + value, 0);

		const descCell = document.createElement('td');
		descCell.innerHTML = `
            <div class="category-wrapper">
                <i class="fas fa-calculator icon-category"></i>
                TOTALES
            </div>
        `;

		const monthCells = mesesTotales.map((value) => {
			const cell = document.createElement('td');
			if (value === 0) {
				cell.className = 'amount-cell zero';
				cell.textContent = '$0.00';
			} else {
				cell.className = 'amount-cell';
				cell.innerHTML = `
                    ${formatCurrency(value)}
                    <div class="value-bar" style="width: ${(value / Math.max(...mesesTotales.filter((v) => v > 0))) * 100 || 0}%"></div>
                `;
			}
			return cell;
		});

		const totalCell = document.createElement('td');
		totalCell.className = 'amount-cell grand-total';
		totalCell.innerHTML = `
            ${formatCurrency(granTotal)}
            <div class="value-bar" style="width: 100%"></div>
        `;

		row.appendChild(descCell);
		monthCells.forEach((cell) => row.appendChild(cell));
		row.appendChild(totalCell);

		tableBody.appendChild(row);
	}

	function addRowInteractivity() {
		const rows = document.querySelectorAll('#tablaCampanas tbody tr');

		rows.forEach((row) => {
			row.addEventListener('mouseenter', function () {
				this.style.backgroundColor = 'rgba(247, 37, 133, 0.05)';
			});

			row.addEventListener('mouseleave', function () {
				this.style.backgroundColor = '';
			});
		});
	}

	function agregarNuevaCampana(nombreCampana) {
		const fechaActual = new Date().toISOString().split('T')[0];

		const datos = {
			nombre_campañas: nombreCampana,
			fecha_creacion: fechaActual,
			activa: true
		};

		fetchConToken(`${API_BASE_URL}/campanas/apihead/`, {
			method: 'POST',
			body: JSON.stringify(datos)
		})
			.then((response) => {
				if (!response.ok) throw new Error('Error en la respuesta del servidor');
				return response.json();
			})
			.then((data) => {
				nuevaCampanaId = data.id;

				const modalCampana = bootstrap.Modal.getInstance(document.getElementById('agregarCampanaModal'));
				modalCampana.hide();

				cargarDatosAPI().then(() => {
					Swal.fire({
						icon: 'success',
						title: '¡Éxito!',
						text: 'Campaña registrada correctamente',
						showConfirmButton: false,
						timer: 1500
					});

					const modalGastos = new bootstrap.Modal(document.getElementById('agregarGastosModal'));
					modalGastos.show();
				});
			})
			.catch((error) => {
				console.error('Error:', error);
				Swal.fire({
					icon: 'error',
					title: 'Error',
					text: 'Error al registrar la campaña: ' + error.message
				});
			});
	}

	function cargarDatosAPI() {
		return fetchConToken(`${API_BASE_URL}/campanas/apidescrip/resumencampanas/`, {
			method: 'GET'
		})
			.then((response) => {
				if (!response.ok) throw new Error('Error en la respuesta del servidor');
				return response.json();
			})
			.then((data) => {
				updateCards(data);

				if (data.campanas) {
					updateCampanasTable(data.campanas);
				}
				return data;
			})
			.catch((error) => {
				console.error('Error al obtener datos de la API:', error);
				throw error;
			});
	}

	let nuevaCampanaId = null;

	function limpiarModal() {
		document.getElementById('nombreCampana').value = '';
	}

	document.getElementById('agregarCampanaModal').addEventListener('hidden.bs.modal', function () {
		limpiarModal('agregarCampanaModal');
	});

	document.getElementById('agregarGastosModal').addEventListener('hidden.bs.modal', function () {
		limpiarModal('agregarGastosModal');
	});

	function agregarNuevaCampana(nombreCampana) {
		const fechaActual = new Date().toISOString().split('T')[0];

		const datos = {
			nombre_campañas: nombreCampana,
			fecha_creacion: fechaActual,
			activa: true
		};

		fetchConToken(`${API_BASE_URL}/campanas/apihead/`, {
			method: 'POST',
			body: JSON.stringify(datos)
		})
			.then((response) => {
				if (!response.ok) throw new Error('Error en la respuesta del servidor');
				return response.json();
			})
			.then((data) => {
				nuevaCampanaId = data.id;

				const modalCampana = bootstrap.Modal.getInstance(document.getElementById('agregarCampanaModal'));
				modalCampana.hide();

				const modalGastos = new bootstrap.Modal(document.getElementById('agregarGastosModal'));
				modalGastos.show();
			})
			.catch((error) => {
				console.error('Error:', error);
				alert('Error al registrar la campaña: ' + error.message);
			});
	}

	function registrarGastos() {
		if (typeof Swal === 'undefined') {
			console.error('SweetAlert2 no está cargado correctamente');
			alert('Error de configuración del sistema');
			return;
		}

		const formGastos = document.getElementById('formGastos');
		if (!formGastos) {
			console.error('No se encontró el formulario de gastos');
			return;
		}

		if (!formGastos.checkValidity()) {
			formGastos.reportValidity();
			return;
		}

		const getValue = (id) => {
			const element = document.getElementById(id);
			return element ? element.value : null;
		};

		const datosGastos = {
			fecha_pago: getValue('fechaPago'),
			tipo_evento: getValue('tipoEvento'),
			tipo_contendido: getValue('tipoContenido'),
			duracion: parseInt(getValue('duracion')) || 0,
			alcance: parseInt(getValue('alcance')) || 0,
			inversion: parseFloat(getValue('inversion')) || 0,
			head_id: nuevaCampanaId
		};

		if (!datosGastos.head_id) {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: 'No se ha seleccionado una campaña válida',
				confirmButtonClass: 'btn btn-primary'
			});
			return;
		}

		Swal.fire({
			title: 'Registrando gastos...',
			allowOutsideClick: false,
			didOpen: () => Swal.showLoading()
		});

		fetchConToken(`${API_BASE_URL}/campanas/apidescrip/`, {
			method: 'POST',
			body: JSON.stringify(datosGastos)
		})
			.then((response) => {
				if (!response.ok) {
					return response.json().then((err) => {
						throw new Error(err.message || `Error del servidor: ${response.status}`);
					});
				}
				return response.json();
			})
			.then((data) => {
				Swal.fire({
					icon: 'success',
					title: '¡Éxito!',
					text: 'Gastos registrados correctamente',
					confirmButtonClass: 'btn btn-primary'
				}).then(() => {
					const modal = bootstrap.Modal.getInstance(document.getElementById('agregarGastosModal'));
					if (modal) modal.hide();

					document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
					document.body.classList.remove('modal-open');

					cargarDatosAPI();
				});
			})
			.catch((error) => {
				Swal.fire({
					icon: 'error',
					title: 'Error',
					text: error.message,
					confirmButtonClass: 'btn btn-primary'
				});
			});
	}

	document.getElementById('guardarCampanaBtn').addEventListener('click', function () {
		const nombreCampana = document.getElementById('nombreCampana').value.trim();

		if (nombreCampana === '') {
			Swal.fire({
				icon: 'warning',
				title: 'Campo requerido',
				text: 'Por favor ingresa un nombre para la campaña',
				confirmButtonClass: 'btn btn-primary'
			});
			return;
		}

		agregarNuevaCampana(nombreCampana);
	});

	document.getElementById('guardarGastosBtn').addEventListener('click', function () {
		if (!document.getElementById('formGastos').checkValidity()) {
			alert('Por favor completa todos los campos requeridos');
			return;
		}

		registrarGastos();
	});

	cargarDatosAPI();
});
