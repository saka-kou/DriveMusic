-- Select the existing application database in phpMyAdmin before importing this file.
-- This replaces only the previous Shonan demo area and the two Osaka/Kobe seed areas.
CREATE TABLE IF NOT EXISTS stations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  radius_m SMALLINT UNSIGNED NOT NULL DEFAULT 400,
  priority INT NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  INDEX idx_stations_active_priority (is_active, priority)
);

DELETE FROM areas
WHERE name IN ('湘南テストエリア', '大阪・神戸市街地', '大阪湾沿岸（舞洲〜神戸）');

INSERT INTO areas (name, category, boundary, priority, is_active) VALUES
('大阪・神戸市街地', '市街地',
 JSON_ARRAY(
   JSON_ARRAY(135.14, 34.60),
   JSON_ARRAY(135.20, 34.57),
   JSON_ARRAY(135.40, 34.57),
   JSON_ARRAY(135.53, 34.63),
   JSON_ARRAY(135.54, 34.76),
   JSON_ARRAY(135.39, 34.78),
   JSON_ARRAY(135.20, 34.76),
   JSON_ARRAY(135.14, 34.70),
   JSON_ARRAY(135.14, 34.60)
 ),
 10, TRUE),
('大阪湾沿岸（舞洲〜神戸）', '海沿い',
 JSON_ARRAY(
   JSON_ARRAY(135.14, 34.66),
   JSON_ARRAY(135.15, 34.63),
   JSON_ARRAY(135.21, 34.62),
   JSON_ARRAY(135.29, 34.63),
   JSON_ARRAY(135.36, 34.64),
   JSON_ARRAY(135.42, 34.64),
   JSON_ARRAY(135.45, 34.67),
   JSON_ARRAY(135.43, 34.70),
   JSON_ARRAY(135.38, 34.70),
   JSON_ARRAY(135.33, 34.70),
   JSON_ARRAY(135.27, 34.70),
   JSON_ARRAY(135.21, 34.70),
   JSON_ARRAY(135.16, 34.70),
   JSON_ARRAY(135.14, 34.66)
 ),
 20, TRUE);

INSERT INTO stations (name, latitude, longitude, radius_m, priority, is_active) VALUES
  ('大阪', 34.7025, 135.4960, 400, 30, TRUE),
  ('大阪梅田（阪急）', 34.7052, 135.4980, 400, 30, TRUE),
  ('大阪梅田（阪神）', 34.7010, 135.4970, 400, 30, TRUE),
  ('東梅田', 34.7028, 135.4995, 400, 30, TRUE),
  ('西梅田', 34.6987, 135.4952, 400, 30, TRUE),
  ('北新地', 34.6989, 135.4965, 400, 30, TRUE),
  ('福島', 34.6963, 135.4860, 400, 30, TRUE),
  ('野田', 34.6878, 135.4745, 400, 30, TRUE),
  ('塚本', 34.7128, 135.4690, 400, 30, TRUE),
  ('桜島', 34.6670, 135.4350, 400, 30, TRUE),
  ('尼崎', 34.7310, 135.4320, 400, 30, TRUE),
  ('立花', 34.7370, 135.4000, 400, 30, TRUE),
  ('西宮', 34.7380, 135.3480, 400, 30, TRUE),
  ('芦屋', 34.7270, 135.3070, 400, 30, TRUE),
  ('住吉', 34.7190, 135.2620, 400, 30, TRUE),
  ('六甲道', 34.7120, 135.2390, 400, 30, TRUE),
  ('灘', 34.7060, 135.2230, 400, 30, TRUE),
  ('三ノ宮', 34.6940, 135.1950, 400, 30, TRUE),
  ('元町', 34.6890, 135.1870, 400, 30, TRUE),
  ('神戸', 34.6790, 135.1780, 400, 30, TRUE)
ON DUPLICATE KEY UPDATE
  latitude = VALUES(latitude), longitude = VALUES(longitude),
  radius_m = VALUES(radius_m), priority = VALUES(priority), is_active = VALUES(is_active);
