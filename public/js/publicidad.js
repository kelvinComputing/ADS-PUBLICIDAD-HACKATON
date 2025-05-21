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

	let publicidadData = [];
	let currentCampaignId = null;
	let currentCampaignStatus = null;

	const newAdButton = document.getElementById('new-ad-button');
	const adNameModal = new bootstrap.Modal(document.getElementById('adNameModal'));
	const adDetailsModal = new bootstrap.Modal(document.getElementById('adDetailsModal'));
	const editModal = new bootstrap.Modal(document.getElementById('editAdModal'));
	const detailsModal = new bootstrap.Modal(document.getElementById('detailsAdModal'));

	const adNameForm = document.getElementById('adNameForm');
	const adDetailsForm = document.getElementById('adDetailsForm');
	const editForm = document.getElementById('editAdForm');

	const campaignNameInput = document.getElementById('campaignName');
	const displayCampaignName = document.getElementById('displayCampaignName');
	const backToNameModalBtn = document.getElementById('backToNameModal');
	const itemsContainer = document.getElementById('itemsContainer');
	const addMoreItemsBtn = document.getElementById('addMoreItems');
	const continueBtn = adNameForm?.querySelector('button[type="submit"]');

	const activeCard = document.getElementById('active-campaigns');
	const pendingCard = document.getElementById('pending-campaigns');
	const activeValue = activeCard?.querySelector('.card-value');
	const pendingValue = pendingCard?.querySelector('.card-value');

	const tableBody = document.querySelector('.payment-table tbody');

	let temporaryItems = [];

	function resetModals() {
		adNameForm?.reset();
		adDetailsForm?.reset();
		temporaryItems = [];
		if (continueBtn) {
			continueBtn.innerHTML = '<i class="fas fa-arrow-right me-2"></i>Continuar';
			continueBtn.disabled = false;
		}

		if (itemsContainer) {
			itemsContainer.innerHTML = `
        <div class="item-group mb-3 border-bottom pb-3">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold">Concepto</label>
              <div class="input-group">
                <span class="input-group-text bg-light"><i class="fas fa-tag text-primary"></i></span>
                <input type="text" class="form-control item-name" placeholder="Ej: Espacio en revista" required>
              </div>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold">Valor</label>
              <div class="input-group">
                <span class="input-group-text bg-light"><i class="fas fa-dollar-sign text-primary"></i></span>
                <input type="number" class="form-control item-value" placeholder="0.00" min="0" step="0.01" required>
              </div>
            </div>
          </div>
        </div>
      `;
		}
	}

	function addNewItemGroup() {
		if (!itemsContainer) return;

		const newItemGroup = document.createElement('div');
		newItemGroup.className = 'item-group mb-3 border-bottom pb-3';
		newItemGroup.innerHTML = `
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label fw-semibold">Concepto</label>
          <div class="input-group">
            <span class="input-group-text bg-light"><i class="fas fa-tag text-primary"></i></span>
            <input type="text" class="form-control item-name" placeholder="Ej: Espacio en revista" required>
          </div>
        </div>
        <div class="col-md-6">
          <label class="form-label fw-semibold">Valor</label>
          <div class="input-group">
            <span class="input-group-text bg-light"><i class="fas fa-dollar-sign text-primary"></i></span>
            <input type="number" class="form-control item-value" placeholder="0.00" min="0" step="0.01" required>
          </div>
        </div>
        <div class="col-12 text-end">
          <button type="button" class="btn btn-sm btn-outline-danger remove-item">
            <i class="fas fa-trash-alt me-1"></i>Eliminar Concepto
          </button>
        </div>
      </div>
    `;

		itemsContainer.appendChild(newItemGroup);

		newItemGroup.querySelector('.remove-item').addEventListener('click', function () {
			itemsContainer.removeChild(newItemGroup);
		});
	}

	function getCookie(name) {
		let cookieValue = null;
		if (document.cookie && document.cookie !== '') {
			const cookies = document.cookie.split(';');
			for (let i = 0; i < cookies.length; i++) {
				const cookie = cookies[i].trim();
				if (cookie.substring(0, name.length + 1) === name + '=') {
					cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
					break;
				}
			}
		}
		return cookieValue;
	}

	function showNotification(type, title, message) {
		const alertDiv = document.createElement('div');
		alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
		alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
		alertDiv.innerHTML = `
      <strong>${title}</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

		document.body.appendChild(alertDiv);

		setTimeout(() => {
			const bsAlert = new bootstrap.Alert(alertDiv);
			bsAlert.close();
		}, 5000);
	}

	async function fetchAndDisplayCampaigns() {
		if (!tableBody) {
			console.error('Error: No se encontró el elemento tableBody');
			return;
		}

		try {
			const animatedRows = tableBody.querySelectorAll('.animate__animated');
			animatedRows.forEach((row) => row.remove());
			const response = await fetchConToken(`${API_BASE_URL}/publicidad/api/items/datos/`, {
				method: 'GET'
			});

			if (!response.ok) {
				console.error('Error en la respuesta:', response.status, response.statusText);
				throw new Error('Error al obtener los datos');
			}

			publicidadData = await response.json();

			publicidadData.forEach((campaign) => {
				const row = document.createElement('tr');
				row.className = 'animate__animated animate__fadeIn';

				row.innerHTML = `
          <td>
            <div class="model-profile">
              <div class="model-details">
                <span class="model-name">${campaign.nombre_publicidad}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="payment-status ${campaign.activa_publicidad ? 'payment-status--completed' : 'payment-status--pending'}">
              <span class="payment-status__circle"></span>
              <span class="payment-status__text">${campaign.activa_publicidad ? 'Aprobado' : 'Por Aprobar'}</span>
            </span>
          </td>
          <td class="action-cell">
            <div class="action-buttons">
              <button class="btn-action edit" title="Editar" data-id="${campaign.id_publicidad}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-action" title="Detalles" data-id="${campaign.id_publicidad}">
                <i class="fas fa-chart-pie"></i>
              </button>
            </div>
          </td>
        `;

				tableBody.appendChild(row);
			});
		} catch (error) {
			console.error('Error al cargar campañas:', error);
			showNotification('error', 'Error', 'No se pudieron cargar las campañas');
		}
	}

	function updateUIAfterStatusChange(campaignId, isActive) {
		const rows = document.querySelectorAll('tr');

		rows.forEach((row) => {
			const editButton = row.querySelector('.btn-action.edit');
			if (editButton && editButton.getAttribute('data-id') == campaignId) {
				const statusElement = row.querySelector('.payment-status__text');
				const statusContainer = row.querySelector('.payment-status');

				if (isActive) {
					statusElement.textContent = 'Aprobado';
					statusContainer.className = 'payment-status payment-status--completed';
				} else {
					statusElement.textContent = 'Por Aprobar';
					statusContainer.className = 'payment-status payment-status--pending';
				}
			}
		});
	}

	function openEditModal(row) {
		const campaignName = row.querySelector('.model-name').textContent;
		const campaignStatusElement = row.querySelector('.payment-status__text');
		const campaignStatusText = campaignStatusElement.textContent.trim();

		const editButton = row.querySelector('.btn-action.edit');
		currentCampaignId = editButton ? editButton.getAttribute('data-id') : null;

		currentCampaignStatus = campaignStatusText === 'Aprobado';

		if (!editModal) {
			console.error('Modal element not found!');
			return;
		}

		document.getElementById('displayCampaignName').textContent = campaignName;

		const statusSelect = document.getElementById('editCampaignStatus');
		if (statusSelect) {
			statusSelect.innerHTML = '';

			if (currentCampaignStatus) {
				statusSelect.innerHTML = `
          <option value="false">Por Aprobar</option>
        `;
			} else {
				statusSelect.innerHTML = `
          <option value="true">Aprobado</option>
        `;
			}
		}

		editModal.show();
	}

	function openDetailsModal(campaignId) {
		const campaignData = publicidadData.find((item) => item.id_publicidad == campaignId);

		if (!campaignData) {
			showNotification('error', 'Error', 'No se encontró la información de la campaña');
			return;
		}

		document.getElementById('detailsCampaignName').textContent = campaignData.nombre_publicidad || 'Campaña sin nombre';

		const conceptsList = document.getElementById('conceptsList');
		conceptsList.innerHTML = '';

		const datos = campaignData.datos || {};
		const datosEntries = Object.entries(datos).filter(([name, value]) => name && value !== undefined && value !== null && value !== '');

		if (datosEntries.length === 0) {
			conceptsList.innerHTML = `
            <tr>
                <td colspan="2" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-clipboard-list text-muted mb-3" style="font-size: 2.5rem;"></i>
                        <h5 class="text-muted mb-2">Sin datos técnicos</h5>
                        <p class="text-muted small">Esta campaña no tiene detalles técnicos registrados</p>
                    </div>
                </td>
            </tr>
        `;
		} else {
			datosEntries.forEach(([name, value]) => {
				const row = document.createElement('tr');
				row.className = 'concept-row';
				row.innerHTML = `
                <td class="concept-name fw-semibold">${name}</td>
                <td class="concept-value">${value}</td>
            `;
				conceptsList.appendChild(row);
			});
		}

		detailsModal.show();
	}

	async function updateDashboardCards() {
		if (!activeValue || !pendingValue) return;

		activeValue.classList.add('shimmer');
		pendingValue.classList.add('shimmer');
		activeValue.textContent = '';
		pendingValue.textContent = '';

		try {
			const response = await fetchConToken(`${API_BASE_URL}/publicidad/api/create/header/`, {
				method: 'GET'
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			activeValue.classList.remove('shimmer');
			pendingValue.classList.remove('shimmer');

			activeValue.textContent = data.Activas || '0';
			pendingValue.textContent = data.Pendientes || '0';

			if (data.tendencias) {
				updateTrends(data.tendencias);
			}
		} catch (error) {
			console.error('Error al cargar datos del dashboard:', error);
			activeValue.classList.remove('shimmer');
			pendingValue.classList.remove('shimmer');

			activeValue.textContent = 'Error';
			pendingValue.textContent = 'Error';

			if (activeCard) activeCard.title = 'No se pudo conectar al servidor';
			if (pendingCard) pendingCard.title = 'No se pudo conectar al servidor';
		}
	}

	function updateTrends(tendencias) {
		const trendElements = {
			active: document.querySelector('#active-campaigns .card-trend'),
			pending: document.querySelector('#pending-campaigns .card-trend')
		};
	}

	if (newAdButton) {
		newAdButton.addEventListener('click', function () {
			resetModals();
			adNameModal.show();
		});
	}

	if (adNameForm) {
		adNameForm.addEventListener('submit', function (e) {
			e.preventDefault();

			const nombrePublicidad = campaignNameInput.value.trim();

			if (!nombrePublicidad) {
				showNotification('error', 'Error', 'Por favor ingrese un nombre para la campaña');
				return;
			}

			if (displayCampaignName) {
				displayCampaignName.textContent = nombrePublicidad;
			}

			adNameModal.hide();
			adDetailsModal.show();
		});
	}

	if (addMoreItemsBtn) {
		addMoreItemsBtn.addEventListener('click', addNewItemGroup);
	}

	if (adDetailsForm) {
		adDetailsForm.addEventListener('submit', async function (e) {
			e.preventDefault();

			const nombrePublicidad = campaignNameInput.value.trim();
			if (!nombrePublicidad) {
				console.error('[DEBUG] Error: Nombre de campaña no encontrado al enviar');
				showNotification('error', 'Error', 'Nombre de campaña no encontrado');
				return;
			}

			const items = [];
			const itemGroups = itemsContainer.querySelectorAll('.item-group');

			itemGroups.forEach((group) => {
				const name = group.querySelector('.item-name').value.trim();
				const value = group.querySelector('.item-value').value.trim();

				if (name && value) {
					items.push({ name, value });
				}
			});

			if (items.length === 0) {
				showNotification('error', 'Error', 'Por favor ingrese al menos un concepto válido');
				return;
			}

			const submitBtn = adDetailsForm.querySelector('button[type="submit"]');
			const originalBtnText = submitBtn.innerHTML;

			try {
				submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
				submitBtn.disabled = true;

				const createResponse = await fetchConToken(`${API_BASE_URL}/publicidad/api/create/`, {
					method: 'POST',
					body: JSON.stringify({
						nombre: nombrePublicidad
					})
				});

				const createData = await createResponse.json();

				if (!createResponse.ok) {
					throw new Error(createData.message || createData.detail || 'Error al crear la publicidad');
				}

				const publicidadId = createData.id;

				const datosItems = {};
				items.forEach((item) => {
					datosItems[item.name] = item.value;
				});

				const itemsResponse = await fetchConToken(`${API_BASE_URL}/publicidad/api/items/`, {
					method: 'POST',
					body: JSON.stringify({
						datos: datosItems,
						id_publicidad: publicidadId
					})
				});

				const itemsData = await itemsResponse.json();

				if (!itemsResponse.ok) {
					throw new Error(itemsData.message || itemsData.detail || 'Error al guardar los items');
				}

				showNotification('success', 'Éxito', 'Campaña creada exitosamente!');
				adDetailsModal.hide();
				resetModals();

				fetchAndDisplayCampaigns();
				updateDashboardCards();
			} catch (error) {
				console.error('Error en el proceso:', error);
				showNotification('error', 'Error', error.message);
			} finally {
				submitBtn.innerHTML = originalBtnText;
				submitBtn.disabled = false;
			}
		});
	}

	if (backToNameModalBtn) {
		backToNameModalBtn.addEventListener('click', function () {
			adDetailsModal.hide();
			adNameModal.show();
		});
	}

	document.addEventListener('click', function (e) {
		const editButton = e.target.closest('.btn-action.edit') || (e.target.classList.contains('fa-edit') && e.target.closest('.btn-action'));

		if (editButton) {
			e.preventDefault();
			const row = editButton.closest('tr');
			if (row) {
				openEditModal(row);
			}
		}

		const detailsBtn = e.target.closest('.btn-action')?.title === 'Detalles' ? e.target.closest('.btn-action') : e.target.classList.contains('fa-chart-pie') && e.target.closest('.btn-action');

		if (detailsBtn) {
			e.preventDefault();
			const campaignId = detailsBtn.getAttribute('data-id');
			if (campaignId) {
				openDetailsModal(campaignId);
			}
		}
	});

	if (editForm) {
		editForm.addEventListener('submit', async function (e) {
			e.preventDefault();

			if (!currentCampaignId) {
				showNotification('error', 'Error', 'No se identificó la campaña a actualizar');
				return;
			}

			const submitButton = editForm.querySelector('button[type="submit"]');
			const originalText = submitButton.innerHTML;

			try {
				submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Actualizando...';
				submitButton.disabled = true;

				const newStatus = document.getElementById('editCampaignStatus').value === 'true';
				const url = `${API_BASE_URL}/publicidad/api/create/${currentCampaignId}/`;
				const response = await fetchConToken(url, {
					method: 'PATCH',
					body: JSON.stringify({
						activa: newStatus
					})
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => null);
					const errorMessage = errorData?.detail || errorData?.message || `Error HTTP: ${response.status}`;
					throw new Error(errorMessage);
				}

				const data = await response.json();

				updateUIAfterStatusChange(currentCampaignId, newStatus);

				editModal.hide();
				showNotification('success', 'Éxito', 'El estado se actualizó correctamente');
				updateDashboardCards();
			} catch (error) {
				console.error('Error al actualizar el estado:', error);
				showNotification('error', 'Error', error.message || 'No se pudo actualizar el estado');
			} finally {
				if (submitButton) {
					submitButton.innerHTML = originalText;
					submitButton.disabled = false;
				}
			}
		});
	}

	fetchAndDisplayCampaigns();
	updateDashboardCards();

	setInterval(updateDashboardCards, 30000);
});
