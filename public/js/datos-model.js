const API_BASE_URL = 'https://project-ads-dx4s.onrender.com';
const FRONTEND_API = 'fair-mastodon-60.clerk.accounts.dev';
globalToken = null;

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

let modeloData = null;

document.addEventListener('DOMContentLoaded', async () => {
	const urlParams = new URLSearchParams(window.location.search);
	const modeloId = urlParams.get('id');

	if (modeloId) {
		await cargarDatosDelModelo(modeloId);
	}
});

async function cargarDatosDelModelo(modeloId) {
	await initClerk();
	try {
		const response = await fetchConToken(`${API_BASE_URL}/modelos/api/head/detallespersonales/?id=${modeloId}`, {
			method: 'GET'
		});
		if (!response.ok) throw new Error('Error en la respuesta del servidor');

		modeloData = await response.json();

		const detalles = modeloData.Detalles[0];
		document.getElementById('nombre-perfil').innerText = detalles.nombre;
		document.getElementById('id-perfil').innerText = detalles.codigo_wallet;
		document.getElementById('cedula-perfil').innerText = detalles.cedula;
		document.getElementById('perfil-email').innerText = detalles.correo;
		document.getElementById('perfil-telefono').innerText = detalles.telefono;
		document.getElementById('perfil-edad').innerText = detalles.edad;

		const imgPerfil = document.getElementById('foto-perfill');
		if (detalles.foto_perfil) {
			imgPerfil.src = detalles.foto_perfil;
			imgPerfil.alt = 'Foto del modelo';
		} else {
			imgPerfil.src = '/descarga.png';
		}

		const tagscontainer = document.querySelector('.tags-container');
		tagscontainer.innerHTML = '';

		if (detalles.pautas_asignadas?.nombres?.length) {
			detalles.pautas_asignadas.nombres.forEach((pauta) => {
				const pautaElement = document.createElement('span');
				pautaElement.classList.add('tag', 'tag-gala');

				const icono = document.createElement('i');
				icono.classList.add('fas', 'fa-star');
				pautaElement.appendChild(icono);

				pautaElement.appendChild(document.createTextNode(pauta));

				const botonEliminar = document.createElement('button');
				botonEliminar.classList.add('tag-remove');

				const iconoEliminar = document.createElement('i');
				iconoEliminar.classList.add('fas', 'fa-times');
				botonEliminar.appendChild(iconoEliminar);

				pautaElement.appendChild(botonEliminar);

				pautaElement.innerText = pauta;

				tagscontainer.appendChild(pautaElement);
			});
		} else {
			document.getElementById('tags-container').innerText = 'No hay pautas asignadas';
		}

		document.getElementById('saldo').innerText = `$${detalles.saldo}`;

		const transacciones = detalles.transaciones;
		const cantidadTransacciones = transacciones.length;

		let totalCredito = 0;
		let totalDebito = 0;

		transacciones.forEach((tx) => {
			if (tx.tipo_de_movimiento === 'CREDITO') {
				totalCredito += tx.monto;
			} else if (tx.tipo_de_movimiento === 'DEBITO') {
				totalDebito += tx.monto;
			}
		});

		document.getElementById('balance-ingresos').querySelector('.credit').innerText = `$${totalCredito.toFixed(2)}`;
		document.getElementById('balance-gastos').querySelector('.debit').innerText = `$${totalDebito.toFixed(2)}`;

		document.querySelector('.movimiento').innerText = cantidadTransacciones;

		document.getElementById('id-qr').innerText = detalles.codigo_wallet;

		const imgQr = document.getElementById('img-qr');
		if (detalles.qr) {
			imgQr.src = detalles.qr;
			imgQr.alt = 'Código QR Wallet';
		}
	} catch (error) {
		console.error('Error al cargar datos del modelo:', error);
	}
}
