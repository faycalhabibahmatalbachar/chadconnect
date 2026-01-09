USE chadconnect;

-- Minimal seed for Admin Web login
-- First run: password_hash is NULL; the Web Admin will guide you through setting the password.
INSERT INTO users (phone, email, username, password_hash, display_name, role, preferred_lang)
VALUES (
  NULL,
  NULL,
  'admin',
  NULL,
  'Admin ChadConnect',
  'admin',
  'fr'
)
ON DUPLICATE KEY UPDATE username=username;

-- A sample pending institution (created_by_user_id must exist)
INSERT INTO institutions (name, city, country, created_by_user_id, validation_status)
SELECT 'Lycée Exemple', 'N\'Djamena', 'Chad', u.id, 'pending'
FROM users u
WHERE u.username='admin'
LIMIT 1;

INSERT INTO subjects (id, name_fr, name_ar, track)
VALUES
  (1, 'Mathématiques', 'رياضيات', NULL),
  (2, 'Physique', 'فيزياء', NULL),
  (3, 'Français', 'فرنسية', NULL),
  (4, 'Histoire-Géo', 'تاريخ وجغرافيا', NULL)
ON DUPLICATE KEY UPDATE name_fr=VALUES(name_fr), name_ar=VALUES(name_ar), track=VALUES(track);

INSERT INTO chapters (id, subject_id, title_fr, title_ar, sort_order)
VALUES
  (101, 1, 'Algèbre', 'جبر', 1),
  (102, 1, 'Géométrie', 'هندسة', 2),
  (103, 1, 'Fonctions', 'دوال', 3),
  (104, 1, 'Probabilités', 'احتمالات', 4),
  (201, 2, 'Mécanique', 'ميكانيك', 1),
  (202, 2, 'Électricité', 'كهرباء', 2),
  (203, 2, 'Ondes', 'موجات', 3),
  (301, 3, 'Grammaire', 'قواعد', 1),
  (302, 3, 'Conjugaison', 'تصريف', 2),
  (303, 3, 'Expression écrite', 'تعبير كتابي', 3),
  (401, 4, 'Histoire moderne', 'تاريخ حديث', 1),
  (402, 4, 'Histoire contemporaine', 'تاريخ معاصر', 2),
  (403, 4, 'Géographie', 'جغرافيا', 3)
ON DUPLICATE KEY UPDATE subject_id=VALUES(subject_id), title_fr=VALUES(title_fr), title_ar=VALUES(title_ar), sort_order=VALUES(sort_order);
