-- ============================================================
--  PASO 1: CATÁLOGOS (sin dependencias)
-- ============================================================

CREATE TABLE generos (
  id    SMALLSERIAL   PRIMARY KEY,
  descr VARCHAR(30)   NOT NULL
);

INSERT INTO generos (descr) VALUES
  ('Femenino'),
  ('Masculino'),
  ('Otro'),
  ('Prefiero no decir');


CREATE TABLE carreras (
  id    SMALLSERIAL   PRIMARY KEY,
  descr VARCHAR(120)  NOT NULL
);

INSERT INTO carreras (descr) VALUES
  ('Ingeniería en Mecatrónica'),
  ('Ingeniería en Logística Internacional'),
  ('Ingeniería en Energías y Desarrollo Sostenible'),
  ('Ingeniería en Tecnologías de la Información'),
  ('Licenciatura en Negocios y Mercadotecnia'),
  ('Licenciatura en Educación'),
  ('Ingeniería Industrial'),
  ('Ingeniería en Mantenimiento Industrial'),
  ('Licenciatura en Diseño Digital y Producción Audiovisual'),
  ('Licenciatura en Comercio Internacional y Aduanas');


CREATE TABLE pruebas (
  id        SMALLSERIAL  PRIMARY KEY,
  nombre    VARCHAR(60)  NOT NULL,
  tipo      VARCHAR(20)  NOT NULL DEFAULT 'cognitivo'
              CHECK (tipo IN ('academico','cognitivo')),
  es_activo BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO pruebas (nombre, tipo) VALUES
  ('Stroop', 'cognitivo'),
  ('SART',   'cognitivo'),
  ('N-Back',  'cognitivo');


-- ============================================================
--  PASO 2: USUARIOS (depende de generos)
-- ============================================================

CREATE TABLE usuarios (
  id         SERIAL        PRIMARY KEY,
  p_apellido VARCHAR(100)  NOT NULL,
  s_apellido VARCHAR(100)  NULL,
  nombre     VARCHAR(100)  NOT NULL,
  fecha_nac  DATE          NOT NULL,
  id_genero  SMALLINT      NOT NULL,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usu_genero FOREIGN KEY (id_genero)
    REFERENCES generos(id) ON UPDATE CASCADE
);


-- ============================================================
--  PASO 3: TABLAS QUE DEPENDEN DE usuarios
-- ============================================================

CREATE TABLE datos_academicos (
  id         SERIAL     PRIMARY KEY,
  id_usuario INTEGER    NOT NULL,
  id_carrera SMALLINT   NOT NULL,
  grado      SMALLINT   NOT NULL,
  es_activo  BOOLEAN    NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_da_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_da_carrera FOREIGN KEY (id_carrera)
    REFERENCES carreras(id) ON UPDATE CASCADE
);


CREATE TABLE datos_dispositivo (
  id                       SERIAL        PRIMARY KEY,
  id_usuario               INTEGER       NOT NULL,
  horas_celular            DECIMAL(4,1)  NOT NULL,
  apps_distractoras        JSON          NULL,
  tiempo_pantalla_real_min INTEGER       NULL,
  app_mas_usada_real       VARCHAR(100)  NULL,
  origen                   VARCHAR(10)   NOT NULL DEFAULT 'web'
                              CHECK (origen IN ('web','app')),
  dispositivo              VARCHAR(15)   NULL
                              CHECK (dispositivo IN ('movil','escritorio','tablet')),
  sistema_operativo        VARCHAR(60)   NULL,
  navegador                VARCHAR(60)   NULL,
  tipo_red                 VARCHAR(10)   NULL,
  created_at               TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dd_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE sesiones (
  id         SERIAL       PRIMARY KEY,
  id_usuario INTEGER      NOT NULL,
  completada BOOLEAN      NOT NULL DEFAULT FALSE,
  ip_origen  VARCHAR(45)  NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ses_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
);


-- ============================================================
--  PASO 4: TABLAS QUE DEPENDEN DE sesiones
-- ============================================================

CREATE TABLE comportamiento_sesion (
  id                SERIAL      PRIMARY KEY,
  id_sesion         INTEGER     NOT NULL,
  cambios_pestana   SMALLINT    NOT NULL DEFAULT 0,
  segundos_fuera    INTEGER     NOT NULL DEFAULT 0,
  en_que_test_salio JSON        NULL,
  orientacion       VARCHAR(10) NULL
                       CHECK (orientacion IN ('vertical','horizontal')),
  tipo_input        VARCHAR(10) NULL
                       CHECK (tipo_input IN ('touch','mouse','teclado')),
  nivel_bateria_pct SMALLINT    NULL,
  CONSTRAINT fk_cs_sesion FOREIGN KEY (id_sesion)
    REFERENCES sesiones(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE resultados_stroop (
  id                    SERIAL        PRIMARY KEY,
  id_sesion             INTEGER       NOT NULL,
  rt_congruente_ms      DECIMAL(8,2)  NOT NULL,
  rt_incongruente_ms    DECIMAL(8,2)  NOT NULL,
  efecto_stroop_ms      DECIMAL(8,2)  NOT NULL,
  aciertos_congruente   SMALLINT      NOT NULL,
  aciertos_incongruente SMALLINT      NOT NULL,
  errores_congruente    SMALLINT      NOT NULL,
  errores_incongruente  SMALLINT      NOT NULL,
  total_items           SMALLINT      NOT NULL,
  tasa_error_pct        DECIMAL(5,2)  NOT NULL,
  duracion_total_ms     INTEGER       NOT NULL,
  CONSTRAINT fk_rst_sesion FOREIGN KEY (id_sesion)
    REFERENCES sesiones(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE stroop_detalle (
  id                SERIAL       PRIMARY KEY,
  id_sesion         INTEGER      NOT NULL,
  orden             SMALLINT     NOT NULL,
  tipo              VARCHAR(15)  NOT NULL
                       CHECK (tipo IN ('congruente','incongruente')),
  palabra           VARCHAR(10)  NOT NULL,
  color_tinta       VARCHAR(10)  NOT NULL,
  respuesta_usuario VARCHAR(10)  NULL,
  correcto          BOOLEAN      NOT NULL,
  rt_ms             DECIMAL(8,2) NULL,
  CONSTRAINT fk_sd_sesion FOREIGN KEY (id_sesion)
    REFERENCES sesiones(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE resultados_sart (
  id                SERIAL        PRIMARY KEY,
  id_sesion         INTEGER       NOT NULL,
  errores_omision   SMALLINT      NOT NULL,
  errores_comision  SMALLINT      NOT NULL,
  aciertos          SMALLINT      NOT NULL,
  total_go          SMALLINT      NOT NULL,
  total_nogo        SMALLINT      NOT NULL,
  tasa_omision_pct  DECIMAL(5,2)  NOT NULL,
  tasa_comision_pct DECIMAL(5,2)  NOT NULL,
  rt_promedio_ms    DECIMAL(8,2)  NOT NULL,
  rt_desviacion_ms  DECIMAL(8,2)  NOT NULL,
  duracion_total_ms INTEGER       NOT NULL,
  CONSTRAINT fk_rsa_sesion FOREIGN KEY (id_sesion)
    REFERENCES sesiones(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE resultados_nback (
  id                SERIAL        PRIMARY KEY,
  id_sesion         INTEGER       NOT NULL,
  nivel_n           SMALLINT      NOT NULL DEFAULT 2,
  pct_aciertos      DECIMAL(5,2)  NOT NULL,
  aciertos          SMALLINT      NOT NULL,
  errores_omision   SMALLINT      NOT NULL,
  errores_comision  SMALLINT      NOT NULL,
  total_targets     SMALLINT      NOT NULL,
  total_lures       SMALLINT      NOT NULL,
  rt_promedio_ms    DECIMAL(8,2)  NOT NULL,
  rt_desviacion_ms  DECIMAL(8,2)  NOT NULL,
  duracion_total_ms INTEGER       NOT NULL,
  CONSTRAINT fk_rnb_sesion FOREIGN KEY (id_sesion)
    REFERENCES sesiones(id) ON DELETE CASCADE ON UPDATE CASCADE
);


-- ============================================================
--  PASO 5: TABLA QUE DEPENDE DE pruebas
-- ============================================================

CREATE TABLE preguntas_reactivos (
  id        SERIAL        PRIMARY KEY,
  id_prueba SMALLINT      NOT NULL,
  pregunta  VARCHAR(255)  NOT NULL,
  es_activo BOOLEAN       NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_pr_prueba FOREIGN KEY (id_prueba)
    REFERENCES pruebas(id) ON UPDATE CASCADE
);


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