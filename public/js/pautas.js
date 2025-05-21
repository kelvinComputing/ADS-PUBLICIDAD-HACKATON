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

document.addEventListener('DOMContentLoaded', async function () {
	await initClerk();

	let listaPautasGlobal = [];
	let pautasDataGlobal = {};
	const API_BASE_URL = 'https://project-ads-dx4s.onrender.com';

	const elements = {
		pautaModal: document.getElementById('pautaModal'),
		editPautaModal: document.getElementById('pauta-modal-edicion'),
		btnAddPauta: document.getElementById('btnAddPauta'),
		btnReasignar: document.getElementById('btnReasignar'),
		modalReasignar: document.getElementById('modalReasignar'),
		closeReasignarModal: document.getElementById('closeReasignarModal'),
		cancelarReasignar: document.getElementById('cancelarReasignar'),
		reasignarForm: document.getElementById('reasignarForm'),
		selectModelo: document.getElementById('selectModelo'),
		selectPauta: document.getElementById('selectPauta'),
		pautaForm: document.getElementById('pautaForm'),
		modeloPautaSelect: document.getElementById('modeloPauta')
	};

	// funcion de utilidades
	function mostrarNotificacion(tipo, mensaje) {
		if (tipo === 'success') {
			Swal.fire({
				icon: 'success',
				title: 'Éxito',
				text: mensaje,
				timer: 3000,
				showConfirmButton: false
			});
		} else {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: mensaje
			});
		}
	}

	function limpiarModalPauta() {
		const fieldsToClear = [
			'pauta-modelo-titulo',
			'pauta-editar-fecha',
			'pauta-editar-nombre',
			'pauta-editar-ubicacion',
			'pauta-editar-monto',
			'pauta-editar-estado',
			'pauta-editar-pauta-id',
			'pauta-editar-modelo-id'
		];

		fieldsToClear.forEach((id) => {
			const element = document.getElementById(id);
			if (element) {
				if (element.tagName === 'INPUT' || element.tagName === 'SELECT') {
					element.value = '';
				} else if (element.tagName === 'H3') {
					element.textContent = '';
				}
			}
		});

		['pauta-auth-comercial', 'pauta-auth-directiva'].forEach((name) => {
			const radios = document.querySelectorAll(`input[name="${name}"]`);
			radios.forEach((radio) => (radio.checked = false));
		});

		const errorMsg = document.getElementById('pauta-error-msg');
		if (errorMsg) {
			errorMsg.textContent = '';
			errorMsg.style.display = 'none';
		}
	}

	async function cargarModelos(selectElement = 'modeloPauta') {
		const select = typeof selectElement === 'string' ? document.getElementById(selectElement) : selectElement;
		if (!select) return;

		try {
			select.innerHTML = '<option value="">Cargando modelos...</option>';
			const response = await fetchConToken(`${API_BASE_URL}/modelos/api/head/`, {
				method: 'GET'
			});

			if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

			const modelos = await response.json();
			select.innerHTML = '<option value="">Seleccionar modelo</option>';

			modelos.forEach((modelo) => {
				const option = document.createElement('option');
				option.value = modelo.id;
				option.textContent = `${modelo.nombres} ${modelo.apellidos}`;
				select.appendChild(option);
			});
		} catch (error) {
			console.error('Error al cargar modelos:', error);
			select.innerHTML = '<option value="">Error al cargar modelos</option>';
			setTimeout(() => cargarModelos(select), 5000);
		}
	}

	async function actualizarTarjetas() {
		document.querySelectorAll('.card-value').forEach((el) => {
			el.textContent = 'Cargando...';
			el.className = 'card-value loading';
		});

		document.querySelectorAll('.card-trend').forEach((el) => {
			el.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizando...';
			el.className = 'card-trend trend-neutral';
		});

		try {
			const response = await fetchConToken(`${API_BASE_URL}/pautas/apipautas/general/`, {
				method: 'GET'
			});

			if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

			const data = await response.json();

			const pendientesElement = document.querySelector('#PautasPendientes .card-value');
			const activasElement = document.querySelector('#PautasActivas .card-value');
			const inversionElement = document.querySelector('#InversionTotal .card-value');
			const procesadaElement = document.querySelector('#PautasProcesadas .card-value');

			if (pendientesElement) {
				pendientesElement.textContent = data.pendientes;
				pendientesElement.className = 'card-value';
			}

			if (activasElement) {
				activasElement.textContent = data.activas;
				activasElement.className = 'card-value';
			}

			if (inversionElement) {
				inversionElement.textContent = `$${data.inversion_Total.toLocaleString()}`;
				inversionElement.className = 'card-value';
			}

			if (procesadaElement) {
				procesadaElement.textContent = data.total_procesadas;
				procesadaElement.className = 'card-value';
			}

			document.querySelectorAll('.card-trend').forEach((el) => {
				el.className = 'card-trend trend-neutral';
				el.innerHTML = '<i class="fas fa-equals"></i> Actualizado';
			});
		} catch (error) {
			console.error('Error al obtener datos:', error);

			document.querySelectorAll('.card-value').forEach((el) => {
				el.textContent = 'Error';
				el.className = 'card-value error';
			});

			document.querySelectorAll('.card-trend').forEach((el) => {
				el.className = 'card-trend trend-error';
				el.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error al cargar';
			});

			setTimeout(actualizarTarjetas, 10000);
		}
	}

	async function cargarTablaPautas() {
		const tbody = document.querySelector('.pautas-table tbody');
		if (!tbody) return;

		try {
			tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-message">
                        <i class="fas fa-spinner fa-spin"></i> Cargando datos de pautas...
                    </td>
                </tr>
            `;

			const response = await fetchConToken(`${API_BASE_URL}/pautas/apipautas/general/`, {
				method: 'GET'
			});

			if (!response.ok) throw new Error('Error al cargar los datos');

			const data = await response.json();
			pautasDataGlobal = data;
			listaPautasGlobal = data.lista_pautas || [];

			if (!data.lista_pautas || data.lista_pautas.length === 0) {
				tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="no-data-message">
                            No se encontraron pautas registradas
                        </td>
                    </tr>
                `;
				return;
			}

			tbody.innerHTML = '';

			data.lista_pautas.forEach((pauta) => {
				const row = document.createElement('tr');

				let statusClass = '';
				let statusText = pauta.status_pauta || 'Pendiente';

				switch (pauta.status_pauta.toLowerCase()) {
					case 'activa':
						statusClass = 'pauta-status--active';
						statusText = 'Activa';
						break;
					case 'pendiente':
						statusClass = 'pauta-status--pending';
						statusText = 'Pendiente';
						break;
					default:
						statusClass = 'pauta-status--processed';
						statusText = 'Procesada';
				}

				const authComercialText = pauta.autorizacio_comercial === true || pauta.autorizacio_comercial === 'true' ? 'Aprobada' : 'Rechazada';

				const authDirectivaText = pauta.autorizacion_directiva === true || pauta.autorizacion_directiva === 'true' ? 'Aprobada' : 'Rechazada';

				const authComercialClass = authComercialText === 'Aprobada' ? 'auth-badge--approved' : 'auth-badge--rejected';

				const authDirectivaClass = authDirectivaText === 'Aprobada' ? 'auth-badge--approved' : 'auth-badge--rejected';

				let fechaFormateada = 'Fecha no válida';
				try {
					const fechaParts = pauta.fecha.split('-');
					if (fechaParts.length === 3) {
						fechaFormateada = `${fechaParts[2]}/${fechaParts[1]}/${fechaParts[0]}`;
					}
				} catch (e) {
					console.error('Error formateando fecha:', e);
				}

				row.innerHTML = `
                    <td class="fecha-cell">${fechaFormateada}</td>
                    <td class="nombre-pauta-cell">${pauta.nombre_pauta}</td>
                    <td class="ubicacion-cell">${pauta.ubicacion_pauta}</td>
                    <td class="modelo-cell">
                        <div class="modelo-info">
                            <div class="modelo-details">
                                <span class="modelo-name">${pauta.modelo}</span>
                            </div>
                        </div>
                    </td>
                    <td class="autorizaciones-cell">
                        <div class="auth-badges">
                            <span class="auth-badge ${authComercialClass}" title="Autorización Comercial">
                                <i class="fas ${authComercialText === 'Aprobada' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                ${authComercialText}
                            </span>
                            <span class="auth-badge ${authDirectivaClass}" title="Autorización Directiva">
                                <i class="fas ${authDirectivaText === 'Aprobada' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                ${authDirectivaText}
                            </span>
                        </div>
                    </td>
                    <td class="monto-cell">$${pauta.monto_de_pauta ? pauta.monto_de_pauta.toLocaleString() : '0'}</td>
                    <td class="estado-cell">
                        <span class="pauta-status ${statusClass}">
                            <span class="pauta-status__circle"></span>
                            <span class="pauta-status__text">${statusText}</span>
                        </span>
                    </td>
                    <td class="action-cell">
                        <div class="action-buttons">
                            <button class="btn-action edit" title="Editar pauta" data-pauta-id="${pauta.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action delete" title="Eliminar pauta" data-pauta-id="${pauta.id}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                `;

				row.querySelector('.edit').setAttribute('data-pauta-id', pauta.id_pauta);
				row.querySelector('.delete').setAttribute('data-pauta-id', pauta.id_pauta);

				tbody.appendChild(row);
			});

			document.querySelector('.pautas-table').addEventListener('click', function (e) {
				if (e.target.closest('.edit')) {
					const button = e.target.closest('.edit');
					const pautaId = button.getAttribute('data-pauta-id');
					abrirModalEdicion(pautaId);
				}

				if (e.target.closest('.delete')) {
					const button = e.target.closest('.delete');
					const pautaId = button.getAttribute('data-pauta-id');
					confirmarEliminacion(pautaId);
				}
			});
		} catch (error) {
			console.error('Error al cargar la tabla de pautas:', error);
			tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="error-message">
                        <i class="fas fa-exclamation-triangle"></i> Error al cargar los datos. Intente nuevamente.
                    </td>
                </tr>
            `;
			setTimeout(cargarTablaPautas, 5000);
		}
	}

	// funciones manejar modales
	function setupModalEvents() {
		// modal de crear pautas
		if (elements.btnAddPauta) {
			elements.btnAddPauta.addEventListener('click', function () {
				elements.pautaModal.classList.add('active');
				elements.pautaModal.querySelector('.modal-container').classList.add('animate__animated', 'animate__fadeIn');
				cargarModelos();
			});
		}

		// modal de reasignación
		if (elements.btnReasignar) {
			elements.btnReasignar.addEventListener('click', openReasignarModal);
		}

		const closeModalElements = [document.getElementById('closeModal'), document.getElementById('cancelPauta'), elements.closeReasignarModal, elements.cancelarReasignar];

		closeModalElements.forEach((element) => {
			if (element) element.addEventListener('click', closeModalHandler);
		});

		// cerrar modal desde afuera
		if (elements.pautaModal) {
			const modalContainer = elements.pautaModal.querySelector('.modal-container');
			if (modalContainer) {
				modalContainer.addEventListener('click', function (e) {
					e.stopPropagation();
				});
			}

			elements.pautaModal.addEventListener('click', closeModalHandler);
		}

		// envio del formulario
		if (elements.pautaForm) {
			elements.pautaForm.addEventListener('submit', handleFormSubmit);
		}

		// modal de edición
		document.querySelector('.pauta-close-modal')?.addEventListener('click', () => {
			elements.editPautaModal.style.display = 'none';
			limpiarModalPauta();
		});

		document.querySelector('.pauta-btn-cancelar')?.addEventListener('click', () => {
			elements.editPautaModal.style.display = 'none';
			limpiarModalPauta();
		});

		window.addEventListener('click', (event) => {
			if (event.target === elements.editPautaModal) {
				elements.editPautaModal.style.display = 'none';
				limpiarModalPauta();
			}
		});

		if (elements.modalReasignar) {
			elements.modalReasignar.addEventListener('click', function (e) {
				if (e.target === elements.modalReasignar) closeModalHandler();
			});
		}

		if (elements.reasignarForm) {
			elements.reasignarForm.addEventListener('submit', handleReasignarSubmit);
		}
	}

	function closeModalHandler() {
		// cerrar modal de creacion
		if (elements.pautaModal?.classList.contains('active')) {
			elements.pautaModal.classList.remove('active');
			elements.pautaModal.querySelector('.modal-container').classList.add('animate__animated', 'animate__fadeOut');
			setTimeout(() => {
				elements.pautaModal.querySelector('.modal-container').classList.remove('animate__animated', 'animate__fadeOut');
			}, 300);
		}

		// cerrar modal de reasignación
		if (elements.modalReasignar?.classList.contains('active')) {
			closeReasignarModal();
		}
	}

	async function handleFormSubmit(e) {
		e.preventDefault();

		const form = e.target;
		const btnSave = form.querySelector('.btn-save');
		const originalBtnText = btnSave.innerHTML;

		btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
		btnSave.disabled = true;

		try {
			const formData = getFormData();
			validateFormData(formData);

			const response = await submitPauta(formData);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Error al guardar la pauta');
			}

			mostrarNotificacion('success', 'Pauta creada exitosamente!');
			resetForm(form);
			closeModalHandler();
			cargarTablaPautas();
		} catch (error) {
			console.error('Error:', error);
			mostrarNotificacion('error', error.message);
		} finally {
			btnSave.disabled = false;
			btnSave.innerHTML = originalBtnText;
		}
	}

	function getFormData() {
		return {
			fecha: document.getElementById('fechaPauta').value,
			nombre_pauta: document.getElementById('nombrePauta').value,
			ubicacion_pauta: document.getElementById('ubicacionPauta').value,
			autorizacio_comercial: document.getElementById('autorizacionComercial').value,
			autorizacion_directiva: document.getElementById('autorizacionDirectiva').value,
			monto_de_pauta: parseFloat(document.getElementById('montoPauta').value),
			status_pauta: document.getElementById('estadoPauta').value,
			modelo: parseInt(document.getElementById('modeloPauta').value)
		};
	}

	function validateFormData(formData) {
		if (!formData.fecha || !formData.nombre_pauta || isNaN(formData.modelo)) {
			throw new Error('Por favor complete todos los campos requeridos');
		}
	}

	async function submitPauta(formData) {
		return await fetchConToken(`${API_BASE_URL}/pautas/apipautas/`, {
			method: 'POST',
			body: JSON.stringify(formData)
		});
	}

	function resetForm(form) {
		form.reset();
	}

	// funcion de edición de pautas
	async function abrirModalEdicion(pautaId) {
		const modal = document.getElementById('pauta-modal-edicion');
		const spinner = document.getElementById('pauta-spinner');
		const form = document.getElementById('pauta-form-editar');
		const errorMsg = document.getElementById('pauta-error-msg');

		try {
			limpiarModalPauta();
			modal.style.display = 'block';
			spinner.style.display = 'block';
			form.style.display = 'none';
			if (errorMsg) errorMsg.style.display = 'none';

			if (!pautasDataGlobal || !pautasDataGlobal.lista_pautas) {
				throw new Error('Datos de pautas no disponibles');
			}

			const pauta = pautasDataGlobal.lista_pautas.find((p) => p.id_pauta == pautaId);

			if (!pauta) {
				throw new Error(`No se encontró la pauta con ID: ${pautaId}`);
			}

			const modeloTitle = document.getElementById('pauta-modelo-titulo');
			if (modeloTitle) {
				modeloTitle.textContent = pauta.modelo || 'Modelo no especificado';
			}

			const setValue = (id, value) => {
				const element = document.getElementById(id);
				if (element) {
					element.value = value !== undefined && value !== null ? value : '';
				}
			};

			setValue('pauta-editar-fecha', pauta.fecha);
			setValue('pauta-editar-nombre', pauta.nombre_pauta);
			setValue('pauta-editar-ubicacion', pauta.ubicacion_pauta);
			setValue('pauta-editar-monto', pauta.monto_de_pauta);
			setValue('pauta-editar-estado', pauta.status_pauta?.toUpperCase());

			const setRadioValue = (name, value) => {
				const radio = document.querySelector(`input[name="${name}"][value="${String(value)}"]`);
				if (radio) {
					radio.checked = true;
				}
			};

			setRadioValue('pauta-auth-comercial', pauta.autorizacio_comercial);
			setRadioValue('pauta-auth-directiva', pauta.autorizacion_directiva);

			const manageHiddenField = (id, name, value) => {
				let field = document.getElementById(id);
				if (!field) {
					field = document.createElement('input');
					field.type = 'hidden';
					field.id = id;
					field.name = name;
					form.appendChild(field);
				}
				field.value = value;
			};

			manageHiddenField('pauta-editar-pauta-id', 'pauta_id', pauta.id_pauta);
			manageHiddenField('pauta-editar-modelo-id', 'id_modelo', pauta.id_modelo);

			spinner.style.display = 'none';
			form.style.display = 'block';
			form.dataset.modeloId = pauta.id_modelo;
		} catch (error) {
			console.error('Error en abrirModalEdicion:', error);

			spinner.style.display = 'none';
			form.style.display = 'block';

			if (errorMsg) {
				errorMsg.textContent = `Error al cargar los datos: ${error.message}`;
				errorMsg.style.display = 'block';
			} else {
				mostrarNotificacion('error', error.message);
			}
		}
	}

	document.querySelector('.pauta-btn-guardar')?.addEventListener('click', async function (event) {
		event.preventDefault();

		const btnGuardar = this;
		const originalBtnText = btnGuardar.innerHTML;

		try {
			btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
			btnGuardar.disabled = true;

			const fecha = document.getElementById('pauta-editar-fecha').value;
			const nombrePauta = document.getElementById('pauta-editar-nombre').value;
			const ubicacionPauta = document.getElementById('pauta-editar-ubicacion').value;
			const montoDePauta = parseFloat(document.getElementById('pauta-editar-monto').value);
			const autorizacionComercial = document.querySelector('input[name="pauta-auth-comercial"]:checked').value === 'true';
			const autorizacionDirectiva = document.querySelector('input[name="pauta-auth-directiva"]:checked').value === 'true';
			const statusPauta = document.getElementById('pauta-editar-estado').value;
			const modelo = parseInt(document.getElementById('pauta-editar-modelo-id').value);

			if (!fecha || !nombrePauta || isNaN(modelo)) {
				throw new Error('Por favor complete todos los campos requeridos');
			}

			const datos = {
				fecha,
				nombre_pauta: nombrePauta,
				ubicacion_pauta: ubicacionPauta,
				autorizacio_comercial: autorizacionComercial,
				autorizacion_directiva: autorizacionDirectiva,
				monto_de_pauta: montoDePauta,
				status_pauta: statusPauta,
				modelo
			};

			const pautaId = document.getElementById('pauta-editar-pauta-id').value;

			const respuesta = await fetchConToken(`${API_BASE_URL}/pautas/apipautas/${pautaId}/`, {
				method: 'PUT',
				body: JSON.stringify(datos)
			});

			if (!respuesta.ok) {
				const errorData = await respuesta.json();
				throw new Error(errorData.message || 'Error al editar la pauta');
			}

			await mostrarNotificacion('success', 'La pauta se ha actualizado correctamente');

			elements.editPautaModal.style.display = 'none';
			limpiarModalPauta();
			cargarTablaPautas();
		} catch (error) {
			console.error('Error al enviar la petición:', error);
			await mostrarNotificacion('error', error.message || 'Ocurrió un error al actualizar la pauta');
		} finally {
			btnGuardar.innerHTML = originalBtnText;
			btnGuardar.disabled = false;
		}
	});

	// funcion de reasignación de modelos
	function cargarTodasLasPautas() {
		elements.selectPauta.innerHTML = '<option value="">Seleccione una pauta</option>';

		if (!listaPautasGlobal || listaPautasGlobal.length === 0) {
			elements.selectPauta.innerHTML = '<option value="">No hay pautas disponibles</option>';
			return;
		}

		const pautasOrdenadas = [...listaPautasGlobal].sort((a, b) => a.nombre_pauta.localeCompare(b.nombre_pauta));

		pautasOrdenadas.forEach((pauta) => {
			const option = document.createElement('option');
			option.value = pauta.id_pauta;
			option.textContent = pauta.nombre_pauta;
			elements.selectPauta.appendChild(option);
		});
	}

	async function openReasignarModal() {
		elements.modalReasignar.classList.add('active');
		document.body.style.overflow = 'hidden';

		try {
			// mostramos notificación de carga
			Swal.fire({
				title: 'Cargando modelos',
				html: 'Por favor espera mientras cargamos la lista de modelos...',
				allowOutsideClick: false,
				didOpen: () => {
					Swal.showLoading();
				}
			});

			elements.selectModelo.disabled = true;
			elements.selectModelo.innerHTML = '<option value="">Cargando modelos...</option>';

			const response = await fetchConToken(`${API_BASE_URL}/modelos/api/head/`, {
				method: 'GET'
			});

			if (!response.ok) throw new Error('Error al cargar modelos');

			const modelos = await response.json();

			elements.selectModelo.innerHTML = '<option value="">Seleccionar modelo</option>';
			modelos.forEach((modelo) => {
				const option = document.createElement('option');
				option.value = modelo.id;
				option.textContent = `${modelo.nombres} ${modelo.apellidos}`;
				elements.selectModelo.appendChild(option);
			});

			await cargarTodasLasPautas();
			elements.selectModelo.disabled = false;

			// cerramos notificacion de carga
			Swal.close();
		} catch (error) {
			console.error('Error al cargar modelos:', error);
			elements.selectModelo.innerHTML = '<option value="">Error al cargar modelos</option>';

			mostrarNotificacion('error', 'Error al cargar modelos', error.message);
		}
	}

	function mostrarNotificacion(tipo, titulo, mensaje = '') {
		Swal.fire({
			icon: tipo,
			title: titulo,
			text: mensaje,
			confirmButtonColor: '#4361ee',
			confirmButtonText: 'Entendido'
		});
	}

	function closeReasignarModal() {
		elements.modalReasignar.classList.remove('active');
		document.body.style.overflow = 'auto';
		elements.reasignarForm.reset();
		elements.selectPauta.innerHTML = '<option value="">Seleccione una pauta</option>';
	}

	async function handleReasignarSubmit(e) {
		e.preventDefault();

		const modeloId = elements.selectModelo.value;
		const pautaId = elements.selectPauta.value;

		if (!modeloId || !pautaId) {
			mostrarNotificacion('error', 'Por favor seleccione un modelo y una pauta');
			return;
		}

		const submitBtn = e.target.querySelector('button[type="submit"]');
		const originalText = submitBtn.innerHTML;

		try {
			submitBtn.disabled = true;
			submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reasignando...';

			const pautaSeleccionada = listaPautasGlobal.find((p) => p.id_pauta == pautaId);
			if (!pautaSeleccionada) {
				throw new Error('No se encontraron los datos de la pauta seleccionada');
			}

			const requestBody = {
				fecha: pautaSeleccionada.fecha,
				nombre_pauta: pautaSeleccionada.nombre_pauta,
				ubicacion_pauta: pautaSeleccionada.ubicacion_pauta,
				autorizacio_comercial: pautaSeleccionada.autorizacio_comercial === true || pautaSeleccionada.autorizacio_comercial === 'true',
				autorizacion_directiva: pautaSeleccionada.autorizacion_directiva === true || pautaSeleccionada.autorizacion_directiva === 'true',
				monto_de_pauta: pautaSeleccionada.monto_de_pauta || 0,
				status_pauta: pautaSeleccionada.status_pauta || 'Activa',
				modelo: parseInt(modeloId)
			};

			const response = await fetchConToken(`${API_BASE_URL}/pautas/apipautas/${pautaId}/`, {
				method: 'PATCH',
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Error al actualizar la pauta');
			}

			await cargarTablaPautas();
			mostrarNotificacion('success', '¡Modelo reasignado correctamente!');
			closeReasignarModal();
		} catch (error) {
			console.error('Error:', error);
			mostrarNotificacion('error', `Error al reasignar: ${error.message}`);
		} finally {
			submitBtn.disabled = false;
			submitBtn.innerHTML = originalText;
		}
	}

	// eliminacion de pautas
	function confirmarEliminacion(pautaId) {
		Swal.fire({
			title: '¿Estás seguro?',
			text: '¡No podrás revertir esta acción!',
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#3085d6',
			cancelButtonColor: '#d33',
			confirmButtonText: 'Sí, eliminar',
			cancelButtonText: 'Cancelar'
		}).then(async (result) => {
			if (result.isConfirmed) {
				try {
					const deleteBtn = document.querySelector(`.delete[data-pauta-id="${pautaId}"]`);
					if (deleteBtn) {
						const originalHtml = deleteBtn.innerHTML;
						deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
						deleteBtn.disabled = true;

						const response = await fetchConToken(`${API_BASE_URL}/pautas/apipautas/${pautaId}/`, {
							method: 'DELETE'
						});

						if (!response.ok) {
							throw new Error('Error al eliminar la pauta');
						}

						await mostrarNotificacion('success', '¡La pauta ha sido eliminada correctamente!');
						cargarTablaPautas();
					}
				} catch (error) {
					console.error('Error al eliminar:', error);

					const deleteBtn = document.querySelector(`.delete[data-pauta-id="${pautaId}"]`);
					if (deleteBtn) {
						deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
						deleteBtn.disabled = false;
					}

					await mostrarNotificacion('error', error.message || 'Ocurrió un error al eliminar la pauta');
				}
			}
		});
	}

	function init() {
		setupModalEvents();
		actualizarTarjetas();
		cargarTablaPautas();
		cargarModelos();

		setInterval(actualizarTarjetas, 300000);
		setInterval(cargarTablaPautas, 300000);
	}

	init();
});
