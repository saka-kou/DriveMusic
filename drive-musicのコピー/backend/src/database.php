<?php
declare(strict_types=1);

function database(): PDO
{
    $settings = [];
    $envFile = dirname(__DIR__) . '/.env';
    if (is_file($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            throw new RuntimeException('backend/.env を読み込めません。');
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $separator = strpos($line, '=');
            if ($separator === false) {
                continue;
            }

            $key = trim(substr($line, 0, $separator));
            $value = trim(substr($line, $separator + 1));
            if (strlen($value) >= 2
                && (($value[0] === '"' && $value[-1] === '"')
                    || ($value[0] === "'" && $value[-1] === "'"))) {
                $value = substr($value, 1, -1);
            }
            $settings[$key] = $value;
        }
    }

    $config = static function (string $key, string $default) use ($settings): string {
        $environmentValue = getenv($key);
        if ($environmentValue !== false) {
            return $environmentValue;
        }
        return $settings[$key] ?? $default;
    };

    $host = $config('DB_HOST', '127.0.0.1');
    $port = $config('DB_PORT', '3306');
    $name = $config('DB_NAME', 'kyamagata');
    $user = $config('DB_USER', 'root');
    $password = $config('DB_PASSWORD', '');

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

    return new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}
