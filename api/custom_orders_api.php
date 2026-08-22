<?php
require_once __DIR__ . '/config.php';

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

$action = $_POST['action'] ?? '';

if ($action !== 'submit_order') {
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

    handleSubmitOrder($db);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error. Please try again.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

/* ================================================================
   SUBMIT ORDER
================================================================ */
function handleSubmitOrder($db) {

    /* ── 1. Collect + validate required text fields ── */
    $name        = trim($_POST['name']        ?? '');
    $phone       = trim($_POST['phone']       ?? '');
    $categoryId  = trim($_POST['category_id'] ?? '');
    $categoryName= trim($_POST['category_name'] ?? '');

    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Full name is required.']);
        return;
    }
    if (empty($phone) || strlen(preg_replace('/\D/', '', $phone)) < 7) {
        echo json_encode(['success' => false, 'message' => 'A valid phone number is required.']);
        return;
    }
    if (empty($categoryId)) {
        echo json_encode(['success' => false, 'message' => 'Please select a category.']);
        return;
    }

    /* ── 2. Optional text fields ── */
    $email        = trim($_POST['email']         ?? '');
    $eventDate    = trim($_POST['event_date']    ?? '');
    $designDesc   = trim($_POST['design_desc']   ?? '');
    $notes        = trim($_POST['notes']         ?? '');
    $budget       = trim($_POST['budget']        ?? '');
    $sizeMethod   = trim($_POST['size_method']   ?? 'standard');   // 'standard' | 'custom'
    $stdSize      = trim($_POST['std_size']      ?? '');
    $fitNotes     = trim($_POST['fit_notes']     ?? '');

    /* ── 3. Custom measurement fields (JSON-encoded array from JS) ── */
    $measurementsJson = trim($_POST['measurements'] ?? '[]');
    $measurements = json_decode($measurementsJson, true);
    if (!is_array($measurements)) {
        $measurements = [];
    }
    // Sanitise each entry
    $measurements = array_values(array_filter(
        array_map(function ($m) {
            $label = trim($m['label'] ?? '');
            $value = trim($m['value'] ?? '');
            return ($label !== '' && $value !== '')
                ? ['label' => $label, 'value' => $value]
                : null;
        }, $measurements)
    ));

    /* ── 4. Image uploads (max 5) ── */
    $MAX_IMAGES   = 5;
    $MAX_SIZE     = 10 * 1024 * 1024; // 10 MB per file
    $ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    $uploadDir    = __DIR__ . '/../uploads/custom_orders/';

    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            echo json_encode(['success' => false, 'message' => 'Server configuration error: upload directory could not be created.']);
            return;
        }
    }
    if (!is_writable($uploadDir)) {
        echo json_encode(['success' => false, 'message' => 'Server configuration error: upload directory is not writable.']);
        return;
    }

    $uploadedPaths = [];
    $errors        = [];

    // Images arrive as images_0, images_1, … images_N  (sent from JS)
    $imageCount = intval($_POST['image_count'] ?? 0);
    $imageCount = min($imageCount, $MAX_IMAGES); // hard cap

    for ($i = 0; $i < $imageCount; $i++) {
        $key = 'image_' . $i;
        if (empty($_FILES[$key]) || $_FILES[$key]['error'] === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        $file = $_FILES[$key];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errors[] = "File #{$i}: upload error code {$file['error']}.";
            continue;
        }
        if ($file['size'] > $MAX_SIZE) {
            $errors[] = "\"{$file['name']}\" exceeds the 10 MB limit.";
            continue;
        }

        // Validate MIME via finfo (do not trust $_FILES[]['type'])
        $finfo    = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);
        if (!in_array($mimeType, $ALLOWED_MIME, true)) {
            $errors[] = "\"{$file['name']}\" is not a supported image type (JPG, PNG, WebP only).";
            continue;
        }

        // Build safe filename
        $mimeToExt = [
            'image/jpeg' => 'jpg',
            'image/jpg'  => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
        ];
        $ext      = $mimeToExt[$mimeType] ?? 'jpg';
        $filename = uniqid('co_', true) . '.' . $ext;
        $dest     = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            $errors[] = "\"{$file['name']}\" could not be saved. Please try again.";
            continue;
        }
        chmod($dest, 0644);
        $uploadedPaths[] = '/uploads/custom_orders/' . $filename;
    }

    // Non-fatal: warn but still save the order even if some images failed
    // (they won't appear in order_data if they weren't uploaded)

    /* ── 5. Build the order JSON ── */
    $orderData = [
        'version'    => '1.0',
        'submitted_at' => date('c'), // ISO 8601

        'customer' => [
            'name'       => $name,
            'phone'      => $phone,
            'email'      => $email ?: null,
            'event_date' => $eventDate ?: null,
        ],

        'category' => [
            'id'   => $categoryId,
            'name' => $categoryName,
        ],

        'design' => [
            'description' => $designDesc ?: null,
            'images'      => $uploadedPaths,   // relative paths from web root
        ],

        'size' => [
            'method'       => $sizeMethod,
            'standard_size'=> ($sizeMethod === 'standard' && $stdSize) ? $stdSize : null,
            'measurements' => ($sizeMethod === 'custom') ? $measurements : [],
            'fit_notes'    => ($sizeMethod === 'custom' && $fitNotes) ? $fitNotes : null,
        ],

        'budget' => $budget ?: null,
        'notes'  => $notes  ?: null,

        'meta' => [
            'image_count'  => count($uploadedPaths),
            'upload_errors'=> $errors,
        ],
    ];

    $orderJson = json_encode($orderData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    /* ── 6. Insert into custom_orders ── */
    $stmt = $db->prepare(
        "INSERT INTO custom_orders (order_data, modified_by) VALUES (:order_data, :modified_by)"
    );
    $modifiedBy = 'customer_submission';
    $stmt->bindParam(':order_data',  $orderJson,   PDO::PARAM_STR);
    $stmt->bindParam(':modified_by', $modifiedBy,  PDO::PARAM_STR);
    $stmt->execute();

    $orderId = $db->lastInsertId();

    /* ── 7. Respond ── */
    $response = [
        'success'  => true,
        'order_id' => (int) $orderId,
        'message'  => 'Order submitted successfully.',
    ];
    if (!empty($errors)) {
        $response['warnings'] = $errors; // tell the JS which images were skipped
    }

    echo json_encode($response);
}
