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
        case 'public_get_categories':
            handlePublicGetCategories($db);
            break;
        case 'public_get_products':
            handlePublicGetProducts($db, $input);
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
