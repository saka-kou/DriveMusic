<?php
declare(strict_types=1);

/** @param list<array{0: float|int, 1: float|int}> $vertices */
function pointIsInsidePolygon(float $longitude, float $latitude, array $vertices): bool
{
    $vertexCount = count($vertices);
    if ($vertexCount < 3) {
        return false;
    }

    $inside = false;
    for ($i = 0, $j = $vertexCount - 1; $i < $vertexCount; $j = $i++) {
        [$xi, $yi] = $vertices[$i];
        [$xj, $yj] = $vertices[$j];

        // Boundary points count as inside. Keep the tiny tolerance for floating-point GPS values.
        $cross = ($longitude - $xi) * ($yj - $yi) - ($latitude - $yi) * ($xj - $xi);
        if (abs($cross) < 1.0e-10
            && $longitude >= min($xi, $xj) - 1.0e-10
            && $longitude <= max($xi, $xj) + 1.0e-10
            && $latitude >= min($yi, $yj) - 1.0e-10
            && $latitude <= max($yi, $yj) + 1.0e-10) {
            return true;
        }

        $crossesLatitude = (($yi > $latitude) !== ($yj > $latitude));
        if ($crossesLatitude) {
            $intersectionLongitude = ($xj - $xi) * ($latitude - $yi) / ($yj - $yi) + $xi;
            if ($longitude < $intersectionLongitude) {
                $inside = !$inside;
            }
        }
    }

    return $inside;
}

function distanceBetweenPointsMeters(
    float $latitudeA,
    float $longitudeA,
    float $latitudeB,
    float $longitudeB,
): float {
    $earthRadiusMeters = 6_371_000.0;
    $latitudeDelta = deg2rad($latitudeB - $latitudeA);
    $longitudeDelta = deg2rad($longitudeB - $longitudeA);
    $a = sin($latitudeDelta / 2) ** 2
        + cos(deg2rad($latitudeA)) * cos(deg2rad($latitudeB))
        * sin($longitudeDelta / 2) ** 2;

    return 2 * $earthRadiusMeters * asin(min(1, sqrt($a)));
}
