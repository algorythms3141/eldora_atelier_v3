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

// Handle multipart/form-data for file uploads
if (empty($input) && !empty($_POST)) {
    $input = $_POST;
    $input['files'] = $_FILES;
}

if (!$input) {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit();
}

$action = $input['action'] ?? '';

try {
    $db = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    switch ($action) {
        case 'login':
            handleLogin($db, $input);
            break;
        case 'verify':
            handleVerify($db, $input);
            break;
        case 'get_categories':
            handleGetCategories($db, $input);
            break;
        case 'get_category':
            handleGetCategory($db, $input);
            break;
        case 'add_category':
            handleAddCategory($db, $input);
            break;
        case 'update_category':
            handleUpdateCategory($db, $input);
            break;
        case 'delete_category':
            handleDeleteCategory($db, $input);
            break;
        case 'get_products':
            handleGetProducts($db, $input);
            break;
        case 'get_product':
            handleGetProduct($db, $input);
            break;
        case 'add_product':
            handleAddProduct($db, $input);
            break;
        case 'update_product':
            handleUpdateProduct($db, $input);
            break;
        case 'delete_product':
            handleDeleteProduct($db, $input);
            break;
        case 'get_customer_orders':
            handleGetCustomerOrders($db, $input);
            break;
        case 'update_order_status':
            handleUpdateOrderStatus($db, $input);
            break;
        case 'public_get_categories':
            handlePublicGetCategories($db);
            break;
        case 'public_get_products':
            handlePublicGetProducts($db, $input);
            break;
        case 'co_public_get_categories':
            handleCoPublicGetCategories($db);
            break;
        // Custom Order Categories
        case 'co_get_categories':
            handleCoGetCategories($db, $input);
            break;
        case 'co_get_category':
            handleCoGetCategory($db, $input);
            break;
        case 'co_add_category':
            handleCoAddCategory($db, $input);
            break;
        case 'co_update_category':
            handleCoUpdateCategory($db, $input);
            break;
        case 'co_delete_category':
            handleCoDeleteCategory($db, $input);
            break;
        // Custom Order Measurements
        case 'co_get_measurements':
            handleCoGetMeasurements($db, $input);
            break;
        case 'co_get_measurement':
            handleCoGetMeasurement($db, $input);
            break;
        case 'co_add_measurements':
            handleCoAddMeasurements($db, $input);
            break;
        case 'co_update_measurement':
            handleCoUpdateMeasurement($db, $input);
            break;
        case 'co_delete_measurement':
            handleCoDeleteMeasurement($db, $input);
            break;
        // Contact Enquiries
        case 'get_contact_enquiries':
            handleGetContactEnquiries($db, $input);
            break;
        case 'delete_contact_enquiry':
            handleDeleteContactEnquiry($db, $input);
            break;
        // Services (admin)
        case 'get_services':
            handleGetServices($db, $input);
            break;
        case 'save_service':
            handleSaveService($db, $input);
            break;
        case 'delete_service':
            handleDeleteService($db, $input);
            break;
        // Services (public — no auth)
        case 'public_get_services':
            handlePublicGetServices($db);
            break;
        // Articles
        case 'get_articles':
            handleGetArticles($db, $input);
            break;
        case 'get_article':
            handleGetArticle($db, $input);
            break;
        case 'add_article':
            handleAddArticle($db, $input);
            break;
        case 'update_article':
            handleUpdateArticle($db, $input);
            break;
        case 'delete_article':
            handleDeleteArticle($db, $input);
            break;
        // Testimonials
        case 'get_testimonials':
            handleGetTestimonials($db, $input);
            break;
        case 'get_testimonial':
            handleGetTestimonial($db, $input);
            break;
        case 'add_testimonial':
            handleAddTestimonial($db, $input);
            break;
        case 'update_testimonial':
            handleUpdateTestimonial($db, $input);
            break;
        case 'delete_testimonial':
            handleDeleteTestimonial($db, $input);
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

function handleLogin($db, $input) {
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Username and password are required']);
        return;
    }

    $stmt = $db->prepare("SELECT id, username, password_hash FROM admin_users WHERE username = :username");
    $stmt->bindParam(':username', $username);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        return;
    }

    if (!password_verify($password, $user['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        return;
    }

    // Generate JWT token
    $token = generateJWT($user['id'], $user['username']);

    echo json_encode([
        'success' => true,
        'token' => $token,
        'username' => $user['username']
    ]);
}

function handleVerify($db, $input) {
    // Check multiple possible header locations for Authorization
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? 
                  $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 
                  (function_exists('apache_request_headers') ? apache_request_headers()['Authorization'] ?? '' : '');

    // Fallback: check if token is in request body (for servers that strip Authorization header)
    $token = '';
    
    if (!empty($authHeader)) {
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
        }
    }
    
    // Body fallback
    if (empty($token) && !empty($input['token'])) {
        $token = $input['token'];
    }

    if (empty($token)) {
        echo json_encode(['success' => false, 'message' => 'Authorization token missing']);
        return;
    }

    try {
        $payload = verifyJWT($token);

        if (!$payload) {
            echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
            return;
        }

        // Verify user still exists and is active
        $stmt = $db->prepare("SELECT id, username FROM admin_users WHERE id = :id");
        $stmt->bindParam(':id', $payload['user_id']);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'User not found']);
            return;
        }

        echo json_encode([
            'success' => true,
            'username' => $user['username']
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Token verification failed']);
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

// Category handlers
function handleGetCategories($db, $input) {
    verifyTokenOrDie($input);
    
    $stmt = $db->query("SELECT * FROM categories ORDER BY created_at DESC");
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'categories' => $categories]);
}

function handleGetCategory($db, $input) {
    verifyTokenOrDie($input);
    
    $id = $input['id'] ?? 0;
    
    $stmt = $db->prepare("SELECT * FROM categories WHERE id = :id");
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $category = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$category) {
        echo json_encode(['success' => false, 'message' => 'Category not found']);
        return;
    }
    
    echo json_encode(['success' => true, 'category' => $category]);
}

function handleAddCategory($db, $input) {
    verifyTokenOrDie($input);
    
    $name = $input['name'] ?? '';
    
    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Category name is required']);
        return;
    }
    
    $imageUrl = '';
    if (!empty($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $imageUrl = uploadImage($_FILES['image'], 'categories');
        if (!$imageUrl) {
            echo json_encode(['success' => false, 'message' => 'Failed to upload image']);
            return;
        }
    }
    
    $stmt = $db->prepare("INSERT INTO categories (name, image_url) VALUES (:name, :image_url)");
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':image_url', $imageUrl);
    $stmt->execute();
    
    echo json_encode(['success' => true, 'message' => 'Category added successfully']);
}

function handleUpdateCategory($db, $input) {
    verifyTokenOrDie($input);
    
    $id = $input['id'] ?? 0;
    $name = $input['name'] ?? '';
    
    if (empty($id) || empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
        return;
    }
    
    // Get existing category
    $stmt = $db->prepare("SELECT image_url FROM categories WHERE id = :id");
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $category = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$category) {
        echo json_encode(['success' => false, 'message' => 'Category not found']);
        return;
    }
    
    $imageUrl = $category['image_url'];
    
    // Handle image upload if provided
    if (!empty($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $newImageUrl = uploadImage($_FILES['image'], 'categories');
        if ($newImageUrl) {
            // Delete old image
            if ($imageUrl && file_exists(__DIR__ . '/../' . $imageUrl)) {
                unlink(__DIR__ . '/../' . $imageUrl);
            }
            $imageUrl = $newImageUrl;
        }
    }
    
    $stmt = $db->prepare("UPDATE categories SET name = :name, image_url = :image_url WHERE id = :id");
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':image_url', $imageUrl);
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    
    echo json_encode(['success' => true, 'message' => 'Category updated successfully']);
}

function handleDeleteCategory($db, $input) {
    verifyTokenOrDie($input);
    
    $id = $input['id'] ?? 0;
    
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
        return;
    }
    
    // Check if category has products
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM products WHERE category_id = :id");
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['count'] > 0) {
        echo json_encode(['success' => false, 'message' => 'This category contains products. Please delete or move the products before deleting the category.']);
        return;
    }
    
    // Get category image
    $stmt = $db->prepare("SELECT image_url FROM categories WHERE id = :id");
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $category = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Delete category
    $stmt = $db->prepare("DELETE FROM categories WHERE id = :id");
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    
    // Delete image
    if ($category && $category['image_url'] && file_exists(__DIR__ . '/../' . $category['image_url'])) {
        unlink(__DIR__ . '/../' . $category['image_url']);
    }
    
    echo json_encode(['success' => true, 'message' => 'Category deleted successfully']);
}

// Product handlers
function handleGetProducts($db, $input) {
    verifyTokenOrDie($input);
    
    $categoryId = $input['category_id'] ?? '';
    
    if ($categoryId) {
        $stmt = $db->prepare("
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.category_id = :category_id 
            ORDER BY p.created_at DESC
        ");
        $stmt->bindParam(':category_id', $categoryId);
    } else {
        $stmt = $db->query("
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC
        ");
    }
    
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'products' => $products]);
}

function handleGetProduct($db, $input) {
    verifyTokenOrDie($input);
    
    $id = $input['id'] ?? 0;
    
    $stmt = $db->prepare("
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.id = :id
    ");
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        echo json_encode(['success' => false, 'message' => 'Product not found']);
        return;
    }
    
    echo json_encode(['success' => true, 'product' => $product]);
}

function handleAddProduct($db, $input) {
    verifyTokenOrDie($input);
    
    $categoryId = $input['category_id'] ?? '';
    $name = $input['name'] ?? '';
    $description = $input['description'] ?? '';
    $availableSizes = $input['available_sizes'] ?? '';
    $priceFrom = $input['price_from'] ?? '';
    
    if (empty($categoryId) || empty($name) || empty($priceFrom)) {
        echo json_encode(['success' => false, 'message' => 'Category, name, and price are required']);
        return;
    }
    
    // Handle multiple image uploads
    $imageUrls = [];
    $imageCount = intval($input['image_count'] ?? 0);
    
    for ($i = 0; $i < $imageCount; $i++) {
        $fileKey = "images_$i";
        if (!empty($_FILES[$fileKey]) && $_FILES[$fileKey]['error'] === UPLOAD_ERR_OK) {
            $url = uploadImage($_FILES[$fileKey], 'products');
            if ($url) {
                $imageUrls[] = $url;
            }
        }
    }
    
    $imagesUrlsString = implode('|', $imageUrls);
    
    $stmt = $db->prepare("
        INSERT INTO products (category_id, name, description, available_sizes, images_urls, price_from) 
        VALUES (:category_id, :name, :description, :available_sizes, :images_urls, :price_from)
    ");
    $stmt->bindParam(':category_id', $categoryId);
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':description', $description);
    $stmt->bindParam(':available_sizes', $availableSizes);
    $stmt->bindParam(':images_urls', $imagesUrlsString);
    $stmt->bindParam(':price_from', $priceFrom);
    $stmt->execute();
    
    echo json_encode(['success' => true, 'message' => 'Product added successfully']);
}

function handleUpdateProduct($db, $input) {
    verifyTokenOrDie($input);
    
    $id = $input['id'] ?? 0;
    $categoryId = $input['category_id'] ?? '';
    $name = $input['name'] ?? '';
    $description = $input['description'] ?? '';
    $availableSizes = $input['available_sizes'] ?? '';
    $priceFrom = $input['price_from'] ?? '';
    
    if (empty($id) || empty($categoryId) || empty($name) || empty($priceFrom)) {
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
        return;
    }
    
    // Get existing images from form (user-selected images to keep)
    $existingImagesParam = $input['existing_images'] ?? '';
    $existingImages = !empty($existingImagesParam) ? explode('|', $existingImagesParam) : [];
    
    // Handle new image uploads
    $imageCount = intval($input['image_count'] ?? 0);
    $newImages = [];
    
    for ($i = 0; $i < $imageCount; $i++) {
        $fileKey = "images_$i";
        if (!empty($_FILES[$fileKey]) && $_FILES[$fileKey]['error'] === UPLOAD_ERR_OK) {
            $url = uploadImage($_FILES[$fileKey], 'products');
            if ($url) {
                $newImages[] = $url;
            }
        }
    }
    
    // Combine user-selected existing images with new uploads
    $allImages = array_merge($existingImages, $newImages);
    $imagesUrlsString = implode('|', $allImages);
    
    $stmt = $db->prepare("
        UPDATE products 
        SET category_id = :category_id, name = :name, description = :description, 
            available_sizes = :available_sizes, images_urls = :images_urls, price_from = :price_from 
        WHERE id = :id
    ");
    $stmt->bindParam(':category_id', $categoryId);
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':description', $description);
    $stmt->bindParam(':available_sizes', $availableSizes);
    $stmt->bindParam(':images_urls', $imagesUrlsString);
    $stmt->bindParam(':price_from', $priceFrom);
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    
    echo json_encode(['success' => true, 'message' => 'Product updated successfully']);
}

function handleDeleteProduct($db, $input) {
    verifyTokenOrDie($input);
    
    $id = $input['id'] ?? 0;
    
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
        return;
    }
    
    // Get product images
    $stmt = $db->prepare("SELECT images_urls FROM products WHERE id = :id");
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Delete product
    $stmt = $db->prepare("DELETE FROM products WHERE id = :id");
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    
    // Delete images
    if ($product && $product['images_urls']) {
        $images = explode('|', $product['images_urls']);
        foreach ($images as $image) {
            if ($image && file_exists(__DIR__ . '/../' . $image)) {
                unlink(__DIR__ . '/../' . $image);
            }
        }
    }
    
    echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
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

function uploadImage($file, $subfolder) {
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    // Check for upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        error_log('Upload error code: ' . $file['error']);
        return false;
    }
    
    // Check file type
    if (!in_array($file['type'], $allowedTypes)) {
        error_log('Invalid file type: ' . $file['type']);
        return false;
    }
    
    $uploadDir = __DIR__ . '/../uploads/' . $subfolder . '/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            error_log('Failed to create upload directory: ' . $uploadDir);
            return false;
        }
    }
    
    // Check if directory is writable
    if (!is_writable($uploadDir)) {
        error_log('Upload directory not writable: ' . $uploadDir);
        return false;
    }
    
    // Get extension from filename or MIME type
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    
    // Fallback to MIME type if extension is missing
    if (empty($extension)) {
        $mimeToExt = [
            'image/jpeg' => 'jpg',
            'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp'
        ];
        $extension = $mimeToExt[$file['type']] ?? 'jpg';
    }
    
    $filename = uniqid() . '.' . $extension;
    $filepath = $uploadDir . $filename;
    
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        error_log('Failed to move uploaded file to: ' . $filepath);
        return false;
    }
    
    // Set proper file permissions
    chmod($filepath, 0644);
    
    return '/uploads/' . $subfolder . '/' . $filename;
}

// Public API handlers (no authentication required)
function handlePublicGetCategories($db) {
    $stmt = $db->query("SELECT * FROM categories ORDER BY name ASC");
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'categories' => $categories]);
}

function handlePublicGetProducts($db, $input) {
    $categoryId = $input['category_id'] ?? '';
    
    if ($categoryId) {
        $stmt = $db->prepare("
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.category_id = :category_id 
            ORDER BY p.created_at DESC
        ");
        $stmt->bindParam(':category_id', $categoryId);
    } else {
        $stmt = $db->query("
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC
        ");
    }
    
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'products' => $products]);
}

/* ================================================================
   CUSTOM ORDER — co_categories handlers
================================================================ */
function handleCoGetCategories($db, $input) {
    verifyTokenOrDie($input);

    $stmt = $db->query("SELECT * FROM co_categories ORDER BY name ASC");
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'categories' => $categories]);
}

function handleCoGetCategory($db, $input) {
    verifyTokenOrDie($input);

    $id = intval($input['id'] ?? 0);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'Invalid id']); return; }

    $stmt = $db->prepare("SELECT * FROM co_categories WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $category = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$category) { echo json_encode(['success' => false, 'message' => 'Category not found']); return; }

    echo json_encode(['success' => true, 'category' => $category]);
}

function handleCoAddCategory($db, $input) {
    verifyTokenOrDie($input);

    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');

    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Category name is required']);
        return;
    }

    $stmt = $db->prepare("INSERT INTO co_categories (name, description) VALUES (:name, :description)");
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':description', $description);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Category added successfully']);
}

function handleCoUpdateCategory($db, $input) {
    verifyTokenOrDie($input);

    $id          = intval($input['id'] ?? 0);
    $name        = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');

    if (!$id || empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
        return;
    }

    $stmt = $db->prepare("UPDATE co_categories SET name = :name, description = :description WHERE id = :id");
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':description', $description);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Category updated successfully']);
}

function handleCoDeleteCategory($db, $input) {
    verifyTokenOrDie($input);

    $id = intval($input['id'] ?? 0);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'Invalid id']); return; }

    // Cascade: remove linked measurements first (FK constraint)
    $stmt = $db->prepare("DELETE FROM co_custom_measurements WHERE category_id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    $stmt = $db->prepare("DELETE FROM co_categories WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Category deleted successfully']);
}

/* ================================================================
   CUSTOM ORDER — co_custom_measurements handlers
================================================================ */
function handleCoGetMeasurements($db, $input) {
    verifyTokenOrDie($input);

    $stmt = $db->query("
        SELECT m.*, c.name AS category_name
        FROM co_custom_measurements m
        JOIN co_categories c ON m.category_id = c.id
        ORDER BY c.name ASC, m.sort_order ASC, m.id ASC
    ");
    $measurements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'measurements' => $measurements]);
}

function handleCoGetMeasurement($db, $input) {
    verifyTokenOrDie($input);

    $id = intval($input['id'] ?? 0);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'Invalid id']); return; }

    $stmt = $db->prepare("
        SELECT m.*, c.name AS category_name
        FROM co_custom_measurements m
        JOIN co_categories c ON m.category_id = c.id
        WHERE m.id = :id
    ");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $measurement = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$measurement) { echo json_encode(['success' => false, 'message' => 'Measurement not found']); return; }

    echo json_encode(['success' => true, 'measurement' => $measurement]);
}

function handleCoAddMeasurements($db, $input) {
    verifyTokenOrDie($input);

    $categoryId = intval($input['category_id'] ?? 0);
    $namesRaw   = trim($input['names'] ?? '');

    if (!$categoryId || empty($namesRaw)) {
        echo json_encode(['success' => false, 'message' => 'Category and at least one measurement name are required']);
        return;
    }

    // names are pipe-separated and arrive in the user-defined order
    $names = array_values(array_filter(array_map('trim', explode('|', $namesRaw))));
    if (empty($names)) {
        echo json_encode(['success' => false, 'message' => 'No valid measurement names provided']);
        return;
    }

    // Find the current max sort_order for this category so new rows are appended
    $maxStmt = $db->prepare("SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM co_custom_measurements WHERE category_id = :cid");
    $maxStmt->bindParam(':cid', $categoryId, PDO::PARAM_INT);
    $maxStmt->execute();
    $baseOrder = intval($maxStmt->fetchColumn()) + 1;

    $stmt = $db->prepare("INSERT INTO co_custom_measurements (category_id, name, sort_order) VALUES (:category_id, :name, :sort_order)");
    foreach ($names as $i => $name) {
        $sortOrder = $baseOrder + $i;
        $stmt->bindParam(':category_id', $categoryId, PDO::PARAM_INT);
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':sort_order', $sortOrder, PDO::PARAM_INT);
        $stmt->execute();
    }

    $count = count($names);
    echo json_encode(['success' => true, 'message' => "$count measurement(s) added successfully"]);
}

function handleCoUpdateMeasurement($db, $input) {
    verifyTokenOrDie($input);

    $id         = intval($input['id'] ?? 0);
    $categoryId = intval($input['category_id'] ?? 0);
    $namesRaw   = trim($input['names'] ?? '');

    if (!$id || !$categoryId || empty($namesRaw)) {
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
        return;
    }

    // Single-field edit: take the first name only
    $names = array_values(array_filter(array_map('trim', explode('|', $namesRaw))));
    $name  = $names[0] ?? '';

    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Measurement name is required']);
        return;
    }

    $stmt = $db->prepare("UPDATE co_custom_measurements SET category_id = :category_id, name = :name WHERE id = :id");
    $stmt->bindParam(':category_id', $categoryId, PDO::PARAM_INT);
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Measurement updated successfully']);
}

function handleCoDeleteMeasurement($db, $input) {
    verifyTokenOrDie($input);

    $id = intval($input['id'] ?? 0);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'Invalid id']); return; }

    $stmt = $db->prepare("DELETE FROM co_custom_measurements WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Measurement deleted successfully']);
}

/* ================================================================
   CUSTOM ORDER — public endpoint (no auth)
   Returns all co_categories, each with its ordered measurements
================================================================ */
function handleCoPublicGetCategories($db) {
    // Fetch all categories
    $catStmt = $db->query("SELECT id, name, description FROM co_categories ORDER BY name ASC");
    $categories = $catStmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch all measurements ordered by sort_order
    $measStmt = $db->query("
        SELECT id, category_id, name
        FROM co_custom_measurements
        ORDER BY category_id ASC, sort_order ASC, id ASC
    ");
    $allMeasurements = $measStmt->fetchAll(PDO::FETCH_ASSOC);

    // Group measurements by category_id
    $measByCategory = [];
    foreach ($allMeasurements as $m) {
        $measByCategory[$m['category_id']][] = ['id' => $m['id'], 'name' => $m['name']];
    }

    // Attach measurements array to each category
    foreach ($categories as &$cat) {
        $cat['measurements'] = $measByCategory[$cat['id']] ?? [];
    }
    unset($cat);

    echo json_encode(['success' => true, 'categories' => $categories]);
}

/* ================================================================
   CUSTOMER ORDERS — admin handlers
================================================================ */
function handleGetCustomerOrders($db, $input) {
    verifyTokenOrDie($input);

    $status = trim($input['status'] ?? '');
    $allowed = ['PENDING', 'IN-PROGRESS', 'DONE'];

    if ($status !== '' && !in_array($status, $allowed, true)) {
        echo json_encode(['success' => false, 'message' => 'Invalid status filter']);
        return;
    }

    if ($status !== '') {
        $stmt = $db->prepare("
            SELECT id, order_data, status, modified_by, created_at, updated_at
            FROM custom_orders
            WHERE status = :status
            ORDER BY created_at DESC
        ");
        $stmt->bindParam(':status', $status, PDO::PARAM_STR);
    } else {
        $stmt = $db->query("
            SELECT id, order_data, status, modified_by, created_at, updated_at
            FROM custom_orders
            ORDER BY created_at DESC
        ");
    }

    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Decode the JSON blob for each row so the front-end gets a proper object
    foreach ($rows as &$row) {
        $row['order_data'] = json_decode($row['order_data'], true);
    }
    unset($row);

    echo json_encode(['success' => true, 'orders' => $rows]);
}

function handleUpdateOrderStatus($db, $input) {
    verifyTokenOrDie($input);

    $id      = intval($input['id']     ?? 0);
    $status  = trim($input['status']   ?? '');
    $allowed = ['PENDING', 'IN-PROGRESS', 'DONE'];

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Invalid order id']);
        return;
    }
    if (!in_array($status, $allowed, true)) {
        echo json_encode(['success' => false, 'message' => 'Invalid status value']);
        return;
    }

    // Derive modified_by from the JWT payload
    $modifiedBy = 'admin';
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ??
                  $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ??
                  (function_exists('apache_request_headers') ? apache_request_headers()['Authorization'] ?? '' : '');
    $token = '';
    if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $m)) {
        $token = $m[1];
    }
    if (empty($token) && !empty($input['token'])) {
        $token = $input['token'];
    }
    if (!empty($token)) {
        $payload = verifyJWT($token);
        if ($payload && !empty($payload['username'])) {
            $modifiedBy = $payload['username'];
        }
    }

    $stmt = $db->prepare("
        UPDATE custom_orders SET status = :status, modified_by = :modified_by WHERE id = :id
    ");
    $stmt->bindParam(':status',      $status,     PDO::PARAM_STR);
    $stmt->bindParam(':modified_by', $modifiedBy, PDO::PARAM_STR);
    $stmt->bindParam(':id',          $id,         PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => "Order #$id status updated to $status"]);
}

/* ================================================================
   SERVICES handlers
================================================================ */
function handleGetServices($db, $input) {
    verifyTokenOrDie($input);

    $stmt = $db->query("SELECT * FROM services ORDER BY created_at DESC");
    $services = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'services' => $services]);
}

function handleSaveService($db, $input) {
    verifyTokenOrDie($input);

    $id           = intval($input['id'] ?? 0);
    $title        = trim($input['title'] ?? '');
    $summary      = trim($input['summary'] ?? '');
    $description  = trim($input['description'] ?? '');
    $startingPrice = trim($input['starting_price'] ?? '');

    if (empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Title is required']);
        return;
    }

    // --- Photo handling ---
    // Existing photos the admin chose to keep (pipe-separated urls sent from the form)
    $existingPhotos = [];
    $existingRaw = trim($input['existing_photos'] ?? '');
    if ($existingRaw !== '') {
        $existingPhotos = array_values(array_filter(explode('|', $existingRaw)));
    }

    // New photo uploads: keys photo_0 (main) .. photo_4 (optional 4)
    $newPhotos = [];
    for ($i = 0; $i <= 4; $i++) {
        $key = "photo_$i";
        if (!empty($_FILES[$key]) && $_FILES[$key]['error'] === UPLOAD_ERR_OK) {
            $url = uploadImage($_FILES[$key], 'services');
            if ($url) {
                $newPhotos[] = $url;
            }
        }
    }

    // Merge: kept existing first, then new; cap at 5
    $allPhotos = array_slice(array_merge($existingPhotos, $newPhotos), 0, 5);
    $photoUrlsString = implode('|', $allPhotos);

    $startingPriceVal = ($startingPrice !== '') ? floatval($startingPrice) : null;

    if ($id) {
        // UPDATE
        $stmt = $db->prepare("
            UPDATE services
            SET title = :title, summary = :summary, description = :description,
                photo_urls = :photo_urls, starting_price = :starting_price
            WHERE id = :id
        ");
        $stmt->bindParam(':title',         $title);
        $stmt->bindParam(':summary',       $summary);
        $stmt->bindParam(':description',   $description);
        $stmt->bindParam(':photo_urls',    $photoUrlsString);
        $stmt->bindParam(':starting_price', $startingPriceVal);
        $stmt->bindParam(':id',            $id, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode(['success' => true, 'message' => 'Service updated successfully']);
    } else {
        // INSERT
        $stmt = $db->prepare("
            INSERT INTO services (title, summary, description, photo_urls, starting_price)
            VALUES (:title, :summary, :description, :photo_urls, :starting_price)
        ");
        $stmt->bindParam(':title',         $title);
        $stmt->bindParam(':summary',       $summary);
        $stmt->bindParam(':description',   $description);
        $stmt->bindParam(':photo_urls',    $photoUrlsString);
        $stmt->bindParam(':starting_price', $startingPriceVal);
        $stmt->execute();

        echo json_encode(['success' => true, 'message' => 'Service added successfully', 'id' => intval($db->lastInsertId())]);
    }
}

function handleDeleteService($db, $input) {
    verifyTokenOrDie($input);

    $id = intval($input['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Invalid service id']);
        return;
    }

    // Fetch photos so we can delete files
    $stmt = $db->prepare("SELECT photo_urls FROM services WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $service = $stmt->fetch(PDO::FETCH_ASSOC);

    // Delete DB row
    $stmt = $db->prepare("DELETE FROM services WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    // Delete photo files
    if ($service && !empty($service['photo_urls'])) {
        foreach (explode('|', $service['photo_urls']) as $url) {
            if ($url && file_exists(__DIR__ . '/../' . $url)) {
                unlink(__DIR__ . '/../' . $url);
            }
        }
    }

    echo json_encode(['success' => true, 'message' => 'Service deleted successfully']);
}

/* ================================================================
   SERVICES — public endpoint (no auth)
================================================================ */
function handlePublicGetServices($db) {
    $stmt = $db->query("SELECT id, title, summary, description, photo_urls, starting_price, last_modified FROM services ORDER BY created_at DESC");
    $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'services' => $services]);
}

/* ================================================================
   ARTICLES handlers
================================================================ */
function handleGetArticles($db, $input) {
    verifyTokenOrDie($input);

    $stmt = $db->query("
        SELECT id, title, content, image_urls, created, modified, active
        FROM articles
        ORDER BY created DESC
    ");
    $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'articles' => $articles]);
}

function handleGetArticle($db, $input) {
    verifyTokenOrDie($input);

    $id = intval($input['id'] ?? 0);

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Invalid article id']);
        return;
    }

    $stmt = $db->prepare("
        SELECT id, title, content, image_urls, created, modified, active
        FROM articles
        WHERE id = :id
    ");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $article = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$article) {
        echo json_encode(['success' => false, 'message' => 'Article not found']);
        return;
    }

    echo json_encode(['success' => true, 'article' => $article]);
}

function handleAddArticle($db, $input) {
    verifyTokenOrDie($input);

    $title = trim($input['title'] ?? '');
    $content = trim($input['content'] ?? '');
    $active = $input['active'] ?? 'Y';

    if (empty($title) || empty($content)) {
        echo json_encode(['success' => false, 'message' => 'Title and content are required']);
        return;
    }

    error_log("Article add - FILES: " . print_r($_FILES, true));
    error_log("Article add - POST: " . print_r($_POST, true));

    // Handle photo uploads (similar to services)
    $newPhotos = [];
    for ($i = 0; $i <= 4; $i++) {
        $key = "photo_$i";
        error_log("Checking key: $key, exists: " . (isset($_FILES[$key]) ? 'yes' : 'no'));
        if (!empty($_FILES[$key]) && $_FILES[$key]['error'] === UPLOAD_ERR_OK) {
            error_log("Uploading file: $key");
            $url = uploadImage($_FILES[$key], 'articles');
            if ($url) {
                $newPhotos[] = $url;
                error_log("Uploaded successfully: $url");
            }
        }
    }

    // Limit to 5 images
    $allPhotos = array_slice($newPhotos, 0, 5);
    $photoUrlsString = implode('|', $allPhotos);

    error_log("Final photo URLs: $photoUrlsString");

    $stmt = $db->prepare("
        INSERT INTO articles (title, content, image_urls, active)
        VALUES (:title, :content, :image_urls, :active)
    ");
    $stmt->bindParam(':title', $title);
    $stmt->bindParam(':content', $content);
    $stmt->bindParam(':image_urls', $photoUrlsString);
    $stmt->bindParam(':active', $active);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Article created successfully']);
}

function handleUpdateArticle($db, $input) {
    verifyTokenOrDie($input);

    $id = intval($input['id'] ?? 0);
    $title = trim($input['title'] ?? '');
    $content = trim($input['content'] ?? '');
    $active = $input['active'] ?? 'Y';
    $existingPhotos = trim($input['existing_photos'] ?? '');

    if (empty($id) || empty($title) || empty($content)) {
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
        return;
    }

    // Existing photos the admin chose to keep (pipe-separated urls sent from the form)
    $existingPhotosArray = [];
    if ($existingPhotos !== '') {
        $existingPhotosArray = array_values(array_filter(explode('|', $existingPhotos)));
    }

    // New photo uploads: keys photo_0 .. photo_4
    $newPhotos = [];
    for ($i = 0; $i <= 4; $i++) {
        $key = "photo_$i";
        if (!empty($_FILES[$key]) && $_FILES[$key]['error'] === UPLOAD_ERR_OK) {
            $url = uploadImage($_FILES[$key], 'articles');
            if ($url) {
                $newPhotos[] = $url;
            }
        }
    }

    // Merge: kept existing first, then new; cap at 5
    $allPhotos = array_slice(array_merge($existingPhotosArray, $newPhotos), 0, 5);
    $photoUrlsString = implode('|', $allPhotos);

    $stmt = $db->prepare("
        UPDATE articles
        SET title = :title, content = :content, image_urls = :image_urls, active = :active
        WHERE id = :id
    ");
    $stmt->bindParam(':title', $title);
    $stmt->bindParam(':content', $content);
    $stmt->bindParam(':image_urls', $photoUrlsString);
    $stmt->bindParam(':active', $active);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Article updated successfully']);
}

function handleDeleteArticle($db, $input) {
    verifyTokenOrDie($input);

    $id = intval($input['id'] ?? 0);

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Invalid article id']);
        return;
    }

    // Fetch images so we can delete files
    $stmt = $db->prepare("SELECT image_urls FROM articles WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $article = $stmt->fetch(PDO::FETCH_ASSOC);

    // Delete DB row
    $stmt = $db->prepare("DELETE FROM articles WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    // Delete image files
    if ($article && !empty($article['image_urls'])) {
        foreach (explode('|', $article['image_urls']) as $url) {
            if ($url && file_exists(__DIR__ . '/../' . $url)) {
                unlink(__DIR__ . '/../' . $url);
            }
        }
    }

    echo json_encode(['success' => true, 'message' => 'Article deleted successfully']);
}

/* ================================================================
   CONTACT ENQUIRIES handlers
================================================================ */
function handleGetContactEnquiries($db, $input) {
    verifyTokenOrDie($input);

    $stmt = $db->query("
        SELECT id, name, email, phone, enquiry_type, event, message, modified, created_at
        FROM contact_inquiries
        ORDER BY created_at DESC
    ");
    $enquiries = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'enquiries' => $enquiries]);
}

function handleDeleteContactEnquiry($db, $input) {
    verifyTokenOrDie($input);

    $id = intval($input['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Invalid enquiry id']);
        return;
    }

    $stmt = $db->prepare("DELETE FROM contact_inquiries WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Enquiry deleted successfully']);
}

/* ================================================================
   TESTIMONIALS handlers
================================================================ */
function handleGetTestimonials($db, $input) {
    verifyTokenOrDie($input);

    $stmt = $db->query("
        SELECT id, customer_name, customer_location, review_desc, star_count, created, modified
        FROM customer_testimonials
        ORDER BY created DESC
    ");
    $testimonials = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'testimonials' => $testimonials]);
}

function handleGetTestimonial($db, $input) {
    verifyTokenOrDie($input);

    $id = intval($input['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Invalid testimonial id']);
        return;
    }

    $stmt = $db->prepare("SELECT * FROM customer_testimonials WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $testimonial = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$testimonial) {
        echo json_encode(['success' => false, 'message' => 'Testimonial not found']);
        return;
    }

    echo json_encode(['success' => true, 'testimonial' => $testimonial]);
}

function handleAddTestimonial($db, $input) {
    verifyTokenOrDie($input);

    $customer_name = trim($input['customer_name'] ?? '');
    $customer_location = trim($input['customer_location'] ?? '');
    $review_desc = trim($input['review_desc'] ?? '');
    $star_count = intval($input['star_count'] ?? 5);

    if (empty($customer_name) || empty($review_desc)) {
        echo json_encode(['success' => false, 'message' => 'Customer name and review are required']);
        return;
    }

    if ($star_count < 1 || $star_count > 5) {
        echo json_encode(['success' => false, 'message' => 'Star count must be between 1 and 5']);
        return;
    }

    $stmt = $db->prepare("
        INSERT INTO customer_testimonials (customer_name, customer_location, review_desc, star_count)
        VALUES (:customer_name, :customer_location, :review_desc, :star_count)
    ");
    $stmt->bindParam(':customer_name', $customer_name);
    $stmt->bindParam(':customer_location', $customer_location);
    $stmt->bindParam(':review_desc', $review_desc);
    $stmt->bindParam(':star_count', $star_count, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Testimonial added successfully']);
}

function handleUpdateTestimonial($db, $input) {
    verifyTokenOrDie($input);

    $id = intval($input['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Invalid testimonial id']);
        return;
    }

    $customer_name = trim($input['customer_name'] ?? '');
    $customer_location = trim($input['customer_location'] ?? '');
    $review_desc = trim($input['review_desc'] ?? '');
    $star_count = intval($input['star_count'] ?? 5);

    if (empty($customer_name) || empty($review_desc)) {
        echo json_encode(['success' => false, 'message' => 'Customer name and review are required']);
        return;
    }

    if ($star_count < 1 || $star_count > 5) {
        echo json_encode(['success' => false, 'message' => 'Star count must be between 1 and 5']);
        return;
    }

    $stmt = $db->prepare("
        UPDATE customer_testimonials
        SET customer_name = :customer_name,
            customer_location = :customer_location,
            review_desc = :review_desc,
            star_count = :star_count
        WHERE id = :id
    ");
    $stmt->bindParam(':customer_name', $customer_name);
    $stmt->bindParam(':customer_location', $customer_location);
    $stmt->bindParam(':review_desc', $review_desc);
    $stmt->bindParam(':star_count', $star_count, PDO::PARAM_INT);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Testimonial updated successfully']);
}

function handleDeleteTestimonial($db, $input) {
    verifyTokenOrDie($input);

    $id = intval($input['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Invalid testimonial id']);
        return;
    }

    $stmt = $db->prepare("DELETE FROM customer_testimonials WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Testimonial deleted successfully']);
}
