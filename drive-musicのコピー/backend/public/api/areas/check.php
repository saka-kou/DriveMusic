<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../src/database.php';
require_once __DIR__ . '/../../../src/area-matcher.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Allow the local Next.js frontend to call the standalone PHP API during development.
$allowedOrigin = getenv('CORS_ORIGIN') ?: 'http://localhost:3000';
if (($_SERVER['HTTP_ORIGIN'] ?? '') === $allowedOrigin) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'POSTで緯度・経度を送信してください。']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)
    || !isset($input['latitude'], $input['longitude'])
    || !is_numeric($input['latitude'])
    || !is_numeric($input['longitude'])) {
    respond(400, ['error' => 'latitude と longitude は必須の数値です。']);
}

$latitude = (float) $input['latitude'];
$longitude = (float) $input['longitude'];
if (!is_finite($latitude) || !is_finite($longitude)
    || $latitude < -90 || $latitude > 90
    || $longitude < -180 || $longitude > 180) {
    respond(400, ['error' => '緯度・経度の範囲が正しくありません。']);
}

try {
    $pdo = database();
    $areas = $pdo->query(
        'SELECT id, name, category, boundary FROM areas WHERE is_active = 1 ORDER BY priority DESC, id ASC'
    )->fetchAll();

    $matches = [];
    foreach ($areas as $area) {
        $vertices = json_decode($area['boundary'], true);
        if (is_array($vertices) && pointIsInsidePolygon($longitude, $latitude, $vertices)) {
            $matches[] = [
                'id' => (int) $area['id'],
                'name' => $area['name'],
                'category' => $area['category'],
            ];
        }
    }

    $stations = $pdo->query(
        'SELECT id, name, latitude, longitude, radius_m FROM stations WHERE is_active = 1 ORDER BY priority DESC, id ASC'
    )->fetchAll();

    $nearbyStations = [];
    foreach ($stations as $station) {
        $distance = distanceBetweenPointsMeters(
            $latitude,
            $longitude,
            (float) $station['latitude'],
            (float) $station['longitude'],
        );
        if ($distance <= (int) $station['radius_m']) {
            $nearbyStations[] = [
                'id' => (int) $station['id'],
                'name' => $station['name'] . '駅周辺',
                'category' => '駅近',
                'distanceMeters' => (int) round($distance),
            ];
        }
    }

    // Station proximity takes precedence over the larger city and coastal polygons.
    if ($nearbyStations !== []) {
        $matches = array_merge($nearbyStations, $matches);
    }

    if ($matches === []) {
        respond(200, [
            'status' => 'out_of_area',
            'message' => '登録エリア外',
            'location' => ['latitude' => $latitude, 'longitude' => $longitude],
            'areas' => [],
            'musicContext' => [],
        ]);
    }

    $primaryCategory = $matches[0]['category'];
    respond(200, [
        'status' => 'matched',
        'message' => $primaryCategory,
        'location' => ['latitude' => $latitude, 'longitude' => $longitude],
        'areas' => $matches,
        // Use only the highest-priority classification as the music selection context.
        'musicContext' => [$primaryCategory],
    ]);
} catch (Throwable $error) {
    error_log($error->getMessage());
    respond(500, ['error' => 'エリア判定に失敗しました。データベース設定を確認してください。']);
}
