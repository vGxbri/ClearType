/**
 * TypeMaster Pro - Aplicación jQuery Completa
 * Plataforma profesional de mecanografía con funcionalidades expandidas
 */

$(document).ready(function() {
    
    // ============================================
    // VARIABLES GLOBALES
    // ============================================
    
    let textoActual = null;
    let tiempoInicio = null;
    let intervaloTimer = null;
    let estadisticasActuales = {
        wpm: 0,
        precision: 100,
        tiempo: 0,
        errores: 0,
        correctos: 0
    };
    
    let configuracion = {
        largeFont: false,
        lineHeight: '2',
        sounds: false,
        errorEffects: true,
        timeLimit: false,
        timeValue: 5,
        showCurrent: true
    };
    
    let textosPracticaPersonalizada = '';
    let modoEdicion = false;
    let todosLosTextos = [];
    let todosLosResultados = [];
    
    // ============================================
    // INICIALIZACIÓN
    // ============================================
    
    function inicializar() {
        cargarConfiguracion();
        aplicarConfiguracion();
        cargarDashboard();
        configurarEventos();
        feather.replace();
    }
    
    // ============================================
    // NAVEGACIÓN ENTRE VISTAS
    // ============================================
    
    function navegarAVista(vistaId) {
        // Ocultar todas las vistas
        $('.view-section').removeClass('active');
        
        // Mostrar la vista seleccionada
        $(`#view-${vistaId}`).addClass('active');
        
        // Actualizar navegación activa
        $('.nav-link').removeClass('active');
        $(`.nav-link[data-view="${vistaId}"]`).addClass('active');
        
        // Reemplazar iconos
        setTimeout(() => feather.replace(), 50);
        
        // Cargar datos específicos de cada vista
        switch(vistaId) {
            case 'dashboard':
                cargarDashboard();
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
            case 'history':
                cargarHistorial();
                break;
            case 'analysis':
                cargarAnalisisErrores();
                break;
        }
    }
    
    window.navigateToView = navegarAVista;
    
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
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: {
                action: 'save_result',
                textoId: resultado.textoId,
                textoTitulo: resultado.textoTitulo,
                wpm: resultado.wpm,
                precision: resultado.precision,
                tiempo: resultado.tiempo,
                errores: resultado.errores,
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
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { action: 'get_stats' },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    actualizarDashboard(response.data);
                }
            }
        });
    }
    
    function cargarResultados(limit = 0) {
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { 
                action: 'get_results',
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
            const escaped = char === ' ' ? '&nbsp;' : escapeHtml(char);
            html += `<span class="char-pending" data-index="${index}">${escaped}</span>`;
        });
        
        $('#practice-text-display').html(html);
        
        $('#practice-input').val('').prop('disabled', false).focus();
        
        resetearEstadisticas();
    }
    
    function compararTexto(esPersonalizado = false) {
        const inputId = esPersonalizado ? '#custom-practice-input' : '#practice-input';
        const textoEscrito = $(inputId).val();
        const textoOriginal = esPersonalizado ? textosPracticaPersonalizada : textoActual.texto;
        
        if (textoEscrito.length === 1 && !tiempoInicio) {
            iniciarTimer(esPersonalizado);
        }
        
        let correctos = 0;
        let errores = 0;
        
        const selector = esPersonalizado ? '#custom-preview .practice-text span' : '#practice-text-display span';
        
        $(selector).each(function(index) {
            const $char = $(this);
            
            if (index < textoEscrito.length) {
                if (textoEscrito[index] === textoOriginal[index]) {
                    $char.removeClass('char-pending char-error char-current').addClass('char-correct');
                    correctos++;
                } else {
                    $char.removeClass('char-pending char-correct char-current').addClass('char-error');
                    errores++;
                }
            } else if (index === textoEscrito.length && configuracion.showCurrent) {
                $char.removeClass('char-pending char-correct char-error').addClass('char-current');
            } else {
                $char.removeClass('char-correct char-error char-current').addClass('char-pending');
            }
        });
        
        estadisticasActuales.correctos = correctos;
        estadisticasActuales.errores = errores;
        
        const totalEscritos = textoEscrito.length;
        const precision = totalEscritos > 0 ? ((correctos / totalEscritos) * 100).toFixed(1) : 100;
        
        const statPrefix = esPersonalizado ? '#custom' : '#practice';
        $(`${statPrefix}-accuracy`).text(precision + '%');
        $(`${statPrefix}-errors`).text(errores);
        
        estadisticasActuales.precision = parseFloat(precision);
        
        calcularWPM(esPersonalizado);
        
        if (textoEscrito === textoOriginal) {
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
        
        const inputId = esPersonalizado ? '#custom-practice-input' : '#practice-input';
        const textoEscrito = $(inputId).val();
        const palabrasEscritas = textoEscrito.trim().split(/\s+/).length;
        const tiempoTranscurrido = (Date.now() - tiempoInicio) / 1000 / 60;
        
        const wpm = tiempoTranscurrido > 0 ? Math.round(palabrasEscritas / tiempoTranscurrido) : 0;
        
        const statPrefix = esPersonalizado ? '#custom' : '#practice';
        $(`${statPrefix}-wpm`).text(wpm);
        estadisticasActuales.wpm = wpm;
    }
    
    function finalizarPractica(esPersonalizado = false) {
        clearInterval(intervaloTimer);
        
        const inputId = esPersonalizado ? '#custom-practice-input' : '#practice-input';
        $(inputId).prop('disabled', true);
        
        const resultado = {
            textoId: textoActual ? textoActual.id : 0,
            textoTitulo: textoActual ? textoActual.titulo : 'Práctica Personalizada',
            wpm: estadisticasActuales.wpm,
            precision: estadisticasActuales.precision,
            tiempo: estadisticasActuales.tiempo,
            errores: estadisticasActuales.errores,
            tipo: esPersonalizado ? 'personalizado' : 'normal'
        };
        
        guardarResultado(resultado);
        
        mostrarModalResultados(resultado);
    }
    
    function resetearEstadisticas() {
        tiempoInicio = null;
        clearInterval(intervaloTimer);
        
        estadisticasActuales = {
            wpm: 0,
            precision: 100,
            tiempo: 0,
            errores: 0,
            correctos: 0
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
        
        $('#results-modal').addClass('active');
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
        $('#custom-practice-input').val('').prop('disabled', false).focus();
        
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
        const categoria = $('#admin-filter-categoria').val();
        const busqueda = $('#admin-search').val().toLowerCase();
        
        let textosFiltrados = todosLosTextos.filter(texto => {
            const cumpleNivel = !nivel || texto.nivel === nivel;
            const cumpleCategoria = !categoria || texto.categoria === categoria;
            const cumpleBusqueda = !busqueda || texto.titulo.toLowerCase().includes(busqueda);
            return cumpleNivel && cumpleCategoria && cumpleBusqueda;
        });
        
        const $container = $('#admin-texts-container');
        $container.empty();
        
        if (textosFiltrados.length === 0) {
            $container.html('<p class="text-white/60 text-center py-8">No se encontraron textos</p>');
            return;
        }
        
        textosFiltrados.forEach(texto => {
            const nivelColor = {
                'principiante': '#10b981',
                'intermedio': '#3b82f6',
                'avanzado': '#f59e0b',
                'experto': '#ef4444'
            };
            
            const card = `
                <div class="glass-dark rounded-2xl p-6 mb-4 hover:-translate-y-1 transition-all duration-300">
                    <div class="flex flex-col md:flex-row justify-between gap-4">
                        <div class="flex-1">
                            <h4 class="text-white text-xl font-semibold mb-2">${escapeHtml(texto.titulo)}</h4>
                            <p class="text-white/60 text-sm mb-4 line-clamp-2">${escapeHtml(texto.texto.substring(0, 150))}...</p>
                            <div class="flex flex-wrap gap-2">
                                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold" style="background: ${nivelColor[texto.nivel]}; color: white;">
                                    <i data-feather="bar-chart" style="width: 12px; height: 12px;"></i>
                                    ${capitalizar(texto.nivel)}
                                </span>
                                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
                                    <i data-feather="tag" style="width: 12px; height: 12px;"></i>
                                    ${capitalizar(texto.categoria)}
                                </span>
                                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold" style="background: rgba(255, 239, 179, 0.2); color: #FFEFB3;">
                                    <i data-feather="file-text" style="width: 12px; height: 12px;"></i>
                                    ${texto.texto.split(' ').length} palabras
                                </span>
                            </div>
                        </div>
                        <div class="flex md:flex-col gap-2 justify-end">
                            <button class="inline-flex items-center gap-2 p-3 bg-white/20 text-white border border-white/30 rounded-xl font-semibold transition-all hover:bg-white/30 hover:-translate-y-1 btn-edit" data-id="${texto.id}" title="Editar">
                                <i data-feather="edit-2" style="width: 16px; height: 16px;"></i>
                            </button>
                            <button class="inline-flex items-center gap-2 p-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-semibold transition-all hover:bg-red-500/30 hover:-translate-y-1 btn-delete" data-id="${texto.id}" title="Borrar">
                                <i data-feather="trash-2" style="width: 16px; height: 16px;"></i>
                            </button>
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
                <div class="text-center">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--color-accent);">${stats.mejorResultado.wpm} WPM</div>
                    <div class="text-white mb-2">${stats.mejorResultado.textoTitulo}</div>
                    <div class="text-muted">Precisión: ${stats.mejorResultado.precision}%</div>
                </div>
            `;
            $('#best-result-container').html(html);
        }
        
        if (stats.ultimaPractica) {
            const html = `
                <div class="text-center">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--color-accent);">${stats.ultimaPractica.wpm} WPM</div>
                    <div class="text-white mb-2">${stats.ultimaPractica.textoTitulo}</div>
                    <div class="text-muted">${stats.ultimaPractica.fecha}</div>
                </div>
            `;
            $('#last-result-container').html(html);
        }
    }
    
    function cargarHistorial() {
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { action: 'get_results' },
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
        
        // Gráfica WPM
        const ctxWpm = document.getElementById('chart-wpm');
        if (ctxWpm) {
            new Chart(ctxWpm, {
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
        
        // Gráfica Precisión
        const ctxAcc = document.getElementById('chart-accuracy');
        if (ctxAcc) {
            new Chart(ctxAcc, {
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
    
    function cargarAnalisisErrores() {
        // Funcionalidad básica - puede expandirse
        const $container = $('#error-keys-container');
        
        if (todosLosResultados.length === 0) {
            $container.html('<p class="text-muted text-center">Realiza prácticas para ver estadísticas</p>');
            return;
        }
        
        const totalErrores = todosLosResultados.reduce((sum, r) => sum + r.errores, 0);
        const promErrores = (totalErrores / todosLosResultados.length).toFixed(1);
        
        const html = `
            <div class="text-center">
                <div style="font-size: 3rem; font-weight: 700; color: var(--color-error);">${promErrores}</div>
                <div class="text-white mb-2">Errores Promedio por Práctica</div>
                <div class="text-muted">Total de errores: ${totalErrores}</div>
            </div>
        `;
        
        $container.html(html);
        
        // Sugerencias
        const precision = todosLosResultados.reduce((sum, r) => sum + r.precision, 0) / todosLosResultados.length;
        let sugerencia = '';
        
        if (precision >= 95) {
            sugerencia = '¡Excelente precisión! Intenta mejorar tu velocidad.';
        } else if (precision >= 85) {
            sugerencia = 'Buena precisión. Sigue practicando para alcanzar el 95%.';
        } else {
            sugerencia = 'Reduce tu velocidad y enfócate en la precisión primero.';
        }
        
        $('#suggestions-container').html(`
            <div class="alert alert-success">
                <i data-feather="lightbulb" style="width: 20px; height: 20px;"></i>
                <span>${sugerencia}</span>
            </div>
        `);
        
        feather.replace();
    }
    
    // ============================================
    // CONFIGURACIÓN
    // ============================================
    
    function cargarConfiguracion() {
        const configGuardada = localStorage.getItem('typemaster_config');
        if (configGuardada) {
            configuracion = JSON.parse(configGuardada);
        }
    }
    
    function guardarConfiguracion() {
        configuracion = {
            largeFont: $('#setting-large-font').is(':checked'),
            lineHeight: $('#setting-line-height').val(),
            sounds: $('#setting-sounds').is(':checked'),
            errorEffects: $('#setting-error-effects').is(':checked'),
            timeLimit: $('#setting-time-limit').is(':checked'),
            timeValue: parseInt($('#setting-time-value').val()) || 5,
            showCurrent: $('#setting-show-current').is(':checked')
        };
        
        localStorage.setItem('typemaster_config', JSON.stringify(configuracion));
        aplicarConfiguracion();
        mostrarAlerta('Configuración guardada', 'success');
    }
    
    function aplicarConfiguracion() {
        // Aplicar configuración visual
        const fontSize = configuracion.largeFont ? '1.75rem' : '1.5rem';
        $('.practice-text').css('font-size', fontSize);
        $('.practice-text').css('line-height', configuracion.lineHeight);
        
        // Aplicar a controles
        $('#setting-large-font').prop('checked', configuracion.largeFont);
        $('#setting-line-height').val(configuracion.lineHeight);
        $('#setting-sounds').prop('checked', configuracion.sounds);
        $('#setting-error-effects').prop('checked', configuracion.errorEffects);
        $('#setting-time-limit').prop('checked', configuracion.timeLimit);
        $('#setting-time-value').val(configuracion.timeValue);
        $('#setting-show-current').prop('checked', configuracion.showCurrent);
        
        $('#time-limit-input').toggle(configuracion.timeLimit);
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
        
        localStorage.removeItem('typemaster_config');
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
        link.download = 'typemaster_textos_' + new Date().getTime() + '.json';
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
        link.download = 'typemaster_historial_' + new Date().getTime() + '.json';
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
        const iconos = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle'
        };
        
        const alerta = `
            <div class="alert alert-${tipo}" style="position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;">
                <i data-feather="${iconos[tipo]}" style="width: 20px; height: 20px;"></i>
                <span>${mensaje}</span>
            </div>
        `;
        
        $('body').append(alerta);
        feather.replace();
        
        setTimeout(() => {
            $('.alert').fadeOut(400, function() { $(this).remove(); });
        }, 3000);
    }
    
    // ============================================
    // EVENTOS
    // ============================================
    
    function configurarEventos() {
        // Navegación
        $('.nav-link').on('click', function() {
            const vista = $(this).data('view');
            navegarAVista(vista);
        });
        
        // Práctica
        $('#btn-load-random, #btn-practice-new').on('click', cargarTextoAleatorio);
        $('#btn-practice-restart').on('click', mostrarTextoPractica);
        
        $('#practice-input').on('input', function() {
            compararTexto(false);
        });
        
        $('#practice-input').on('paste', function(e) {
            e.preventDefault();
            mostrarAlerta('No se permite pegar texto', 'warning');
        });
        
        // Filtros de práctica
        $('#filter-nivel, #filter-categoria').on('change', cargarTextoAleatorio);
        
        // Práctica personalizada
        $('#btn-generate-custom').on('click', generarPracticaPersonalizada);
        $('#btn-custom-restart').on('click', generarPracticaPersonalizada);
        
        $('#custom-practice-input').on('input', function() {
            compararTexto(true);
        });
        
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
        
        // Importar/Exportar
        $('#btn-export-data').on('click', exportarDatos);
        $('#btn-export-history').on('click', exportarHistorial);
        
        $('#input-import').on('change', function() {
            if (this.files && this.files[0]) {
                importarDatos(this.files[0]);
                $(this).val('');
            }
        });
        
        // Historial
        $('#btn-clear-history').on('click', function() {
            if (confirm('¿Estás seguro de borrar todo el historial?')) {
                $.ajax({
                    url: 'backend.php',
                    type: 'POST',
                    data: { action: 'clear_results' },
                    dataType: 'json',
                    success: function(response) {
                        if (response.status === 'success') {
                            mostrarAlerta('Historial borrado', 'success');
                            cargarHistorial();
                        }
                    }
                });
            }
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
        
        // Modal
        $('#btn-modal-close').on('click', function() {
            $('#results-modal').removeClass('active');
        });
        
        $('#btn-modal-new').on('click', function() {
            $('#results-modal').removeClass('active');
            cargarTextoAleatorio();
        });
        
        $('.modal-overlay').on('click', function(e) {
            if ($(e.target).hasClass('modal-overlay')) {
                $(this).removeClass('active');
            }
        });
    }
    
    // ============================================
    // INICIO
    // ============================================
    
    inicializar();
    
});
