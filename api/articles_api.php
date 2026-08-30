<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database connection
try {
    $db = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get_articles':
        handleGetArticles($db);
        break;
    case 'get_article':
        handleGetArticle($db);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function handleGetArticles($db) {
    $offset = intval($_GET['offset'] ?? 0);
    $limit = intval($_GET['limit'] ?? 7);
    
    // Fetch active articles ordered by modified desc
    $stmt = $db->prepare("
        SELECT id, title, content, image_urls, created, modified
        FROM articles
        WHERE active = 'Y'
        ORDER BY modified DESC
        LIMIT :limit OFFSET :offset
    ");
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count for pagination
    $countStmt = $db->query("SELECT COUNT(*) as total FROM articles WHERE active = 'Y'");
    $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    echo json_encode([
        'success' => true,
        'articles' => $articles,
        'total' => $total,
        'offset' => $offset,
        'limit' => $limit
    ]);
}

function handleGetArticle($db) {
    $id = intval($_GET['id'] ?? 0);
    
    if ($id === 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid article ID']);
        return;
    }
    
    $stmt = $db->prepare("
        SELECT id, title, content, image_urls, created, modified
        FROM articles
        WHERE id = :id AND active = 'Y'
    ");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $article = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$article) {
        echo json_encode(['success' => false, 'message' => 'Article not found']);
        return;
    }
    
    echo json_encode([
        'success' => true,
        'article' => $article
    ]);
}
