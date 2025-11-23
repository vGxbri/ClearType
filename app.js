/**
 * app.js - Lógica jQuery para la Plataforma de Mecanografía
 * Maneja la práctica de mecanografía y las operaciones CRUD
 */

$(document).ready(function() {
    
    // ============================================
    // VARIABLES GLOBALES
    // ============================================
    
    let textoActual = null;
    let tiempoInicio = null;
    let tiempoFinal = null;
    let intervaloTimer = null;
    let modoEdicion = false;
    
    // ============================================
    // FUNCIONES AJAX - COMUNICACIÓN CON BACKEND
    // ============================================
    
    /**
     * Cargar todos los textos desde el servidor
     */
    function cargarTextos() {
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { action: 'read' },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    renderizarTablaTextos(response.data);
                } else {
                    alert('Error al cargar textos: ' + response.message);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error AJAX:', error);
                alert('Error de conexión con el servidor');
            }
        });
    }
    
    /**
     * Cargar un texto aleatorio para práctica
     */
    function cargarTextoAleatorio() {
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { action: 'get_random' },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    textoActual = response.data;
                    mostrarTextoPractica();
                } else {
                    alert('Error: ' + response.message);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error AJAX:', error);
                alert('Error al cargar el texto');
            }
        });
    }
    
    /**
     * Guardar un nuevo texto o actualizar uno existente
     */
    function guardarTexto(datos) {
        const action = datos.id ? 'update' : 'create';
        
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: {
                action: action,
                id: datos.id,
                titulo: datos.titulo,
                texto: datos.texto
            },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    alert(response.message);
                    limpiarFormulario();
                    cargarTextos(); // Recargar la tabla
                } else {
                    alert('Error: ' + response.message);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error AJAX:', error);
                alert('Error al guardar');
            }
        });
    }
    
    /**
     * Borrar un texto
     */
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
                    alert(response.message);
                    cargarTextos(); // Recargar la tabla
                } else {
                    alert('Error: ' + response.message);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error AJAX:', error);
                alert('Error al borrar');
            }
        });
    }
    
    // ============================================
    // LÓGICA DE PRÁCTICA DE MECANOGRAFÍA
    // ============================================
    
    /**
     * Mostrar el texto de práctica en pantalla
     */
    function mostrarTextoPractica() {
        if (!textoActual) return;
        
        $('#titulo-practica').text(textoActual.titulo);
        
        // Dividir el texto en caracteres individuales
        const caracteres = textoActual.texto.split('');
        let html = '';
        
        caracteres.forEach((char, index) => {
            html += `<span class="char-pending" data-index="${index}">${char === ' ' ? '&nbsp;' : char}</span>`;
        });
        
        $('#texto-original').html(html);
        
        // Limpiar y habilitar el input
        $('#input-practica').val('').prop('disabled', false).focus();
        
        // Resetear estadísticas
        resetearEstadisticas();
    }
    
    /**
     * Comparar el texto escrito con el original en tiempo real
     */
    function compararTexto() {
        const textoEscrito = $('#input-practica').val();
        const textoOriginal = textoActual.texto;
        
        // Iniciar el timer si es el primer carácter
        if (textoEscrito.length === 1 && !tiempoInicio) {
            iniciarTimer();
        }
        
        let correctos = 0;
        let errores = 0;
        
        // Actualizar cada carácter
        $('.char-pending, .char-correct, .char-error').each(function(index) {
            const $char = $(this);
            
            if (index < textoEscrito.length) {
                if (textoEscrito[index] === textoOriginal[index]) {
                    $char.removeClass('char-pending char-error').addClass('char-correct');
                    correctos++;
                } else {
                    $char.removeClass('char-pending char-correct').addClass('char-error');
                    errores++;
                }
            } else {
                $char.removeClass('char-correct char-error').addClass('char-pending');
            }
        });
        
        // Calcular precisión
        const totalEscritos = textoEscrito.length;
        const precision = totalEscritos > 0 ? ((correctos / totalEscritos) * 100).toFixed(1) : 100;
        $('#stat-precision').text(precision + '%');
        
        // Verificar si completó el texto
        if (textoEscrito === textoOriginal) {
            finalizarPractica();
        }
    }
    
    /**
     * Iniciar el contador de tiempo
     */
    function iniciarTimer() {
        tiempoInicio = Date.now();
        
        intervaloTimer = setInterval(function() {
            const segundos = Math.floor((Date.now() - tiempoInicio) / 1000);
            $('#stat-time').text(segundos + 's');
            
            // Calcular WPM
            calcularWPM();
        }, 100);
    }
    
    /**
     * Calcular palabras por minuto (WPM)
     */
    function calcularWPM() {
        if (!tiempoInicio) return;
        
        const textoEscrito = $('#input-practica').val();
        const palabrasEscritas = textoEscrito.trim().split(/\s+/).length;
        const tiempoTranscurrido = (Date.now() - tiempoInicio) / 1000 / 60; // en minutos
        
        const wpm = tiempoTranscurrido > 0 ? Math.round(palabrasEscritas / tiempoTranscurrido) : 0;
        $('#stat-wpm').text(wpm);
    }
    
    /**
     * Finalizar la práctica
     */
    function finalizarPractica() {
        clearInterval(intervaloTimer);
        tiempoFinal = Date.now();
        
        const tiempoTotal = Math.floor((tiempoFinal - tiempoInicio) / 1000);
        const wpmFinal = $('#stat-wpm').text();
        const precisionFinal = $('#stat-precision').text();
        
        $('#input-practica').prop('disabled', true);
        
        setTimeout(function() {
            alert(`🎉 ¡Felicitaciones!\n\nHas completado el texto.\n\nEstadísticas finales:\n⏱️ Tiempo: ${tiempoTotal}s\n⚡ WPM: ${wpmFinal}\n🎯 Precisión: ${precisionFinal}`);
        }, 300);
    }
    
    /**
     * Resetear las estadísticas
     */
    function resetearEstadisticas() {
        tiempoInicio = null;
        tiempoFinal = null;
        clearInterval(intervaloTimer);
        
        $('#stat-wpm').text('0');
        $('#stat-precision').text('100%');
        $('#stat-time').text('0s');
    }
    
    // ============================================
    // LÓGICA DEL PANEL DE ADMINISTRACIÓN (CRUD)
    // ============================================
    
    /**
     * Renderizar la tabla de textos
     */
    function renderizarTablaTextos(textos) {
        const $container = $('#tabla-textos');
        $container.empty();
        
        if (textos.length === 0) {
            $container.html('<p class="text-white/60 text-center py-8">No hay textos disponibles. ¡Crea uno nuevo!</p>');
            return;
        }
        
        textos.forEach(function(texto) {
            const card = `
                <div class="glass-dark rounded-2xl p-6 flex items-start justify-between">
                    <div class="flex-1">
                        <h3 class="text-xl font-semibold text-white mb-2">${escapeHtml(texto.titulo)}</h3>
                        <p class="text-white/70 line-clamp-2">${escapeHtml(texto.texto)}</p>
                        <p class="text-white/40 text-sm mt-2">ID: ${texto.id}</p>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button class="btn-editar glass btn-glass rounded-xl px-4 py-2 text-white font-semibold" data-id="${texto.id}">
                            ✏️ Editar
                        </button>
                        <button class="btn-borrar glass btn-glass rounded-xl px-4 py-2 text-white font-semibold" data-id="${texto.id}">
                            🗑️ Borrar
                        </button>
                    </div>
                </div>
            `;
            $container.append(card);
        });
    }
    
    /**
     * Limpiar el formulario y resetear modo edición
     */
    function limpiarFormulario() {
        $('#texto-id').val('');
        $('#texto-titulo').val('');
        $('#texto-contenido').val('');
        $('#form-title').text('➕ Crear Nuevo Texto');
        $('#btn-cancelar').addClass('hidden');
        modoEdicion = false;
    }
    
    /**
     * Cargar datos en el formulario para edición
     */
    function cargarParaEditar(id) {
        $.ajax({
            url: 'backend.php',
            type: 'POST',
            data: { action: 'read' },
            dataType: 'json',
            success: function(response) {
                if (response.status === 'success') {
                    const texto = response.data.find(t => t.id == id);
                    if (texto) {
                        $('#texto-id').val(texto.id);
                        $('#texto-titulo').val(texto.titulo);
                        $('#texto-contenido').val(texto.texto);
                        $('#form-title').text('✏️ Editar Texto');
                        $('#btn-cancelar').removeClass('hidden');
                        modoEdicion = true;
                        
                        // Scroll al formulario
                        $('html, body').animate({
                            scrollTop: $('#form-texto').offset().top - 100
                        }, 500);
                    }
                }
            }
        });
    }
    
    /**
     * Escapar HTML para prevenir XSS
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    // ============================================
    // EVENT HANDLERS
    // ============================================
    
    // Navegación entre secciones
    $('#btn-practica').on('click', function() {
        $('#seccion-practica').removeClass('hidden');
        $('#seccion-admin').addClass('hidden');
        $(this).addClass('bg-white/20');
        $('#btn-admin').removeClass('bg-white/20');
    });
    
    $('#btn-admin').on('click', function() {
        $('#seccion-admin').removeClass('hidden');
        $('#seccion-practica').addClass('hidden');
        $(this).addClass('bg-white/20');
        $('#btn-practica').removeClass('bg-white/20');
        
        // Cargar textos al entrar al panel admin
        cargarTextos();
    });
    
    // Botones de la zona de práctica
    $('#btn-nuevo-texto').on('click', function() {
        cargarTextoAleatorio();
    });
    
    $('#btn-reiniciar').on('click', function() {
        mostrarTextoPractica();
    });
    
    // Detectar escritura en el input de práctica
    $('#input-practica').on('input', function() {
        compararTexto();
    });
    
    // Prevenir paste en el input de práctica
    $('#input-practica').on('paste', function(e) {
        e.preventDefault();
        alert('❌ No se permite pegar texto. ¡Debes escribirlo!');
    });
    
    // Submit del formulario CRUD
    $('#form-texto').on('submit', function(e) {
        e.preventDefault();
        
        const datos = {
            id: $('#texto-id').val(),
            titulo: $('#texto-titulo').val().trim(),
            texto: $('#texto-contenido').val().trim()
        };
        
        if (!datos.titulo || !datos.texto) {
            alert('Por favor, completa todos los campos');
            return;
        }
        
        guardarTexto(datos);
    });
    
    // Botón cancelar edición
    $('#btn-cancelar').on('click', function() {
        limpiarFormulario();
    });
    
    // Event delegation para botones de editar y borrar
    $(document).on('click', '.btn-editar', function() {
        const id = $(this).data('id');
        cargarParaEditar(id);
    });
    
    $(document).on('click', '.btn-borrar', function() {
        const id = $(this).data('id');
        borrarTexto(id);
    });
    
    // ============================================
    // INICIALIZACIÓN
    // ============================================
    
    // Cargar un texto aleatorio al iniciar
    cargarTextoAleatorio();
    
});
