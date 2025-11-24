console.log('=== APP.JS CARGADO ===');
console.log('jQuery version:', typeof $ !== 'undefined' ? $.fn.jquery : 'NO CARGADO');

$(document).ready(function() {
    console.log('=== DOCUMENT READY EJECUTADO ===');
    
    // ============================================
    // VARIABLES GLOBALES
    // ============================================
    
    let textoActual = null;
    let bufferTexto = ''; // Buffer global para el texto escrito
    let tiempoInicio = null;
    let intervaloTimer = null;
    let estadisticasActuales = {
        wpm: 0,
        precision: 100,
        tiempo: 0,
        errores: 0,
        errores: 0,
        correctos: 0,
        teclasErrores: {}
    };
    
    let configuracion = {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '2',
        caretStyle: 'line',                       
        lineHeight: '1.4',
        sounds: false,
        errorEffects: true,
        suddenDeath: false,                       
        stopOnError: false,                       
        timeLimit: false,
        timeValue: 1,
        showCurrent: true
    };
    
    let textosPracticaPersonalizada = '';
    let modoEdicion = false;
    let todosLosTextos = [];
    let todosLosResultados = [];
    
    let inputBloqueado = false;
    
    // Variables para las instancias de gráficas Chart.js
    let chartWpm = null;
    let chartAccuracy = null;
    
    // Usuario actual
    let currentUser = null;

    // ============================================
    // RECURSOS DE AUDIO (Base64 para no depender de archivos externos)
    // ============================================
    // Sonido "Click" mecánico suave
    const soundClick = new Audio("data:audio/wav;base64,UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAEA//8BAAAAAAAA//8="); 
    // (Nota: Este es un placeholder de silencio para evitar errores si no quieres un sonido real largo aquí. 
    // Para un click real, usa un archivo .mp3 corto o este hack simple de oscilador abajo)
    
    // Mejor usamos la API de Audio del navegador para generar sonidos sintéticos sin cargar archivos
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // ============================================
    // INICIALIZACIÓN
    // ============================================
    
    function inicializar() {
        // Verificar sesión
        const userSession = localStorage.getItem('cleartype_user');
        if (userSession) {
            currentUser = JSON.parse(userSession);
            cargarConfiguracion();
            aplicarConfiguracion();
            cargarDashboard();
            cargarHistorial();
            configurarEventos();
            feather.replace();
            
            // Mostrar nombre de usuario en sidebar
            $('#user-name-display').text(currentUser.username);
            
            // Restaurar última vista
            const lastView = localStorage.getItem('cleartype_last_view');
            if (lastView && lastView !== 'auth') {
                navegarAVista(lastView);
            } else {
                navegarAVista('dashboard');
            }
        } else {
            // No hay usuario logueado, mostrar auth
            navegarAVista('auth');
            configurarEventos();
            feather.replace();
        }
    }
    
    // ============================================
    // NAVEGACIÓN ENTRE VISTAS
    // ============================================
    
    function navegarAVista(vistaId) {
        // Guardar vista actual
        localStorage.setItem('cleartype_last_view', vistaId);

        // Ocultar todas las vistas
        $('.view-section').removeClass('active');
        
        // Mostrar la vista seleccionada
        $(`#view-${vistaId}`).addClass('active');
        
        // Actualizar navegación activa
        $('.nav-link').removeClass('active');
        $(`.nav-link[data-view="${vistaId}"]`).addClass('active');
        
        // Ocultar/Mostrar sidebar según vista
        if (vistaId === 'auth') {
            console.log('Navegando a vista AUTH');
            $('#sidebar').hide();
            $('#sidebar-overlay').hide();
            
            // Configurar eventos de autenticación (deben configurarse después de que el DOM esté visible)
            // FIX: Movido a configurarEventos() para evitar race conditions
        } else {
            $('#sidebar').show();
        }
        
        // Reemplazar iconos
        setTimeout(() => feather.replace(), 50);
        
        // Cargar datos específicos de cada vista
        switch(vistaId) {
            case 'dashboard':
                cargarDashboard();
                cargarHistorial(); // Ahora el historial se carga en el dashboard
                break;
            case 'practice':
                if (!textoActual) {
                    cargarTextoAleatorio();
                }
                cargarCategorias();
                break;
            case 'admin':
                cargarTextos();
                cargarCategoriasAdmin();
                break;
            case 'analysis':
                cargarAnalisisErrores();
                break;
        }
    }
    
    window.navigateToView = navegarAVista;
    
    // ============================================
    // AUTENTICACIÓN
    // ============================================
    
    function login(username, password) {
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: {
                action: 'login',
                username: username,
                password: password
            },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    currentUser = response.user;
                    localStorage.setItem('cleartype_user', JSON.stringify(currentUser));
                    
                    // --- AÑADIR ESTO ---
                    if (currentUser.config) {
                        configuracion = { ...configuracion, ...currentUser.config };
                        // Guardar copia local también para acceso rápido
                        localStorage.setItem(`cleartype_config_${currentUser.id}`, JSON.stringify(configuracion));
                    }
                    // -------------------
                    
                    mostrarAlerta('Bienvenido, ' + currentUser.username, 'success');
                    
                    setTimeout(() => {
                        location.reload();
                    }, 500);
                } else {
                    mostrarAlerta(response.message, 'error');
                }
            },
            error: function() {
                mostrarAlerta('Error de conexión', 'error');
            }
        });
    }
    
    function register(username, password) {
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: {
                action: 'register',
                username: username,
                password: password
            },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    mostrarAlerta('Cuenta creada exitosamente. Iniciando sesión...', 'success');
                    // Auto-login después de registro exitoso
                    setTimeout(() => {
                        login(username, password);
                    }, 1000);
                } else {
                    mostrarAlerta(response.message, 'error');
                }
            },
            error: function() {
                mostrarAlerta('Error de conexión', 'error');
            }
        });
    }
    
    function logout() {
        currentUser = null;
        localStorage.removeItem('cleartype_user');
        
        mostrarAlerta('Cerrando sesión...', 'info');
        
        setTimeout(() => {
            location.reload();
        }, 800);
    }
    
    // ============================================
    // FUNCIONES AJAX
    // ============================================
    
    function cargarTextos() {
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { action: 'read' },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    todosLosTextos = response.data;
                    renderizarTextos();
                    actualizarContadorTextos();
                }
            },
            error: function() {
                mostrarAlerta('Error al cargar los textos', 'error');
            }
        });
    }
    
    function cargarTextoAleatorio() {
        const nivel = $('#filter-nivel').val();
        const categoria = $('#filter-categoria').val();
        
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { 
                action: 'get_random',
                nivel: nivel,
                categoria: categoria
            },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    textoActual = response.data;
                    mostrarTextoPractica();
                } else {
                    mostrarAlerta(response.message, 'error');
                }
            },
            error: function() {
                mostrarAlerta('Error al cargar el texto', 'error');
            }
        });
    }
    
    function guardarTexto(datos) {
        const action = datos.id ? 'update' : 'create';
        
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: {
                action: action,
                id: datos.id,
                titulo: datos.titulo,
                texto: datos.texto,
                nivel: datos.nivel,
                categoria: datos.categoria,
                palabrasClave: datos.palabrasClave
            },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    mostrarAlerta(response.message, 'success');
                    limpiarFormularioAdmin();
                    cargarTextos();
                } else {
                    mostrarAlerta(response.message || 'Error al guardar', 'error');
                }
            },
            error: function() {
                mostrarAlerta('Error de conexión', 'error');
            }
        });
    }
    
    function borrarTexto(id) {
        if (!confirm('¿Estás seguro de que deseas borrar este texto?')) {
            return;
        }
        
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: {
                action: 'delete',
                id: id
            },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    mostrarAlerta(response.message, 'success');
                    cargarTextos();
                } else {
                    mostrarAlerta(response.message, 'error');
                }
            },
            error: function() {
                mostrarAlerta('Error al borrar', 'error');
            }
        });
    }
    
    function guardarResultado(resultado) {
        if (!currentUser) return;
        
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: {
                action: 'save_result',
                userId: currentUser.id,
                textoId: resultado.textoId,
                textoTitulo: resultado.textoTitulo,
                wpm: resultado.wpm,
                precision: resultado.precision,
                tiempo: resultado.tiempo,
                errores: resultado.errores,
                teclasErrores: JSON.stringify(resultado.teclasErrores || {}),
                tipo: resultado.tipo
            },
            dataType: 'json',
            success: function(response) {
                console.log('Resultado guardado:', response);
            },
            error: function() {
                console.error('Error al guardar resultado');
            }
        });
    }
    
    function cargarEstadisticas() {
        if (!currentUser) return;
        
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { 
                action: 'get_stats',
                userId: currentUser.id
            },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    actualizarDashboard(response.data);
                }
            }
        });
    }
    
    function cargarResultados(limit = 0) {
        if (!currentUser) return;
        
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { 
                action: 'get_results',
                userId: currentUser.id,
                limit: limit
            },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    todosLosResultados = response.data;
                }
            }
        });
    }
    
    function cargarCategorias() {
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { action: 'get_categories' },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    const $select = $('#filter-categoria');
                    $select.empty().append('<option value="">Todas las categorías</option>');
                    
                    response.data.forEach(cat => {
                        $select.append(`<option value="${cat}">${capitalizar(cat)}</option>`);
                    });
                }
            }
        });
    }
    
    function cargarCategoriasAdmin() {
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { action: 'get_categories' },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    const $select = $('#admin-filter-categoria');
                    $select.empty().append('<option value="">Todas</option>');
                    
                    response.data.forEach(cat => {
                        $select.append(`<option value="${cat}">${capitalizar(cat)}</option>`);
                    });
                }
            }
        });
    }
    
    // ============================================
    // LÓGICA DE PRÁCTICA
    // ============================================
    
    function mostrarTextoPractica() {
        if (!textoActual) return;
        
        $('#practice-title').text(textoActual.titulo);
        
        const caracteres = textoActual.texto.split('');
        let html = '';
        
        caracteres.forEach((char, index) => {
            const escaped = char === ' ' ? ' ' : escapeHtml(char);
            html += `<span class="char-pending" data-index="${index}">${escaped}</span>`;
        });
        
        $('#practice-text-display').html(html);
        
        $('#practice-text-display').html(html);
        
        bufferTexto = ''; // Reiniciar buffer
        
        resetearEstadisticas();
    }
    
    function compararTexto(esPersonalizado = false) {
        const textoEscrito = bufferTexto;
        
        // Safety check
        if (!esPersonalizado && !textoActual) return;
        
        const textoOriginal = esPersonalizado ? textosPracticaPersonalizada : textoActual.texto;
        
        if (textoEscrito.length === 1 && !tiempoInicio) {
            iniciarTimer(esPersonalizado);
        }
        
        let correctos = 0;
        let erroresVisuales = 0; // Solo para cálculo de precisión visual actual
        
        const selector = esPersonalizado ? '#custom-preview .practice-text span' : '#practice-text-display span';
        
        $(selector).each(function(index) {
            const $char = $(this);
            
            if (index < textoEscrito.length) {
                if (textoEscrito[index] === textoOriginal[index]) {
                    $char.removeClass('char-pending char-error char-current').addClass('char-correct');
                    correctos++;
                } else {
                    $char.removeClass('char-pending char-correct char-current').addClass('char-error');
                    erroresVisuales++;
                    
                    // --- CORRECCIÓN ---
                    // AQUÍ ESTABA EL ERROR: Hemos quitado la suma a 'teclasErrores' de este bucle.
                    // Ahora solo gestionamos el aspecto visual.
                }
            } else if (index === textoEscrito.length && configuracion.showCurrent) {
                $char.removeClass('char-pending char-correct char-error').addClass('char-current');
            } else {
                $char.removeClass('char-correct char-error char-current').addClass('char-pending');
            }
        });
        
        estadisticasActuales.correctos = correctos;
        // Nota: estadisticasActuales.errores ahora acumulará los errores reales capturados en el keydown,
        // o puedes igualarlo a erroresVisuales si prefieres que la precisión suba si corrigen el texto (cuando implementes borrar).
        // Por ahora, para mantener coherencia con tu sistema "sin borrar", usamos el acumulador visual:
        estadisticasActuales.errores = erroresVisuales;
        
        const totalEscritos = textoEscrito.length;
        const precision = totalEscritos > 0 ? ((correctos / totalEscritos) * 100).toFixed(1) : 100;
        
        const statPrefix = esPersonalizado ? '#custom' : '#practice';
        $(`${statPrefix}-accuracy`).text(precision + '%');
        $(`${statPrefix}-errors`).text(estadisticasActuales.errores);
        
        estadisticasActuales.precision = parseFloat(precision);
        
        calcularWPM(esPersonalizado);
        
        if (textoEscrito.length === textoOriginal.length) {
            finalizarPractica(esPersonalizado);
        }
    }
    
    function iniciarTimer(esPersonalizado = false) {
        tiempoInicio = Date.now();
        
        intervaloTimer = setInterval(function() {
            const segundos = Math.floor((Date.now() - tiempoInicio) / 1000);
            const statPrefix = esPersonalizado ? '#custom' : '#practice';
            $(`${statPrefix}-time`).text(segundos + 's');
            estadisticasActuales.tiempo = segundos;
            
            if (configuracion.timeLimit && segundos >= configuracion.timeValue * 60) {
                finalizarPractica(esPersonalizado);
            }
        }, 100);
    }
    
    function calcularWPM(esPersonalizado = false) {
        if (!tiempoInicio) return;
        
        const textoEscrito = bufferTexto;
        const palabrasEscritas = textoEscrito.trim().split(/\s+/).length;
        const tiempoTranscurrido = (Date.now() - tiempoInicio) / 1000 / 60;
        
        const wpm = tiempoTranscurrido > 0 ? Math.round(palabrasEscritas / tiempoTranscurrido) : 0;
        
        const statPrefix = esPersonalizado ? '#custom' : '#practice';
        $(`${statPrefix}-wpm`).text(wpm);
        estadisticasActuales.wpm = wpm;
    }
    
    function finalizarPractica(esPersonalizado = false) {
        clearInterval(intervaloTimer);
        
        // Ya no hay input que deshabilitar
        
        const resultado = {
            textoId: textoActual ? textoActual.id : 0,
            textoTitulo: textoActual ? textoActual.titulo : 'Práctica Personalizada',
            wpm: estadisticasActuales.wpm,
            precision: estadisticasActuales.precision,
            tiempo: estadisticasActuales.tiempo,
            errores: estadisticasActuales.errores,
            tiempo: estadisticasActuales.tiempo,
            errores: estadisticasActuales.errores,
            teclasErrores: estadisticasActuales.teclasErrores,
            tipo: esPersonalizado ? 'personalizado' : 'normal'
        };
        
        guardarResultado(resultado);
        
        mostrarModalResultados(resultado);
    }
    
    function resetearEstadisticas() {
        tiempoInicio = null;
        clearInterval(intervaloTimer);
        
        inputBloqueado = false;
        
        estadisticasActuales = {
            wpm: 0,
            precision: 100,
            tiempo: 0,
            tiempo: 0,
            errores: 0,
            correctos: 0,
            teclasErrores: {}
        };
        
        $('#practice-wpm, #custom-wpm').text('0');
        $('#practice-accuracy, #custom-accuracy').text('100%');
        $('#practice-time, #custom-time').text('0s');
        $('#practice-errors, #custom-errors').text('0');
    }
    
    function mostrarModalResultados(resultado) {
        $('#modal-wpm').text(resultado.wpm);
        $('#modal-accuracy').text(resultado.precision + '%');
        $('#modal-time').text(resultado.tiempo + 's');
        $('#modal-errors').text(resultado.errores);
        
        $('#results-modal').removeClass('hidden').addClass('flex');
    }
    
    // ============================================
    // PRÁCTICA PERSONALIZADA
    // ============================================
    
    function generarPracticaPersonalizada() {
        const tipo = $('#custom-type').val();
        const longitud = parseInt($('#custom-length').val()) || 20;
        let texto = '';
        
        switch(tipo) {
            case 'letters':
                const letras = $('#custom-letters').val().trim();
                if (!letras) {
                    mostrarAlerta('Ingresa las letras a practicar', 'warning');
                    return;
                }
                texto = generarTextoLetras(letras, longitud);
                break;
            
            case 'numbers':
                texto = generarTextoNumeros(longitud);
                break;
            
            case 'symbols':
                texto = generarTextoSimbolos(longitud);
                break;
            
            case 'combinations':
                texto = generarCombinacionesDificiles(longitud);
                break;
        }
        
        textosPracticaPersonalizada = texto;
        
        const caracteres = texto.split('');
        let html = '';
        caracteres.forEach((char, index) => {
            const escaped = char === ' ' ? '&nbsp;' : escapeHtml(char);
            html += `<span class="char-pending" data-index="${index}">${escaped}</span>`;
        });
        
        $('#custom-preview').html(`<div class="practice-text">${html}</div>`);
        $('#custom-practice-area').show();
        $('#custom-preview').html(`<div class="practice-text">${html}</div>`);
        $('#custom-practice-area').show();
        
        bufferTexto = ''; // Reiniciar buffer
        
        resetearEstadisticas();
    }
    
    function generarTextoLetras(letras, palabras) {
        const letrasArray = letras.split('').filter(c => c.trim() !== '');
        const resultado = [];
        
        for (let i = 0; i < palabras; i++) {
            const longPalabra = Math.floor(Math.random() * 5) + 3;
            let palabra = '';
            for (let j = 0; j < longPalabra; j++) {
                palabra += letrasArray[Math.floor(Math.random() * letrasArray.length)];
            }
            resultado.push(palabra);
        }
        
        return resultado.join(' ');
    }
    
    function generarTextoNumeros(palabras) {
        const resultado = [];
        for (let i = 0; i < palabras; i++) {
            const num = Math.floor(Math.random() * 10000);
            resultado.push(num.toString());
        }
        return resultado.join(' ');
    }
    
    function generarTextoSimbolos(palabras) {
        const simbolos = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
        const resultado = [];
        
        for (let i = 0; i < palabras; i++) {
            const long = Math.floor(Math.random() * 4) + 2;
            let grupo = '';
            for (let j = 0; j < long; j++) {
                grupo += simbolos[Math.floor(Math.random() * simbolos.length)];
            }
            resultado.push(grupo);
        }
        
        return resultado.join(' ');
    }
    
    function generarCombinacionesDificiles(palabras) {
        const combinaciones = ['qu', 'gü', 'ñ', 'ch', 'll', 'rr', 'tr', 'pr', 'bl', 'fl'];
        const resultado = [];
        
        for (let i = 0; i < palabras; i++) {
            const numComb = Math.floor(Math.random() * 2) + 1;
            let palabra = '';
            for (let j = 0; j < numComb; j++) {
                palabra += combinaciones[Math.floor(Math.random() * combinaciones.length)];
            }
            resultado.push(palabra);
        }
        
        return resultado.join(' ');
    }
    
    // ============================================
    // GESTIÓN DE TEXTOS (ADMIN)
    // ============================================
    
    function renderizarTextos() {
        const nivel = $('#admin-filter-nivel').val();
        const categoria = $('#admin-filter-categoria').val(); // Asegúrate de que este select exista o quita esta línea si usas el diseño nuevo simplificado
        const busqueda = $('#admin-search').val().toLowerCase();
        
        let textosFiltrados = todosLosTextos.filter(texto => {
            const cumpleNivel = !nivel || texto.nivel === nivel;
            // Si mantienes el filtro de categoría en el HTML nuevo, úsalo, si no, puedes quitarlo
            const cumpleCategoria = !categoria || (texto.categoria && texto.categoria === categoria); 
            const cumpleBusqueda = !busqueda || texto.titulo.toLowerCase().includes(busqueda);
            return cumpleNivel && cumpleCategoria && cumpleBusqueda;
        });
        
        // Actualizar contador en la cabecera
        $('#admin-total-count').text(`${textosFiltrados.length} Textos`);

        const $container = $('#admin-texts-container');
        $container.empty();
        
        if (textosFiltrados.length === 0) {
            $container.html(`
                <div class="col-span-full py-12 text-center">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                        <i data-feather="inbox" class="w-8 h-8 text-white/30"></i>
                    </div>
                    <p class="text-white/50">No se encontraron textos que coincidan.</p>
                </div>
            `);
            feather.replace();
            return;
        }
        
        textosFiltrados.forEach(texto => {
            const nivelConfig = {
                'principiante': { color: 'bg-emerald-500', text: 'Principiante' },
                'intermedio':   { color: 'bg-blue-500',    text: 'Intermedio' },
                'avanzado':     { color: 'bg-amber-500',   text: 'Avanzado' },
                'experto':      { color: 'bg-rose-500',    text: 'Experto' }
            };
            
            const config = nivelConfig[texto.nivel] || { color: 'bg-gray-500', text: texto.nivel };
            
            // Calculamos palabras para mostrar info útil
            const wordCount = texto.texto.trim().split(/\s+/).length;
            
            const card = `
                <div class="glass group relative overflow-hidden rounded-2xl hover:bg-white/5 transition-all duration-300 border border-white/5 hover:border-white/20">
                    <div class="absolute left-0 top-0 bottom-0 w-1 ${config.color} opacity-60 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div class="p-5 pl-7">
                        <div class="flex justify-between items-start mb-3">
                            <h4 class="text-white font-bold text-lg leading-tight pr-4 truncate">${escapeHtml(texto.titulo)}</h4>
                            
                            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
                                <button class="btn-edit p-2 bg-white/10 hover:bg-[#FFEFB3] hover:text-[#013e37] text-white rounded-lg transition-colors" data-id="${texto.id}" title="Editar">
                                    <i data-feather="edit-2" class="w-4 h-4"></i>
                                </button>
                                <button class="btn-delete p-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-lg transition-colors" data-id="${texto.id}" title="Borrar">
                                    <i data-feather="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>

                        <div class="bg-black/20 rounded-lg p-3 mb-4 h-24 overflow-hidden relative">
                            <p class="text-white/60 text-xs font-mono leading-relaxed break-words font-light">
                                ${escapeHtml(texto.texto.substring(0, 180))}${texto.texto.length > 180 ? '...' : ''}
                            </p>
                            <div class="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#0d332e] to-transparent"></div>
                        </div>

                        <div class="flex items-center justify-between text-xs text-white/50">
                            <div class="flex gap-3">
                                <span class="flex items-center gap-1.5">
                                    <div class="w-1.5 h-1.5 rounded-full ${config.color}"></div>
                                    ${config.text}
                                </span>
                                <span class="flex items-center gap-1.5">
                                    <i data-feather="file-text" class="w-3 h-3"></i>
                                    ${wordCount} pal.
                                </span>
                            </div>
                            <span class="uppercase tracking-wide font-semibold text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                ${escapeHtml(texto.categoria)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
            $container.append(card);
        });
        
        feather.replace();
    }
    
    function cargarTextoParaEditar(id) {
        const texto = todosLosTextos.find(t => t.id == id);
        if (!texto) return;
        
        $('#admin-text-id').val(texto.id);
        $('#admin-titulo').val(texto.titulo);
        $('#admin-texto').val(texto.texto);
        $('#admin-nivel').val(texto.nivel);
        $('#admin-categoria').val(texto.categoria);
        $('#admin-palabras').val(texto.palabrasClave ? texto.palabrasClave.join(', ') : '');
        
        $('#admin-form-title').html('<i data-feather="edit"></i> Editar Texto');
        $('#btn-cancel-edit').removeClass('hidden');
        modoEdicion = true;
        
        $('html, body').animate({
            scrollTop: $('#admin-form').offset().top - 100
        }, 500);
        
        feather.replace();
    }
    
    function limpiarFormularioAdmin() {
        $('#admin-text-id').val('');
        $('#admin-titulo').val('');
        $('#admin-texto').val('');
        $('#admin-nivel').val('principiante');
        $('#admin-categoria').val('');
        $('#admin-palabras').val('');
        
        $('#admin-form-title').html('<i data-feather="plus-circle"></i> Crear Nuevo Texto');
        $('#btn-cancel-edit').addClass('hidden');
        modoEdicion = false;
        
        feather.replace();
    }
    
    function actualizarContadorTextos() {
        $('#text-count').text(`${todosLosTextos.length} texto${todosLosTextos.length !== 1 ? 's' : ''}`);
        $('#dashboard-total-texts').text(todosLosTextos.length);
    }
    
    // ============================================
    // HISTORIAL Y ESTADÍSTICAS
    // ============================================
    
    function cargarDashboard() {
        cargarEstadisticas();
        cargarTextos();
    }
    
    function actualizarDashboard(stats) {
        $('#dashboard-total-practices').text(stats.totalPracticas);
        $('#dashboard-avg-wpm').text(stats.promedioWPM);
        $('#dashboard-avg-accuracy').text(stats.promedioPrecision + '%');
        
        if (stats.mejorResultado) {
            const html = `
                <div class="flex items-center gap-3">
                    <div class="flex-shrink-0">
                        <div style="font-size: 2rem; font-weight: 700; color: #ffefb3; line-height: 1;">${stats.mejorResultado.wpm}</div>
                        <div class="text-white/50 text-xs uppercase tracking-wide text-center">WPM</div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-white text-sm font-medium truncate mb-0.5">${stats.mejorResultado.textoTitulo}</div>
                        <div class="inline-flex items-center gap-1 text-xs">
                            <span class="text-green-400 font-semibold">${stats.mejorResultado.precision}%</span>
                            <span class="text-white/50">precisión</span>
                        </div>
                    </div>
                </div>
            `;
            $('#best-result-container').html(html);
        }
        
        if (stats.ultimaPractica) {
            const html = `
                <div class="flex items-center gap-3">
                    <div class="flex-shrink-0">
                        <div style="font-size: 2rem; font-weight: 700; color: #ffefb3; line-height: 1;">${stats.ultimaPractica.wpm}</div>
                        <div class="text-white/50 text-xs uppercase tracking-wide text-center">WPM</div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-white text-sm font-medium truncate mb-0.5">${stats.ultimaPractica.textoTitulo}</div>
                        <div class="text-white/50 text-xs">${stats.ultimaPractica.fecha}</div>
                    </div>
                </div>
            `;
            $('#last-result-container').html(html);
        }
    }
    
    function cargarHistorial() {
        if (!currentUser) return;
        
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { 
                action: 'get_results',
                userId: currentUser.id
            },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    todosLosResultados = response.data;
                    renderizarHistorial();
                    renderizarGraficas();
                }
            }
        });
    }
    
    function renderizarHistorial() {
        const $tbody = $('#history-table-body');
        $tbody.empty();
        
        if (todosLosResultados.length === 0) {
            $tbody.html('<tr><td colspan="6" class="px-4 py-3 text-center text-white/60 border-b border-white/10">No hay prácticas registradas</td></tr>');
            return;
        }
        
        todosLosResultados.slice(0, 20).forEach(resultado => {
            const row = `
                <tr class="hover:bg-white/5 transition-colors">
                    <td class="px-4 py-3 text-white/80 border-b border-white/10 whitespace-nowrap">${resultado.fecha}</td>
                    <td class="px-4 py-3 text-white border-b border-white/10">${escapeHtml(resultado.textoTitulo)}</td>
                    <td class="px-4 py-3 text-center border-b border-white/10"><span class="inline-flex items-center justify-center px-2 py-1 rounded-lg font-semibold text-sm" style="background: rgba(255, 239, 179, 0.2); color: #FFEFB3;">${resultado.wpm}</span></td>
                    <td class="px-4 py-3 text-center text-green-400 border-b border-white/10 font-semibold">${resultado.precision}%</td>
                    <td class="px-4 py-3 text-center text-white/70 border-b border-white/10">${resultado.tiempo}s</td>
                    <td class="px-4 py-3 text-center text-white/70 border-b border-white/10">${resultado.errores}</td>
                </tr>
            `;
            $tbody.append(row);
        });
    }
    
    function renderizarGraficas() {
        if (todosLosResultados.length === 0) return;
        
        const ultimos10 = todosLosResultados.slice(0, 10).reverse();
        
        const labels = ultimos10.map((r, i) => `#${i + 1}`);
        const wpmData = ultimos10.map(r => r.wpm);
        const accuracyData = ultimos10.map(r => r.precision);
        
        // Gráfica WPM - Destruir instancia anterior si existe
        const ctxWpm = document.getElementById('chart-wpm');
        if (ctxWpm) {
            if (chartWpm) {
                chartWpm.destroy();
            }
            chartWpm = new Chart(ctxWpm, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'WPM',
                        data: wpmData,
                        borderColor: '#FFEFB3',
                        backgroundColor: 'rgba(255, 239, 179, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { color: '#fff' } },
                        x: { ticks: { color: '#fff' } }
                    }
                }
            });
        }
        
        // Gráfica Precisión - Destruir instancia anterior si existe
        const ctxAcc = document.getElementById('chart-accuracy');
        if (ctxAcc) {
            if (chartAccuracy) {
                chartAccuracy.destroy();
            }
            chartAccuracy = new Chart(ctxAcc, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Precisión %',
                        data: accuracyData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, max: 100, ticks: { color: '#fff' } },
                        x: { ticks: { color: '#fff' } }
                    }
                }
            });
        }
    }
    
    // ============================================
    // ANÁLISIS DE ERRORES
    // ============================================
    
    // ============================================
    // ANÁLISIS DE ERRORES (MEJORADO)
    // ============================================
    
    function cargarAnalisisErrores() {
        const $heatmapContainer = $('#heatmap-container');
        const $topErrorsContainer = $('#top-errors-visual');
        
        if (todosLosResultados.length === 0) {
            $heatmapContainer.html('<div class="py-12 text-white/40 italic">Necesitas completar al menos una práctica</div>');
            return;
        }
        
        // 1. Agregar Errores
        const mapaErrores = {};
        let totalErroresRegistrados = 0;
        
        todosLosResultados.forEach(resultado => {
            if (resultado.teclasErrores) {
                const errores = typeof resultado.teclasErrores === 'string' 
                    ? JSON.parse(resultado.teclasErrores) 
                    : resultado.teclasErrores;
                
                if (errores) {
                    Object.keys(errores).forEach(key => {
                        mapaErrores[key] = (mapaErrores[key] || 0) + errores[key];
                        totalErroresRegistrados += errores[key];
                    });
                }
            }
        });

        // Si no hay errores (eres perfecto), mostrar mensaje
        if (totalErroresRegistrados === 0) {
            $topErrorsContainer.html('<div class="w-full text-center py-8"><i data-feather="award" class="w-12 h-12 text-[#FFEFB3] mx-auto mb-3"></i><p class="text-[#FFEFB3] font-bold">¡Impecable!</p><p class="text-sm text-white/60">No has cometido errores aún.</p></div>');
            renderizarBalanceManos(0, 0); // Resetear barras
            feather.replace();
            return;
        }
        
        // 2. Renderizar Top 3 Errores
        const erroresOrdenados = Object.entries(mapaErrores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
            
        let htmlTop = '';
        erroresOrdenados.forEach(([key, count], index) => {
            const porcentaje = Math.round((count / totalErroresRegistrados) * 100);
            const keyDisplay = key === ' ' ? 'Space' : key.toUpperCase();
            
            // CONFIGURACIÓN DE COLORES
            // Usamos 'style' para el fondo para evitar que Tailwind CDN lo ignore.
            // He subido la opacidad a 0.2 (20%) para que se note más.
            let theme = {};
            
            if (index === 0) {
                // #1 ROJO
                theme = { 
                    classes: 'text-red-400 border-red-500', 
                    bg: 'rgba(239, 68, 68, 0.2)',  // Color sólido con opacidad manual
                    shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' // Resplandor rojo
                };
            } else if (index === 1) {
                // #2 NARANJA
                theme = { 
                    classes: 'text-orange-400 border-orange-500', 
                    bg: 'rgba(249, 115, 22, 0.2)',
                    shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                };
            } else {
                // #3 AMARILLO
                theme = { 
                    classes: 'text-yellow-400 border-yellow-500', 
                    bg: 'rgba(250, 204, 21, 0.2)',
                    shadow: 'shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                };
            }
            
            htmlTop += `
                <div class="flex flex-col items-center justify-center p-4 rounded-2xl border ${theme.classes} ${theme.shadow} w-1/3 min-w-[100px] transition-transform" style="background-color: ${theme.bg}; border-width: 1px;">
                    <div class="text-xs font-bold uppercase opacity-80 mb-2 tracking-widest">Top #${index + 1}</div>
                    <div class="text-5xl font-mono font-bold mb-2 drop-shadow-md">${keyDisplay}</div>
                    <div class="text-xs font-bold bg-black/40 px-3 py-1 rounded-full text-white/90 border border-white/10">
                        ${count} fallos
                    </div>
                </div>
            `;
        });
        $topErrorsContainer.html(htmlTop);
        
        // 3. Renderizar Heatmap
        renderizarHeatmap(mapaErrores, totalErroresRegistrados);
        
        // 4. NUEVO: Calcular Balance de Manos
        const manoIzquierda = ['q','w','e','r','t','a','s','d','f','g','z','x','c','v','b'];
        // Todo lo demás se asume derecha (incluyendo signos comunes por simplicidad visual)
        
        let erroresIzq = 0;
        let erroresDer = 0;
        
        Object.keys(mapaErrores).forEach(k => {
            if (k === ' ') return; // Ignorar espacio para el balance lateral
            if (manoIzquierda.includes(k.toLowerCase())) {
                erroresIzq += mapaErrores[k];
            } else {
                erroresDer += mapaErrores[k];
            }
        });
        
        renderizarBalanceManos(erroresIzq, erroresDer);
        
        feather.replace();
    }
    
    function renderizarBalanceManos(izq, der) {
        const total = izq + der;
        let pctIzq = 0;
        let pctDer = 0;
        
        if (total > 0) {
            pctIzq = Math.round((izq / total) * 100);
            pctDer = 100 - pctIzq;
        }
        
        // Actualizar UI con animación
        $('#left-hand-bar').css('width', `${pctIzq}%`);
        $('#right-hand-bar').css('width', `${pctDer}%`);
        
        $('#left-hand-pct').text(`${pctIzq}%`);
        $('#right-hand-pct').text(`${pctDer}%`);
        
        // Veredicto
        const $verdict = $('#hand-verdict');
        if (total === 0) {
            $verdict.text('Datos insuficientes');
        } else if (Math.abs(pctIzq - pctDer) < 10) {
            $verdict.html('<span class="text-green-400">¡Equilibrado!</span> Tienes buen balance.');
        } else if (pctIzq > pctDer) {
            $verdict.html('Tu mano <strong class="text-red-400">IZQUIERDA</strong> necesita más práctica.');
        } else {
            $verdict.html('Tu mano <strong class="text-blue-400">DERECHA</strong> necesita más práctica.');
        }
    }
    
    function renderizarHeatmap(mapaErrores, total) {
        const layout = [
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
            ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-']
        ];
        
        let html = '<div class="keyboard-container flex flex-col gap-2 items-center select-none">';
        
        layout.forEach((row, rowIndex) => {
            html += `<div class="flex gap-2 justify-center row-${rowIndex}">`;
            row.forEach(key => {
                const count = mapaErrores[key] || 0;
                let intensityClass = '';
                
                if (count > 0) {
                    // Calcular intensidad relativa al máximo error o al total
                    // Usamos una escala simple basada en la cantidad absoluta para mayor claridad inmediata
                    if (count >= 10) intensityClass = 'error-high';
                    else if (count >= 5) intensityClass = 'error-med';
                    else intensityClass = 'error-low';
                }
                
                html += `
                    <div class="key ${intensityClass}" title="${count} errores">
                        ${key.toUpperCase()}
                    </div>
                `;
            });
            html += '</div>';
        });
        
        // Barra espaciadora
        const spaceCount = mapaErrores[' '] || 0;
        let spaceClass = '';
        if (spaceCount >= 10) spaceClass = 'error-high';
        else if (spaceCount >= 5) spaceClass = 'error-med';
        else if (spaceCount > 0) spaceClass = 'error-low';
        
        html += `
            <div class="flex gap-2 justify-center mt-2">
                <div class="key key-space ${spaceClass}" title="${spaceCount} errores">SPACE</div>
            </div>
        `;
        
        html += '</div>';
    
        
        $('#heatmap-container').html(html);
    }
    
    function generarSugerencias(topErrores, resultados) {
        const $container = $('#suggestions-container');
        const precisionPromedio = resultados.reduce((sum, r) => sum + r.precision, 0) / resultados.length;
        
        let sugerencias = [];
        
        // Sugerencia basada en precisión general
        if (precisionPromedio < 90) {
            sugerencias.push({
                icon: 'target',
                text: 'Tu precisión está por debajo del 90%. Intenta escribir más lento y enfócate en no cometer errores antes que en la velocidad.',
                type: 'warning'
            });
        } else {
            sugerencias.push({
                icon: 'award',
                text: '¡Excelente precisión general! Estás construyendo una memoria muscular sólida.',
                type: 'success'
            });
        }
        
        // Sugerencias específicas por teclas
        if (topErrores.length > 0) {
            const [peorTecla, count] = topErrores[0];
            const peorTeclaDisplay = peorTecla === ' ' ? 'Espacio' : peorTecla.toUpperCase();
            
            sugerencias.push({
                icon: 'alert-circle',
                text: `Tienes dificultades frecuentes con la tecla "<strong>${peorTeclaDisplay}</strong>". Intenta practicar lecciones personalizadas que incluyan esta letra.`,
                type: 'info'
            });
            
            // Sugerencia de dedo (simplificada)
            const mapaDedos = {
                'a': 'meñique izquierdo', 'q': 'meñique izquierdo', 'z': 'meñique izquierdo',
                's': 'anular izquierdo', 'w': 'anular izquierdo', 'x': 'anular izquierdo',
                'd': 'medio izquierdo', 'e': 'medio izquierdo', 'c': 'medio izquierdo',
                'f': 'índice izquierdo', 'r': 'índice izquierdo', 'v': 'índice izquierdo', 't': 'índice izquierdo', 'g': 'índice izquierdo', 'b': 'índice izquierdo',
                'j': 'índice derecho', 'u': 'índice derecho', 'm': 'índice derecho', 'y': 'índice derecho', 'h': 'índice derecho', 'n': 'índice derecho',
                'k': 'medio derecho', 'i': 'medio derecho', ',': 'medio derecho',
                'l': 'anular derecho', 'o': 'anular derecho', '.': 'anular derecho',
                'ñ': 'meñique derecho', 'p': 'meñique derecho', '-': 'meñique derecho'
            };
            
            if (mapaDedos[peorTecla]) {
                sugerencias.push({
                    icon: 'hand',
                    text: `Asegúrate de estar usando el <strong>${mapaDedos[peorTecla]}</strong> para presionar la tecla "${peorTeclaDisplay}".`,
                    type: 'info'
                });
            }
        }
        
        // Renderizar
        let html = '<div class="space-y-4">';
        sugerencias.forEach(sug => {
            const colorClass = sug.type === 'success' ? 'text-green-400 bg-green-400/10 border-green-400/20' : 
                               sug.type === 'warning' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' : 
                               'text-blue-400 bg-blue-400/10 border-blue-400/20';
            
            html += `
                <div class="p-4 rounded-xl border ${colorClass} flex gap-3">
                    <div class="flex-shrink-0 mt-0.5">
                        <i data-feather="${sug.icon}" class="w-5 h-5"></i>
                    </div>
                    <div class="text-sm text-white/90 leading-relaxed">
                        ${sug.text}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        $container.html(html);
    }
    
    // ============================================
    // CONFIGURACIÓN
    // ============================================
    
    function cargarConfiguracion() {
        let configCargada = null;

        // Prioridad 1: Configuración que viene del objeto usuario (Backend)
        if (currentUser && currentUser.config) {
            configCargada = currentUser.config;
        } 
        // Prioridad 2: LocalStorage específico del usuario
        else if (currentUser) {
            const configKey = `cleartype_config_${currentUser.id}`;
            const stored = localStorage.getItem(configKey);
            if (stored) configCargada = JSON.parse(stored);
        }
        // Prioridad 3: Configuración genérica (usuario invitado)
        else {
            const stored = localStorage.getItem('cleartype_config');
            if (stored) configCargada = JSON.parse(stored);
        }

        // Si encontramos configuración, la mezclamos con los defaults para asegurar compatibilidad
        if (configCargada) {
            configuracion = { ...configuracion, ...configCargada };
        }
    }
    
    function guardarConfiguracion() {
        // 1. Recoger valores del DOM
        configuracion = {
            fontFamily: $('#setting-font-family').val(),
            fontSize: $('#setting-font-size').val(),
            lineHeight: $('#setting-line-height').val(),
            caretStyle: $('#setting-caret-style').val(),
            
            sounds: $('#setting-sounds').is(':checked'),
            errorEffects: $('#setting-error-effects').is(':checked'),
            suddenDeath: $('#setting-sudden-death').is(':checked'),
            stopOnError: $('#setting-stop-on-error').is(':checked'),
            
            timeLimit: $('#setting-time-limit').is(':checked'),
            timeValue: parseInt($('#setting-time-value').val()) || 1,
            showCurrent: $('#setting-show-current').is(':checked')
        };
        
        // 2. Guardar en LocalStorage (Copia local inmediata)
        const configKey = currentUser ? `cleartype_config_${currentUser.id}` : 'cleartype_config';
        localStorage.setItem(configKey, JSON.stringify(configuracion));
        
        // 3. Guardar en Backend (Persistencia por usuario)
        if (currentUser) {
            // Actualizamos también el objeto currentUser en memoria local para mantener sincronía
            currentUser.config = configuracion;
            localStorage.setItem('cleartype_user', JSON.stringify(currentUser));
            
            // Enviamos al servidor
            const $btn = $('#btn-save-settings');
            const originalText = $btn.html();
            $btn.html('<i data-feather="loader" class="animate-spin w-4 h-4"></i> Guardando...');
            feather.replace();
            
            $.ajax({
                url: 'backend.php',
                type: 'POST',
                data: {
                    action: 'update_settings',
                    userId: currentUser.id,
                    config: JSON.stringify(configuracion)
                },
                dataType: 'json',
                success: function(response) {
                    if (response.status === 'success') {
                        mostrarAlerta('Configuración sincronizada con tu cuenta', 'success');
                    } else {
                        mostrarAlerta('Guardado localmente (Error en servidor: ' + response.message + ')', 'warning');
                    }
                },
                error: function() {
                    mostrarAlerta('Guardado localmente (Sin conexión al servidor)', 'info');
                },
                complete: function() {
                    $btn.html(originalText);
                    feather.replace();
                }
            });
        } else {
            mostrarAlerta('Configuración guardada (Solo en este dispositivo)', 'info');
        }

        aplicarConfiguracion();
    }
    
    function aplicarConfiguracion() {
        // Seleccionamos ambos contenedores (Práctica normal y Personalizada)
        const $textContainer = $('#practice-text-display, .practice-text');
        
        // 1. Aplicar Estilos Visuales
        // Nota: line-height va sin unidad para ser proporcional al tamaño de fuente
        $textContainer.css({
            'font-family': configuracion.fontFamily,
            'font-size': configuracion.fontSize + 'rem',
            'line-height': configuracion.lineHeight,
            'transition': 'font-size 0.3s ease, line-height 0.3s ease'
        });
        
        // 2. Aplicar Estilo de Cursor
        // Eliminamos todas las clases posibles de cursor antes de añadir la nueva
        $textContainer.removeClass('caret-line caret-block caret-underscore caret-outline');
        $textContainer.addClass('caret-' + configuracion.caretStyle);

        // 3. Sincronizar Inputs del Panel (UI)
        // Esto sirve para que si recargas la página, los controles reflejen la realidad
        $('#setting-font-family').val(configuracion.fontFamily);
        
        $('#setting-font-size').val(configuracion.fontSize);
        $('#font-size-value').text(configuracion.fontSize + 'rem');
        
        $('#setting-line-height').val(configuracion.lineHeight);
        $('#line-height-value').text(configuracion.lineHeight);
        
        $('#setting-caret-style').val(configuracion.caretStyle);

        // Checkboxes
        $('#setting-sounds').prop('checked', configuracion.sounds);
        $('#setting-error-effects').prop('checked', configuracion.errorEffects);
        $('#setting-sudden-death').prop('checked', configuracion.suddenDeath);
        $('#setting-stop-on-error').prop('checked', configuracion.stopOnError);
        $('#setting-time-limit').prop('checked', configuracion.timeLimit);
        $('#setting-time-value').val(configuracion.timeValue);
        $('#setting-show-current').prop('checked', configuracion.showCurrent);
        
        $('#time-limit-input').toggle(configuracion.timeLimit);
        
        // CORRECCIÓN: Forzamos el redibujado visual para que "Resaltar Actual" 
        // se aplique inmediatamente si estamos en medio de una práctica.
        const isCustomView = $('#view-custom-practice').hasClass('active');
        // Llamamos a compararTexto para que re-calcule las clases CSS (char-current)
        if (textoActual || textosPracticaPersonalizada) {
            compararTexto(isCustomView); 
        }
    }
    
    function restaurarConfiguracion() {
        configuracion = {
            largeFont: false,
            lineHeight: '2',
            sounds: false,
            errorEffects: true,
            timeLimit: false,
            timeValue: 5,
            showCurrent: true
        };
        
        localStorage.removeItem('cleartype_config');
        aplicarConfiguracion();
        mostrarAlerta('Configuración restaurada', 'success');
    }
    
    // ============================================
    // IMPORTAR/EXPORTAR
    // ============================================
    
    function exportarDatos() {
        const dataStr = JSON.stringify(todosLosTextos, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cleartype_textos_' + new Date().getTime() + '.json';
        link.click();
        URL.revokeObjectURL(url);
        
        mostrarAlerta('Textos exportados exitosamente', 'success');
    }
    
    function exportarHistorial() {
        const dataStr = JSON.stringify(todosLosResultados, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cleartype_historial_' + new Date().getTime() + '.json';
        link.click();
        URL.revokeObjectURL(url);
        
        mostrarAlerta('Historial exportado exitosamente', 'success');
    }
    
    function importarDatos(archivo) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const datos = JSON.parse(e.target.result);
                
                if (!Array.isArray(datos)) {
                    mostrarAlerta('El archivo no tiene el formato correcto', 'error');
                    return;
                }
                
                $.ajax({
                    url: 'backend.php',
                    type: 'POST',
                    data: {
                        action: 'import_data',
                        jsonData: JSON.stringify(datos)
                    },
                    dataType: 'json',
                    success: function(response) {
                        if (response.status === 'success') {
                            mostrarAlerta(`${response.importados} textos importados`, 'success');
                            cargarTextos();
                        } else {
                            mostrarAlerta(response.message, 'error');
                        }
                    },
                    error: function() {
                        mostrarAlerta('Error al importar datos', 'error');
                    }
                });
                
            } catch (error) {
                mostrarAlerta('Error al leer el archivo JSON', 'error');
            }
        };
        
        reader.readAsText(archivo);
    }
    
    // ============================================
    // UTILIDADES
    // ============================================
    
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }
    
    function capitalizar(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    function mostrarAlerta(mensaje, tipo = 'success') {
        // Map types to toast classes
        const typeMap = {
            success: 'toast-success',
            error: 'toast-error',
            warning: 'toast-warning',
            info: 'toast-info'
        };
        
        const iconMap = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        
        const titles = {
            success: '¡Éxito!',
            error: 'Error',
            warning: 'Atención',
            info: 'Información'
        };
        
        const toastClass = typeMap[tipo] || 'toast-info';
        const iconName = iconMap[tipo] || 'info';
        const title = titles[tipo] || 'Notificación';
        
        const toastHtml = `
            <div class="toast ${toastClass}">
                <div class="toast-icon">
                    <i data-feather="${iconName}"></i>
                </div>
                <div class="toast-content">
                    <div class="toast-title">${title}</div>
                    <div class="toast-message">${mensaje}</div>
                </div>
            </div>
        `;
        
        const $toast = $(toastHtml);
        
        // Ensure container exists (safety check)
        let $container = $('#toast-container');
        if ($container.length === 0) {
            $('body').append('<div id="toast-container"></div>');
            $container = $('#toast-container');
        }
        
        $container.append($toast);
        feather.replace();
        
        // Trigger animation
        setTimeout(() => {
            $toast.addClass('show');
        }, 10);
        
        // Auto remove
        setTimeout(() => {
            $toast.removeClass('show');
            setTimeout(() => {
                $toast.remove();
            }, 400); // Wait for transition
        }, 4000);
        
        // Click to dismiss
        $toast.on('click', function() {
            $(this).removeClass('show');
            setTimeout(() => {
                $(this).remove();
            }, 400);
        });
    }
    
    // ============================================
    // CONFIGURACIÓN DE EVENTOS
    // ============================================
    
    function configurarEventosAuth() {
        $('#form-login').off('submit').on('submit', function(e) {
            console.log('LOGIN SUBMIT TRIGGERED!');
            e.preventDefault();
            const username = $('#login-username').val().trim();
            const password = $('#login-password').val();
            console.log('Login attempt:', username);
            login(username, password);
        });
        
        $('#form-register').off('submit').on('submit', function(e) {
            console.log('REGISTER SUBMIT TRIGGERED!');
            e.preventDefault();
            const username = $('#register-username').val().trim();
            const password = $('#register-password').val();
            const confirm = $('#register-password-repeat').val();
            
            if (password !== confirm) {
                mostrarAlerta('Las contraseñas no coinciden', 'error');
                return;
            }
            
            console.log('Register attempt:', username);
            register(username, password);
        });
        
        $('#btn-show-register').off('click').on('click', function(e) {
            console.log('SHOW REGISTER CLICKED!');
            e.preventDefault();
            $('#form-login').addClass('hidden');
            $('#form-register').removeClass('hidden');
            feather.replace();
        });
        
        $('#btn-show-login').off('click').on('click', function(e) {
            console.log('SHOW LOGIN CLICKED!');
            e.preventDefault();
            $('#form-register').addClass('hidden');
            $('#form-login').removeClass('hidden');
            feather.replace();
        });
    }

    function configurarEventos() {
        configurarEventosAuth();

        // Logout
        $(document).off('click', '#btn-logout').on('click', '#btn-logout', function(e) {
            e.preventDefault();
            console.log('Intento de logout detectado'); // Para depuración
            logout();
        });

        // Sidebar toggle para móvil
        $('#sidebar-toggle').on('click', function() {
            $('#sidebar').toggleClass('-translate-x-full');
            $('#sidebar-overlay').toggleClass('hidden');
        });
        
        // Cerrar sidebar al hacer click en overlay
        $('#sidebar-overlay').on('click', function() {
            $('#sidebar').addClass('-translate-x-full');
            $('#sidebar-overlay').addClass('hidden');
        });
        
        // Cerrar sidebar al navegar en móvil
        $('.nav-link').on('click', function() {
            if (window.innerWidth < 1024) { // lg breakpoint
                $('#sidebar').addClass('-translate-x-full');
                $('#sidebar-overlay').addClass('hidden');
            }
        });
        
        // Navegación
        $('.nav-link').on('click', function() {
            const vista = $(this).data('view');
            navegarAVista(vista);
        });
        
        // Actualización en tiempo real de sliders de configuración
        $('#setting-font-size').on('input', function() {
            $('#font-size-value').text($(this).val() + 'rem');
        });
        $('#setting-line-height').on('input', function() {
            $('#line-height-value').text($(this).val());
        });

        // Práctica
        $('#btn-load-random, #btn-practice-new').on('click', cargarTextoAleatorio);
        $('#btn-practice-restart').on('click', mostrarTextoPractica);
        
       $(document).on('keydown', function(e) {
            const isPracticeView = $('#view-practice').hasClass('active');
            const isCustomView = $('#view-custom-practice').hasClass('active');
            
            if (!isPracticeView && !isCustomView) return;
            if (inputBloqueado) { e.preventDefault(); return; }
            if ($(e.target).is('input, textarea, select')) return;
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            
            if (e.key.length === 1) {
                e.preventDefault();
                
                const textoOriginal = isCustomView ? textosPracticaPersonalizada : (textoActual ? textoActual.texto : '');
                
                if (textoOriginal && bufferTexto.length < textoOriginal.length) {
                    
                    const indexActual = bufferTexto.length;
                    const charEsperado = textoOriginal[indexActual];
                    const esError = e.key !== charEsperado;

                    // 1. EFECTOS DE ERROR
                    if (esError) {
                        // A. Sonido de Error
                        if (configuracion.sounds) playErrorSound();

                        // B. Efecto Visual (Flash Rojo)
                        if (configuracion.errorEffects) {
                            const $overlay = $('#flash-effect-overlay');
                            // Forzamos un reflow quitando la clase primero si existía (para flashes rápidos seguidos)
                            $overlay.removeClass('flash-active');
                            
                            // Pequeño hack para forzar al navegador a procesar el cambio
                            void $overlay[0].offsetWidth; 
                            
                            $overlay.addClass('flash-active');
                            
                            // Quitar el flash después de 150ms
                            setTimeout(() => {
                                $overlay.removeClass('flash-active');
                            }, 150);
                        }

                        // C. Lógica de Bloqueo / Estadísticas
                        if (configuracion.stopOnError) {
                            const selector = isCustomView ? '#custom-preview .practice-text span' : '#practice-text-display span';
                            const $char = $(selector).eq(indexActual);
                            $char.addClass('char-error');
                            setTimeout(() => $char.removeClass('char-error'), 200);
                            
                            if (charEsperado) estadisticasActuales.teclasErrores[charEsperado] = (estadisticasActuales.teclasErrores[charEsperado] || 0) + 1;
                            
                            if (configuracion.suddenDeath) {
                                inputBloqueado = true;
                                finalizarPractica(isCustomView);
                                mostrarAlerta('💀 Muerte Súbita: Juego terminado', 'error');
                            }
                            return; 
                        }

                        if (charEsperado) estadisticasActuales.teclasErrores[charEsperado] = (estadisticasActuales.teclasErrores[charEsperado] || 0) + 1;
                        
                        if (configuracion.suddenDeath) {
                            inputBloqueado = true;
                            finalizarPractica(isCustomView);
                            mostrarAlerta('💀 Muerte Súbita: Juego terminado', 'error');
                            return;
                        }
                    } 
                    // 2. SONIDO DE ÉXITO (Click Mecánico)
                    else {
                        if (configuracion.sounds) playMechanicalClick();
                    }

                    bufferTexto += e.key;
                    compararTexto(isCustomView);
                }
            }
        });

        // Filtros de práctica
        $('#filter-nivel, #filter-categoria').on('change', cargarTextoAleatorio);
        
        // Práctica personalizada
        $('#btn-generate-custom').on('click', generarPracticaPersonalizada);
        $('#btn-custom-restart').on('click', generarPracticaPersonalizada);
        
        $('#custom-type').on('change', function() {
            $('#letters-input-group').toggle($(this).val() === 'letters');
        });
        
        // Admin
        $('#admin-form').on('submit', function(e) {
            e.preventDefault();
            
            const datos = {
                id: $('#admin-text-id').val(),
                titulo: $('#admin-titulo').val().trim(),
                texto: $('#admin-texto').val().trim(),
                nivel: $('#admin-nivel').val(),
                categoria: $('#admin-categoria').val().trim(),
                palabrasClave: $('#admin-palabras').val().trim()
            };
            
            guardarTexto(datos);
        });
        
        $('#btn-cancel-edit').on('click', limpiarFormularioAdmin);
        
        $(document).on('click', '.btn-edit', function() {
            const id = $(this).data('id');
            cargarTextoParaEditar(id);
        });
        
        $(document).on('click', '.btn-delete', function() {
            const id = $(this).data('id');
            borrarTexto(id);
        });
        
        $('#admin-filter-nivel, #admin-filter-categoria, #admin-search').on('change input', renderizarTextos);
        
        $('body').off('click', '#btn-clear-history').on('click', '#btn-clear-history', function(e) {
            e.preventDefault();
            const $btn = $(this);
            
            // Verificación de sesión
            if (!currentUser || !currentUser.id) {
                console.error('Error: currentUser es nulo o inválido', currentUser);
                mostrarAlerta('Error de sesión. Recarga la página.', 'error');
                return;
            }

            // Comprobamos si el botón ya está en "modo confirmación" (segundo clic)
            if ($btn.data('confirming')) {
                // --- EJECUTAR BORRADO ---
                
                // Feedback visual de carga
                const width = $btn.outerWidth(); // Mantener ancho para que no salte
                $btn.css('width', width).prop('disabled', true).html('<i data-feather="loader" class="animate-spin"></i>');
                feather.replace();

                $.ajax({
                    url: 'backend.php',
                    type: 'POST',
                    data: { 
                        action: 'clear_results',
                        userId: currentUser.id
                    },
                    dataType: 'json',
                    success: function(response) {
                        console.log('Respuesta servidor:', response);
                        if (response.status === 'success') {
                            mostrarAlerta('Historial borrado correctamente', 'success');
                            
                            // Limpiar datos en memoria
                            todosLosResultados = [];
                            
                            // Limpiar tabla visualmente
                            $('#history-table-body').html('<tr><td colspan="6" class="px-4 py-3 text-center text-white/60 border-b border-white/10">No hay prácticas registradas</td></tr>');
                            
                            // Limpiar gráficas
                            if(chartWpm) { chartWpm.destroy(); chartWpm = null; }
                            if(chartAccuracy) { chartAccuracy.destroy(); chartAccuracy = null; }
                            
                            // Actualizar contadores del dashboard a 0
                            $('#dashboard-total-practices').text('0');
                            $('#dashboard-avg-wpm').text('0');
                            $('#dashboard-avg-accuracy').text('0%');
                            
                        } else {
                            mostrarAlerta(response.message || 'Error al borrar', 'error');
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('Error AJAX:', error);
                        mostrarAlerta('Error de conexión con el servidor', 'error');
                    },
                    complete: function() {
                        // Restaurar botón a estado normal
                        resetearBotonBorrar($btn);
                    }
                });

            } else {
                // --- PRIMER CLIC: PEDIR CONFIRMACIÓN ---
                $btn.data('confirming', true);
                
                // Cambiar estilo a ROJO (Alerta)
                // Nota: Usamos style directo para asegurar que sobreescribe las clases de Tailwind temporalmente si hay conflictos
                $btn.css('background-color', '#ef4444').css('border-color', '#dc2626');
                $btn.html('<span class="text-xs font-bold px-1 text-white">¿Seguro?</span>');
                
                // Temporizador: Si no confirma en 3 segundos, cancelar
                setTimeout(() => {
                    if ($btn.data('confirming')) {
                        resetearBotonBorrar($btn);
                    }
                }, 3000);
            }
        });

        // Función auxiliar para restaurar el botón
        function resetearBotonBorrar($btn) {
            $btn.data('confirming', false);
            // Quitamos estilos inline para volver a las clases CSS originales
            $btn.css('background-color', '').css('border-color', '').css('width', '');
            $btn.prop('disabled', false).html('<i data-feather="trash-2"></i>');
            feather.replace();
        }

        // 2. Exportar Historial (Faltaba este evento en tu código)
        $('body').off('click', '#btn-export-history').on('click', '#btn-export-history', function(e) {
            e.preventDefault();
            console.log('Botón exportar historial pulsado');
            
            if (!currentUser) {
                mostrarAlerta('Inicia sesión para exportar tus datos', 'warning');
                return;
            }
            
            if (todosLosResultados.length === 0) {
                mostrarAlerta('No hay historial para exportar', 'info');
                return;
            }

            exportarHistorial();
        });
        
        // Configuración
        $('#btn-save-settings').on('click', guardarConfiguracion);
        $('#btn-reset-settings').on('click', function() {
            if (confirm('¿Restaurar configuración predeterminada?')) {
                restaurarConfiguracion();
            }
        });
        
        $('#setting-time-limit').on('change', function() {
            $('#time-limit-input').toggle($(this).is(':checked'));
        });
        
        $('#btn-modal-close').on('click', function() {
            $('#results-modal').addClass('hidden').removeClass('flex');
        });
        
        $('#btn-modal-new').on('click', function() {
            $('#results-modal').addClass('hidden').removeClass('flex');
            inputBloqueado = false;
            cargarTextoAleatorio();
        });
        
        $('.modal-overlay').on('click', function(e) {
            if ($(e.target).hasClass('modal-overlay')) {
                $(this).addClass('hidden').removeClass('flex');
            }
        });
    }

    // ============================================
    // RECURSOS DE AUDIO
    // ============================================

    // Función para "despertar" el audio (necesario en Chrome/Edge)
    function resumeAudioContext() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    function playMechanicalClick() {
        resumeAudioContext(); // Intentar despertar siempre
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Tono más agudo y corto (tipo switch Cherry Blue)
        oscillator.type = 'triangle'; 
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.03);
        
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.03);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.04);
    }

    function playErrorSound() {
        resumeAudioContext();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sawtooth'; 
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(100, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
    }
    
    // ============================================
    // INICIO
    // ============================================
    
    inicializar();
    
});
