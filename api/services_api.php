<?php
// services_api.php - Public API for services page (no authentication required)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config.php';

try {
    $db = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $input  = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    switch ($action) {
        case 'get_services':
            handleGetServices($db);
            break;
        case 'get_service':
            handleGetService($db, $input);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function handleGetServices($db) {
    $stmt = $db->query("
        SELECT id, title, summary, description, photo_urls, starting_price, last_modified
        FROM services
        ORDER BY created_at DESC
    ");
    $services = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'services' => $services]);
}

function handleGetService($db, $input) {
    $serviceId = intval($input['service_id'] ?? 0);

    if (!$serviceId) {
        echo json_encode(['success' => false, 'message' => 'Invalid service ID']);
        return;
    }

    $stmt = $db->prepare("
        SELECT id, title, summary, description, photo_urls, starting_price, last_modified
        FROM services
        WHERE id = :service_id
    ");
    $stmt->bindParam(':service_id', $serviceId, PDO::PARAM_INT);
    $stmt->execute();

    $service = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$service) {
        echo json_encode(['success' => false, 'message' => 'Service not found']);
        return;
    }

    echo json_encode(['success' => true, 'service' => $service]);
}
