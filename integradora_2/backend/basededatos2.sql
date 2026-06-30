-- ============================================================
--  PASO 1: CATÁLOGOS (sin dependencias)
-- ============================================================

CREATE TABLE generos (
  id    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  descr VARCHAR(30)      NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO generos (descr) VALUES
  ('Femenino'),
  ('Masculino'),
  ('Otro'),
  ('Prefiero no decir');


CREATE TABLE carreras (
  id    SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  descr VARCHAR(120)      NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO carreras (descr) VALUES
  ('Ingeniería en Mecatrónica'),
  ('Ingeniería en Logística Internacional'),
  ('Ingeniería en Energías y Desarrollo Sostenible'),
  ('Ingeniería en Tecnologías de la Información'),
  ('Licenciatura en Negocios y Mercadotecnia'),
  ('Licenciatura en Educación'),
  ('Ingeniería Industrial'),
  ('Licenciatura en Diseño Digital y Producción Audiovisual'),
  ('Licenciatura en Comercio Internacional y Aduanas');


CREATE TABLE pruebas (
  id        TINYINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(60)      NOT NULL,
  tipo      ENUM('academico','cognitivo') NOT NULL DEFAULT 'cognitivo',
  es_activo TINYINT(1)       NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO pruebas (nombre, tipo) VALUES
  ('Stroop', 'cognitivo'),
  ('SART',   'cognitivo'),
  ('N-Back',  'cognitivo');


-- ============================================================
--  PASO 2: USUARIOS (depende de generos)
-- ============================================================

CREATE TABLE usuarios (
  id         INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  p_apellido VARCHAR(100)     NOT NULL,
  s_apellido VARCHAR(100)     NULL,
  nombre     VARCHAR(100)     NOT NULL,
  fecha_nac  DATE             NOT NULL,
  id_genero  TINYINT UNSIGNED NOT NULL,
  created_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usu_genero FOREIGN KEY (id_genero)
    REFERENCES generos(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  PASO 3: TABLAS QUE DEPENDEN DE usuarios
-- ============================================================

CREATE TABLE datos_academicos (
  id         INT UNSIGNED      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED      NOT NULL,
  id_carrera SMALLINT UNSIGNED NOT NULL,
  grado      TINYINT UNSIGNED  NOT NULL,
  es_activo  TINYINT(1)        NOT NULL DEFAULT 1,
  CONSTRAINT fk_da_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_da_carrera FOREIGN KEY (id_carrera)
    REFERENCES carreras(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE datos_dispositivo (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_usuario               INT UNSIGNED NOT NULL,
  horas_celular            DECIMAL(4,1) NOT NULL,
  apps_distractoras        JSON         NULL,
  tiempo_pantalla_real_min INT          NULL,
  app_mas_usada_real       VARCHAR(100) NULL,
  origen                   ENUM('web','app') NOT NULL DEFAULT 'web',
  dispositivo              ENUM('movil','escritorio','tablet') NULL,
  sistema_operativo        VARCHAR(60)  NULL,
  navegador                VARCHAR(60)  NULL,
  tipo_red                 VARCHAR(10)  NULL,
  created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dd_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE sesiones (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NOT NULL,
  completada TINYINT(1)   NOT NULL DEFAULT 0,
  ip_origen  VARCHAR(45)  NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ses_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  PASO 4: TABLAS QUE DEPENDEN DE sesiones
-- ============================================================

CREATE TABLE comportamiento_sesion (
  id                INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_sesion         INT UNSIGNED     NOT NULL,
  cambios_pestana   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  segundos_fuera    INT UNSIGNED     NOT NULL DEFAULT 0,
  en_que_test_salio JSON             NULL,
  orientacion       ENUM('vertical','horizontal')   NULL,
  tipo_input        ENUM('touch','mouse','teclado') NULL,
  nivel_bateria_pct TINYINT UNSIGNED NULL,
  CONSTRAINT fk_cs_sesion FOREIGN KEY (id_sesion)
    REFERENCES sesiones(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE resultados_stroop (
  id                    INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_sesion             INT UNSIGNED     NOT NULL,
  rt_congruente_ms      DECIMAL(8,2)     NOT NULL,
  rt_incongruente_ms    DECIMAL(8,2)     NOT NULL,
  efecto_stroop_ms      DECIMAL(8,2)     NOT NULL,
  aciertos_congruente   TINYINT UNSIGNED NOT NULL,
  aciertos_incongruente TINYINT UNSIGNED NOT NULL,
  errores_congruente    TINYINT UNSIGNED NOT NULL,
  errores_incongruente  TINYINT UNSIGNED NOT NULL,
  total_items           TINYINT UNSIGNED NOT NULL,
  tasa_error_pct        DECIMAL(5,2)     NOT NULL,
  duracion_total_ms     INT UNSIGNED     NOT NULL,
  CONSTRAINT fk_rst_sesion FOREIGN KEY (id_sesion)
    REFERENCES sesiones(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE stroop_detalle (
  id                INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_sesion         INT UNSIGNED     NOT NULL,
  orden             TINYINT UNSIGNED NOT NULL,
  tipo              ENUM('congruente','incongruente') NOT NULL,
  palabra           VARCHAR(10)      NOT NULL,
  color_tinta       VARCHAR(10)      NOT NULL,
  respuesta_usuario VARCHAR(10)      NULL,
  correcto          TINYINT(1)       NOT NULL,
  rt_ms             DECIMAL(8,2)     NULL,
  CONSTRAINT fk_sd_sesion FOREIGN KEY (id_sesion)
    REFERENCES sesiones(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE resultados_sart (
  id                INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_sesion         INT UNSIGNED     NOT NULL,
  errores_omision   TINYINT UNSIGNED NOT NULL,
  errores_comision  TINYINT UNSIGNED NOT NULL,
  aciertos          TINYINT UNSIGNED NOT NULL,
  total_go          TINYINT UNSIGNED NOT NULL,
  total_nogo        TINYINT UNSIGNED NOT NULL,
  tasa_omision_pct  DECIMAL(5,2)     NOT NULL,
  tasa_comision_pct DECIMAL(5,2)     NOT NULL,
  rt_promedio_ms    DECIMAL(8,2)     NOT NULL,
  rt_desviacion_ms  DECIMAL(8,2)     NOT NULL,
  duracion_total_ms INT UNSIGNED     NOT NULL,
  CONSTRAINT fk_rsa_sesion FOREIGN KEY (id_sesion)
    REFERENCES sesiones(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE resultados_nback (
  id                INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_sesion         INT UNSIGNED     NOT NULL,
  nivel_n           TINYINT UNSIGNED NOT NULL DEFAULT 2,
  pct_aciertos      DECIMAL(5,2)     NOT NULL,
  aciertos          TINYINT UNSIGNED NOT NULL,
  errores_omision   TINYINT UNSIGNED NOT NULL,
  errores_comision  TINYINT UNSIGNED NOT NULL,
  total_targets     TINYINT UNSIGNED NOT NULL,
  total_lures       TINYINT UNSIGNED NOT NULL,
  rt_promedio_ms    DECIMAL(8,2)     NOT NULL,
  rt_desviacion_ms  DECIMAL(8,2)     NOT NULL,
  duracion_total_ms INT UNSIGNED     NOT NULL,
  CONSTRAINT fk_rnb_sesion FOREIGN KEY (id_sesion)
    REFERENCES sesiones(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  PASO 5: TABLA QUE DEPENDE DE pruebas
-- ============================================================

CREATE TABLE preguntas_reactivos (
  id        INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_prueba TINYINT UNSIGNED NOT NULL,
  pregunta  VARCHAR(255)     NOT NULL,
  es_activo TINYINT(1)       NOT NULL DEFAULT 1,
  CONSTRAINT fk_pr_prueba FOREIGN KEY (id_prueba)
    REFERENCES pruebas(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  PASO 6: ÍNDICES
-- ============================================================

CREATE INDEX idx_usu_genero    ON usuarios              (id_genero);
CREATE INDEX idx_da_usuario    ON datos_academicos      (id_usuario);
CREATE INDEX idx_da_carrera    ON datos_academicos      (id_carrera);
CREATE INDEX idx_dd_usuario    ON datos_dispositivo     (id_usuario);
CREATE INDEX idx_ses_usuario   ON sesiones              (id_usuario);
CREATE INDEX idx_ses_created   ON sesiones              (created_at);
CREATE INDEX idx_cs_sesion     ON comportamiento_sesion (id_sesion);
CREATE INDEX idx_rst_sesion    ON resultados_stroop     (id_sesion);
CREATE INDEX idx_sd_sesion_ord ON stroop_detalle        (id_sesion, orden);
CREATE INDEX idx_rsa_sesion    ON resultados_sart       (id_sesion);
CREATE INDEX idx_rnb_sesion    ON resultados_nback      (id_sesion);
CREATE INDEX idx_pr_prueba     ON preguntas_reactivos   (id_prueba);