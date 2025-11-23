<?php
/**
 * Backend PHP para manejo de datos JSON
 * Maneja todas las operaciones CRUD para los textos de mecanografía
 */

// Configuración de cabeceras para permitir AJAX y devolver JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Archivo JSON donde se almacenan los datos
$archivo = 'data.json';

// Función para leer el archivo JSON
function leerDatos($archivo) {
    if (!file_exists($archivo)) {
        return [];
    }
    $contenido = file_get_contents($archivo);
    return json_decode($contenido, true) ?: [];
}

// Función para guardar datos en el archivo JSON
function guardarDatos($archivo, $datos) {
    $json = json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($archivo, $json);
}

// Obtener la acción solicitada
$accion = isset($_POST['action']) ? $_POST['action'] : '';

// Switch para manejar diferentes acciones
switch ($accion) {
    
    case 'read':
        // Leer todos los textos
        $datos = leerDatos($archivo);
        echo json_encode([
            'status' => 'success',
            'data' => $datos
        ]);
        break;
    
    case 'get_random':
        // Obtener un texto aleatorio para práctica
        $datos = leerDatos($archivo);
        if (count($datos) > 0) {
            $textoAleatorio = $datos[array_rand($datos)];
            echo json_encode([
                'status' => 'success',
                'data' => $textoAleatorio
            ]);
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'No hay textos disponibles'
            ]);
        }
        break;
    
    case 'create':
        // Crear un nuevo texto
        $titulo = isset($_POST['titulo']) ? trim($_POST['titulo']) : '';
        $texto = isset($_POST['texto']) ? trim($_POST['texto']) : '';
        
        if (empty($titulo) || empty($texto)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'El título y el texto son obligatorios'
            ]);
            break;
        }
        
        $datos = leerDatos($archivo);
        
        // Crear nuevo objeto con ID único (timestamp en milisegundos)
        $nuevoTexto = [
            'id' => round(microtime(true) * 1000),
            'titulo' => $titulo,
            'texto' => $texto
        ];
        
        // Añadir al array
        $datos[] = $nuevoTexto;
        
        // Guardar
        if (guardarDatos($archivo, $datos)) {
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
        // Actualizar un texto existente
        $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
        $titulo = isset($_POST['titulo']) ? trim($_POST['titulo']) : '';
        $texto = isset($_POST['texto']) ? trim($_POST['texto']) : '';
        
        if ($id === 0 || empty($titulo) || empty($texto)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Datos incompletos para actualizar'
            ]);
            break;
        }
        
        $datos = leerDatos($archivo);
        $encontrado = false;
        
        // Buscar y actualizar el texto
        foreach ($datos as &$item) {
            if ($item['id'] == $id) {
                $item['titulo'] = $titulo;
                $item['texto'] = $texto;
                $encontrado = true;
                break;
            }
        }
        
        if ($encontrado) {
            if (guardarDatos($archivo, $datos)) {
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
        // Borrar un texto
        $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
        
        if ($id === 0) {
            echo json_encode([
                'status' => 'error',
                'message' => 'ID no válido'
            ]);
            break;
        }
        
        $datos = leerDatos($archivo);
        $datosNuevos = [];
        $encontrado = false;
        
        // Filtrar el texto a borrar
        foreach ($datos as $item) {
            if ($item['id'] != $id) {
                $datosNuevos[] = $item;
            } else {
                $encontrado = true;
            }
        }
        
        if ($encontrado) {
            if (guardarDatos($archivo, $datosNuevos)) {
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
    
    default:
        // Acción no válida
        echo json_encode([
            'status' => 'error',
            'message' => 'Acción no válida'
        ]);
        break;
}
?>
