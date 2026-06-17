CREATE TABLE usuarios (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre                   VARCHAR(100) NOT NULL,
  edad                     TINYINT UNSIGNED NOT NULL,
  genero                   ENUM('M','F','NB','NE') NOT NULL,
  carrera                  VARCHAR(100) NOT NULL,
  grado                    TINYINT UNSIGNED NOT NULL,
  horas_celular            DECIMAL(4,1) NOT NULL,
  apps_distractoras        JSON NULL,
  tiempo_pantalla_real_min INT NULL,
  app_mas_usada_real       VARCHAR(100) NULL,
  origen                   ENUM('web','app') NOT NULL DEFAULT 'web',
  dispositivo              ENUM('movil','escritorio','tablet') NULL,
  sistema_operativo        VARCHAR(60) NULL,
  navegador                VARCHAR(60) NULL,
  tipo_red                 VARCHAR(10) NULL,
  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stroop (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id            INT UNSIGNED NOT NULL,
  rt_congruente_ms      DECIMAL(8,2) NOT NULL,
  rt_incongruente_ms    DECIMAL(8,2) NOT NULL,
  efecto_stroop_ms      DECIMAL(8,2) NOT NULL,
  aciertos_congruente   TINYINT UNSIGNED NOT NULL,
  aciertos_incongruente TINYINT UNSIGNED NOT NULL,
  errores_congruente    TINYINT UNSIGNED NOT NULL,
  errores_incongruente  TINYINT UNSIGNED NOT NULL,
  total_items           TINYINT UNSIGNED NOT NULL,
  tasa_error_pct        DECIMAL(5,2) NOT NULL,
  duracion_total_ms     INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_stroop_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sart (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id        INT UNSIGNED NOT NULL,
  errores_omision   TINYINT UNSIGNED NOT NULL,
  errores_comision  TINYINT UNSIGNED NOT NULL,
  aciertos          TINYINT UNSIGNED NOT NULL,
  total_go          TINYINT UNSIGNED NOT NULL,
  total_nogo        TINYINT UNSIGNED NOT NULL,
  tasa_omision_pct  DECIMAL(5,2) NOT NULL,
  tasa_comision_pct DECIMAL(5,2) NOT NULL,
  rt_promedio_ms    DECIMAL(8,2) NOT NULL,
  rt_desviacion_ms  DECIMAL(8,2) NOT NULL,
  duracion_total_ms INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_sart_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nback (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id        INT UNSIGNED NOT NULL,
  nivel_n           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  pct_aciertos      DECIMAL(5,2) NOT NULL,
  aciertos          TINYINT UNSIGNED NOT NULL,
  errores_omision   TINYINT UNSIGNED NOT NULL,
  errores_comision  TINYINT UNSIGNED NOT NULL,
  total_targets     TINYINT UNSIGNED NOT NULL,
  total_lures       TINYINT UNSIGNED NOT NULL,
  rt_promedio_ms    DECIMAL(8,2) NOT NULL,
  rt_desviacion_ms  DECIMAL(8,2) NOT NULL,
  duracion_total_ms INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nback_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comportamiento_sesion (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id        INT UNSIGNED NOT NULL,
  cambios_pestana   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  segundos_fuera    INT UNSIGNED NOT NULL DEFAULT 0,
  en_que_test_salio JSON NULL,
  orientacion       ENUM('vertical','horizontal') NULL,
  tipo_input        ENUM('touch','mouse','teclado') NULL,
  nivel_bateria_pct TINYINT UNSIGNED NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_comportamiento_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stroop_detalle (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id        INT UNSIGNED NOT NULL,
  orden             TINYINT UNSIGNED NOT NULL,
  tipo              ENUM('congruente','incongruente') NOT NULL,
  palabra           VARCHAR(10) NOT NULL,
  color_tinta       VARCHAR(10) NOT NULL,
  respuesta_usuario VARCHAR(10) NULL,
  correcto          TINYINT(1) NOT NULL,
  rt_ms             DECIMAL(8,2) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_detalle_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_usuarios_carrera     ON usuarios (carrera);
CREATE INDEX idx_usuarios_grado       ON usuarios (grado);
CREATE INDEX idx_usuarios_origen      ON usuarios (origen);
CREATE INDEX idx_usuarios_created_at  ON usuarios (created_at);
CREATE INDEX idx_stroop_detalle_orden ON stroop_detalle (usuario_id, orden);