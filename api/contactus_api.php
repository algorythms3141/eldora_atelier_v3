<?php
// contactus_api.php — Public endpoint to save contact form enquiries
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

require_once __DIR__ . '/config.php';

$input  = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

if ($action !== 'submit_inquiry') {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
    exit();
}

try {
    $db = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS
    );
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    handleSubmitInquiry($db, $input);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error. Please try again.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function handleSubmitInquiry($db, $input) {

    /* ── Collect & validate ── */
    $name  = trim($input['name']    ?? '');
    $email = trim($input['email']   ?? '');
    $phone = trim($input['phone']   ?? '');
    $type  = trim($input['enquiry_type'] ?? '');
    $event = trim($input['event']   ?? '');
    $msg   = trim($input['message'] ?? '');

    if (strlen($name) < 2) {
        echo json_encode(['success' => false, 'message' => 'Please enter your full name.']);
        return;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
        return;
    }
    if (empty($type)) {
        echo json_encode(['success' => false, 'message' => 'Please select an enquiry type.']);
        return;
    }
    if (strlen($msg) < 10) {
        echo json_encode(['success' => false, 'message' => 'Please enter a message (at least 10 characters).']);
        return;
    }

    /* ── Insert ── */
    $stmt = $db->prepare("
        INSERT INTO contact_inquiries (name, email, phone, enquiry_type, event, message)
        VALUES (:name, :email, :phone, :enquiry_type, :event, :message)
    ");
    $stmt->bindParam(':name',         $name,  PDO::PARAM_STR);
    $stmt->bindParam(':email',        $email, PDO::PARAM_STR);
    $stmt->bindParam(':phone',        $phone, PDO::PARAM_STR);
    $stmt->bindParam(':enquiry_type', $type,  PDO::PARAM_STR);
    $stmt->bindParam(':event',        $event, PDO::PARAM_STR);
    $stmt->bindParam(':message',      $msg,   PDO::PARAM_STR);
    $stmt->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Enquiry submitted successfully.',
        'id'      => (int) $db->lastInsertId(),
    ]);
}
