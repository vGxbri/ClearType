<?php
/**
 * Backend PHP Expandido para TypeMaster Pro
 * Maneja operaciones CRUD de textos y gestión de resultados
 */

// Configuración de cabeceras
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Archivos de datos
$archivoTextos = 'data.json';
$archivoResultados = 'resultados.json';

// Funciones auxiliares
function leerDatos($archivo) {
    if (!file_exists($archivo)) {
        return [];
    }
    $contenido = file_get_contents($archivo);
    return json_decode($contenido, true) ?: [];
}

function guardarDatos($archivo, $datos) {
    $json = json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($archivo, $json) !== false;
}

function validarTexto($data) {
    $errores = [];
    
    if (empty($data['titulo'])) {
        $errores[] = 'El título es obligatorio';
    }
    
    if (empty($data['texto'])) {
        $errores[] = 'El contenido del texto es obligatorio';
    }
    
    if (empty($data['nivel']) || !in_array($data['nivel'], ['principiante', 'intermedio', 'avanzado', 'experto'])) {
        $errores[] = 'El nivel debe ser: principiante, intermedio, avanzado o experto';
    }
    
    if (empty($data['categoria'])) {
        $errores[] = 'La categoría es obligatoria';
    }
    
    return $errores;
}

// Obtener acción
$accion = isset($_POST['action']) ? $_POST['action'] : '';

// Switch para manejar acciones
switch ($accion) {
    
    // ============================================
    // OPERACIONES DE TEXTOS
    // ============================================
    
    case 'read':
        $datos = leerDatos($archivoTextos);
        echo json_encode([
            'status' => 'success',
            'data' => $datos,
            'total' => count($datos)
        ]);
        break;
    
    case 'get_random':
        $nivel = isset($_POST['nivel']) ? $_POST['nivel'] : '';
        $categoria = isset($_POST['categoria']) ? $_POST['categoria'] : '';
        
        $datos = leerDatos($archivoTextos);
        
        // Filtrar por nivel y categoría si se especifican
        if (!empty($nivel) || !empty($categoria)) {
            $datosFiltrados = array_filter($datos, function($texto) use ($nivel, $categoria) {
                $cumpleNivel = empty($nivel) || $texto['nivel'] === $nivel;
                $cumpleCategoria = empty($categoria) || $texto['categoria'] === $categoria;
                return $cumpleNivel && $cumpleCategoria;
            });
            $datos = array_values($datosFiltrados);
        }
        
        if (count($datos) > 0) {
            $textoAleatorio = $datos[array_rand($datos)];
            echo json_encode([
                'status' => 'success',
                'data' => $textoAleatorio
            ]);
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'No hay textos disponibles con los filtros seleccionados'
            ]);
        }
        break;
    
    case 'create':
        $nuevoTexto = [
            'titulo' => isset($_POST['titulo']) ? trim($_POST['titulo']) : '',
            'texto' => isset($_POST['texto']) ? trim($_POST['texto']) : '',
            'nivel' => isset($_POST['nivel']) ? trim($_POST['nivel']) : '',
            'categoria' => isset($_POST['categoria']) ? trim($_POST['categoria']) : '',
            'palabrasClave' => isset($_POST['palabrasClave']) ? explode(',', trim($_POST['palabrasClave'])) : []
        ];
        
        // Limpiar palabras clave
        $nuevoTexto['palabrasClave'] = array_map('trim', $nuevoTexto['palabrasClave']);
        $nuevoTexto['palabrasClave'] = array_filter($nuevoTexto['palabrasClave']);
        
        // Validar
        $errores = validarTexto($nuevoTexto);
        if (!empty($errores)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Errores de validación',
                'errors' => $errores
            ]);
            break;
        }
        
        $datos = leerDatos($archivoTextos);
        
        // Asignar ID único
        $nuevoTexto['id'] = round(microtime(true) * 1000);
        
        $datos[] = $nuevoTexto;
        
        if (guardarDatos($archivoTextos, $datos)) {
            echo json_encode([
                'status' => 'success',
                'message' => 'Texto creado exitosamente',
                'data' => $nuevoTexto
            ]);
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Error al guardar el archivo'
            ]);
        }
        break;
    
    case 'update':
        $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
        
        if ($id === 0) {
            echo json_encode([
                'status' => 'error',
                'message' => 'ID no válido'
            ]);
            break;
        }
        
        $datosActualizados = [
            'titulo' => isset($_POST['titulo']) ? trim($_POST['titulo']) : '',
            'texto' => isset($_POST['texto']) ? trim($_POST['texto']) : '',
            'nivel' => isset($_POST['nivel']) ? trim($_POST['nivel']) : '',
            'categoria' => isset($_POST['categoria']) ? trim($_POST['categoria']) : '',
            'palabrasClave' => isset($_POST['palabrasClave']) ? explode(',', trim($_POST['palabrasClave'])) : []
        ];
        
        // Limpiar palabras clave
        $datosActualizados['palabrasClave'] = array_map('trim', $datosActualizados['palabrasClave']);
        $datosActualizados['palabrasClave'] = array_filter($datosActualizados['palabrasClave']);
        
        // Validar
        $errores = validarTexto($datosActualizados);
        if (!empty($errores)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Errores de validación',
                'errors' => $errores
            ]);
            break;
        }
        
        $datos = leerDatos($archivoTextos);
        $encontrado = false;
        
        foreach ($datos as &$item) {
            if ($item['id'] == $id) {
                $item['titulo'] = $datosActualizados['titulo'];
                $item['texto'] = $datosActualizados['texto'];
                $item['nivel'] = $datosActualizados['nivel'];
                $item['categoria'] = $datosActualizados['categoria'];
                $item['palabrasClave'] = $datosActualizados['palabrasClave'];
                $encontrado = true;
                break;
            }
        }
        
        if ($encontrado) {
            if (guardarDatos($archivoTextos, $datos)) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Texto actualizado exitosamente'
                ]);
            } else {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Error al guardar los cambios'
                ]);
            }
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Texto no encontrado'
            ]);
        }
        break;
    
    case 'delete':
        $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
        
        if ($id === 0) {
            echo json_encode([
                'status' => 'error',
                'message' => 'ID no válido'
            ]);
            break;
        }
        
        $datos = leerDatos($archivoTextos);
        $datosNuevos = [];
        $encontrado = false;
        
        foreach ($datos as $item) {
            if ($item['id'] != $id) {
                $datosNuevos[] = $item;
            } else {
                $encontrado = true;
            }
        }
        
        if ($encontrado) {
            if (guardarDatos($archivoTextos, $datosNuevos)) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Texto borrado exitosamente'
                ]);
            } else {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Error al guardar los cambios'
                ]);
            }
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Texto no encontrado'
            ]);
        }
        break;
    
    case 'get_categories':
        $datos = leerDatos($archivoTextos);
        $categorias = [];
        
        foreach ($datos as $texto) {
            if (!empty($texto['categoria']) && !in_array($texto['categoria'], $categorias)) {
                $categorias[] = $texto['categoria'];
            }
        }
        
        sort($categorias);
        
        echo json_encode([
            'status' => 'success',
            'data' => $categorias
        ]);
        break;
    
    // ============================================
    // OPERACIONES DE RESULTADOS
    // ============================================
    
    case 'save_result':
        $resultado = [
            'id' => round(microtime(true) * 1000),
            'fecha' => date('Y-m-d H:i:s'),
            'textoId' => isset($_POST['textoId']) ? intval($_POST['textoId']) : 0,
            'textoTitulo' => isset($_POST['textoTitulo']) ? trim($_POST['textoTitulo']) : '',
            'wpm' => isset($_POST['wpm']) ? floatval($_POST['wpm']) : 0,
            'precision' => isset($_POST['precision']) ? floatval($_POST['precision']) : 0,
            'tiempo' => isset($_POST['tiempo']) ? floatval($_POST['tiempo']) : 0,
            'errores' => isset($_POST['errores']) ? intval($_POST['errores']) : 0,
            'tipo' => isset($_POST['tipo']) ? trim($_POST['tipo']) : 'normal' // normal o personalizado
        ];
        
        $resultados = leerDatos($archivoResultados);
        $resultados[] = $resultado;
        
        // Limitar a las últimas 100 prácticas para no saturar el archivo
        if (count($resultados) > 100) {
            $resultados = array_slice($resultados, -100);
        }
        
        if (guardarDatos($archivoResultados, $resultados)) {
            echo json_encode([
                'status' => 'success',
                'message' => 'Resultado guardado',
                'data' => $resultado
            ]);
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Error al guardar el resultado'
            ]);
        }
        break;
    
    case 'get_results':
        $limit = isset($_POST['limit']) ? intval($_POST['limit']) : 0;
        $resultados = leerDatos($archivoResultados);
        
        // Ordenar por fecha descendente (más recientes primero)
        usort($resultados, function($a, $b) {
            return strcmp($b['fecha'], $a['fecha']);
        });
        
        if ($limit > 0) {
            $resultados = array_slice($resultados, 0, $limit);
        }
        
        echo json_encode([
            'status' => 'success',
            'data' => $resultados,
            'total' => count($resultados)
        ]);
        break;
    
    case 'get_stats':
        $resultados = leerDatos($archivoResultados);
        
        if (count($resultados) === 0) {
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'totalPracticas' => 0,
                    'promedioWPM' => 0,
                    'promedioPrecision' => 0,
                    'mejorWPM' => 0,
                    'mejorPrecision' => 0
                ]
            ]);
            break;
        }
        
        $totalPracticas = count($resultados);
        $sumaWPM = 0;
        $sumaPrecision = 0;
        $mejorWPM = 0;
        $mejorPrecision = 0;
        
        foreach ($resultados as $resultado) {
            $sumaWPM += $resultado['wpm'];
            $sumaPrecision += $resultado['precision'];
            
            if ($resultado['wpm'] > $mejorWPM) {
                $mejorWPM = $resultado['wpm'];
            }
            
            if ($resultado['precision'] > $mejorPrecision) {
                $mejorPrecision = $resultado['precision'];
            }
        }
        
        echo json_encode([
            'status' => 'success',
            'data' => [
                'totalPracticas' => $totalPracticas,
                'promedioWPM' => round($sumaWPM / $totalPracticas, 1),
                'promedioPrecision' => round($sumaPrecision / $totalPracticas, 1),
                'mejorWPM' => $mejorWPM,
                'mejorPrecision' => $mejorPrecision,
                'ultimaPractica' => $resultados[0] ?? null,
                'mejorResultado' => array_reduce($resultados, function($mejor, $actual) {
                    if (!$mejor || $actual['wpm'] > $mejor['wpm']) {
                        return $actual;
                    }
                    return $mejor;
                }, null)
            ]
        ]);
        break;
    
    case 'clear_results':
        if (guardarDatos($archivoResultados, [])) {
            echo json_encode([
                'status' => 'success',
                'message' => 'Historial borrado'
            ]);
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Error al borrar historial'
            ]);
        }
        break;
    
    // ============================================
    // IMPORTACIÓN DE DATOS
    // ============================================
    
    case 'import_data':
        $jsonData = isset($_POST['jsonData']) ? $_POST['jsonData'] : '';
        
        if (empty($jsonData)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'No se recibieron datos'
            ]);
            break;
        }
        
        $datosImportados = json_decode($jsonData, true);
        
        if (!is_array($datosImportados)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Formato JSON inválido'
            ]);
            break;
        }
        
        // Validar que cada elemento tenga la estructura correcta
        foreach ($datosImportados as $texto) {
            if (!isset($texto['titulo']) || !isset($texto['texto']) || !isset($texto['nivel']) || !isset($texto['categoria'])) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Los datos no tienen la estructura correcta. Deben incluir: titulo, texto, nivel, categoria'
                ]);
                break 2;
            }
        }
        
        $datosActuales = leerDatos($archivoTextos);
        $datosFinales = array_merge($datosActuales, $datosImportados);
        
        // Reasignar IDs únicos
        foreach ($datosFinales as &$texto) {
            $texto['id'] = round(microtime(true) * 1000) + rand(0, 999);
        }
        
        if (guardarDatos($archivoTextos, $datosFinales)) {
            echo json_encode([
                'status' => 'success',
                'message' => 'Datos importados exitosamente',
                'importados' => count($datosImportados)
            ]);
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Error al guardar los datos importados'
            ]);
        }
        break;
    
    default:
        echo json_encode([
            'status' => 'error',
            'message' => 'Acción no válida'
        ]);
        break;
}
?>
