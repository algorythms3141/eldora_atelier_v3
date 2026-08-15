<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get request body
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit();
}

$action = $input['action'] ?? '';

try {
    $db = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    switch ($action) {
        case 'get_settings':
            handleGetSettings($db, $input);
            break;
        case 'save_settings':
            handleSaveSettings($db, $input);
            break;
        case 'get_public_settings':
            handleGetPublicSettings($db);
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

function handleGetSettings($db, $input) {
    verifyTokenOrDie($input);
    
    $settings = [];
    
    // Get all settings from company_info table
    $stmt = $db->query("SELECT setting_key, setting_value FROM company_info");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($rows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    
    echo json_encode(['success' => true, 'settings' => $settings]);
}

function handleSaveSettings($db, $input) {
    verifyTokenOrDie($input);
    
    $settings = $input['settings'] ?? [];
    
    if (empty($settings)) {
        echo json_encode(['success' => false, 'message' => 'No settings provided']);
        return;
    }
    
    // Define allowed settings keys
    $allowedKeys = [
        'contact_number1',
        'contact_number2', 
        'instagram_link',
        'pinterest_link',
        'email_address',
        'address',
        'google_map_location_url'
    ];
    
    try {
        $db->beginTransaction();
        
        foreach ($settings as $key => $value) {
            // Only process allowed keys
            if (!in_array($key, $allowedKeys)) {
                continue;
            }
            
            // Check if setting exists
            $stmt = $db->prepare("SELECT id FROM company_info WHERE setting_key = :setting_key");
            $stmt->bindParam(':setting_key', $key);
            $stmt->execute();
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing) {
                // Update existing setting
                $stmt = $db->prepare("UPDATE company_info SET setting_value = :setting_value WHERE setting_key = :setting_key");
                $stmt->bindParam(':setting_value', $value);
                $stmt->bindParam(':setting_key', $key);
                $stmt->execute();
            } else {
                // Insert new setting
                $stmt = $db->prepare("INSERT INTO company_info (setting_key, setting_value) VALUES (:setting_key, :setting_value)");
                $stmt->bindParam(':setting_key', $key);
                $stmt->bindParam(':setting_value', $value);
                $stmt->execute();
            }
        }
        
        $db->commit();
        
        echo json_encode(['success' => true, 'message' => 'Settings saved successfully']);
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

function handleGetPublicSettings($db) {
    // Public endpoint to get settings without authentication
    $settings = [];
    
    // Get all settings from company_info table
    $stmt = $db->query("SELECT setting_key, setting_value FROM company_info");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($rows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    
    echo json_encode(['success' => true, 'settings' => $settings]);
}

// Helper functions
function verifyTokenOrDie($input) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? 
                  $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 
                  (function_exists('apache_request_headers') ? apache_request_headers()['Authorization'] ?? '' : '');
    
    $token = '';
    
    if (!empty($authHeader)) {
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
        }
    }
    
    if (empty($token) && !empty($input['token'])) {
        $token = $input['token'];
    }
    
    if (empty($token)) {
        echo json_encode(['success' => false, 'message' => 'Authorization token missing']);
        exit();
    }
    
    $payload = verifyJWT($token);
    
    if (!$payload) {
        echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        exit();
    }
}

function generateJWT($userId, $username) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'user_id' => $userId,
        'username' => $username,
        'iat' => time(),
        'exp' => time() + (86400 * 7) // 7 days expiration
    ]);

    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode($payload);

    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = base64UrlEncode($signature);

    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function verifyJWT($token) {
    $tokenParts = explode('.', $token);

    if (count($tokenParts) !== 3) {
        return false;
    }

    list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $tokenParts;

    $header = base64UrlDecode($base64UrlHeader);
    $payload = base64UrlDecode($base64UrlPayload);
    $signature = base64UrlDecode($base64UrlSignature);

    // Verify signature
    $expectedSignature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);

    if (!hash_equals($signature, $expectedSignature)) {
        return false;
    }

    $payloadData = json_decode($payload, true);

    // Check expiration
    if (isset($payloadData['exp']) && $payloadData['exp'] < time()) {
        return false;
    }

    return $payloadData;
}

function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}
