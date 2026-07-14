// ─────────────────────────────────────────────
//  models/index.js
//  Conexión y modelos Sequelize para SEMK.
//  Tablas: usuarios, stroop, sart, nback
// ─────────────────────────────────────────────


const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
 
const sequelize = new Sequelize(
  process.env.DB_NAME || 'estudio2',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || process.env.DB_PASSWORD || '',
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    define:  { timestamps: false },
    pool:    { max: 5, min: 0, acquire: 30000, idle: 10000 },
  }
);
 
// ── PASO 1: catálogos ─────────────────────────
const Genero = sequelize.define('Genero', {
  id:    { type: DataTypes.TINYINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  descr: { type: DataTypes.STRING(30), allowNull: false },
}, { tableName: 'generos', timestamps: false });
 
const Carrera = sequelize.define('Carrera', {
  id:    { type: DataTypes.SMALLINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  descr: { type: DataTypes.STRING(120), allowNull: false },
}, { tableName: 'carreras', timestamps: false });




const Prueba = sequelize.define('Prueba', {
  id:        { type: DataTypes.TINYINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  nombre:    { type: DataTypes.STRING(60), allowNull: false },
  tipo:      { type: DataTypes.ENUM('academico', 'cognitivo'), allowNull: false, defaultValue: 'cognitivo' },
  es_activo: { type: DataTypes.TINYINT(1), allowNull: false, defaultValue: 1 },
}, { tableName: 'pruebas', timestamps: false });
 
const PreguntaReactivo = sequelize.define('PreguntaReactivo', {
  id:        { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  id_prueba: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  pregunta:  { type: DataTypes.STRING(255), allowNull: false },
  es_activo: { type: DataTypes.TINYINT(1), allowNull: false, defaultValue: 1 },
}, { tableName: 'preguntas_reactivos', timestamps: false });
 
// ── PASO 2: usuarios ──────────────────────────
const Usuario = sequelize.define('Usuario', {
  id:         { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  p_apellido: { type: DataTypes.STRING(100), allowNull: false },
  s_apellido: { type: DataTypes.STRING(100), allowNull: true },
  nombre:     { type: DataTypes.STRING(100), allowNull: false },
  fecha_nac:  { type: DataTypes.DATEONLY, allowNull: false },
  id_genero:  { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'usuarios', timestamps: false });
 
// ── PASO 3: tablas que dependen de usuarios ───
const DatosAcademicos = sequelize.define('DatosAcademicos', {
  id:         { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  id_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  id_carrera: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
  grado:      { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  es_activo:  { type: DataTypes.TINYINT(1), allowNull: false, defaultValue: 1 },
}, { tableName: 'datos_academicos', timestamps: false });
 
const DatosDispositivo = sequelize.define('DatosDispositivo', {
  id:                       { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  id_usuario:               { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  horas_celular:            { type: DataTypes.DECIMAL(4, 1), allowNull: false },
  apps_distractoras:        { type: DataTypes.JSON, allowNull: true },
  tiempo_pantalla_real_min: { type: DataTypes.INTEGER, allowNull: true },
  app_mas_usada_real:       { type: DataTypes.STRING(100), allowNull: true },
  origen:                   { type: DataTypes.ENUM('web', 'app'), allowNull: false, defaultValue: 'web' },
  dispositivo:              { type: DataTypes.ENUM('movil', 'escritorio', 'tablet'), allowNull: true },
  sistema_operativo:        { type: DataTypes.STRING(60), allowNull: true },
  navegador:                { type: DataTypes.STRING(60), allowNull: true },
  tipo_red:                 { type: DataTypes.STRING(10), allowNull: true },
  created_at:               { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'datos_dispositivo', timestamps: false });
 
const Sesion = sequelize.define('Sesion', {
  id:         { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  id_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  completada: { type: DataTypes.TINYINT(1), allowNull: false, defaultValue: 0 },
  ip_origen:  { type: DataTypes.STRING(45), allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'sesiones', timestamps: false });
 
// ── PASO 4: tablas que dependen de sesiones ───
const ComportamientoSesion = sequelize.define('ComportamientoSesion', {
  id:                { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  id_sesion:         { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  cambios_pestana:   { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  segundos_fuera:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  en_que_test_salio: { type: DataTypes.JSON, allowNull: true },
  orientacion:       { type: DataTypes.ENUM('vertical', 'horizontal'), allowNull: true },
  tipo_input:        { type: DataTypes.ENUM('touch', 'mouse', 'teclado'), allowNull: true },
  nivel_bateria_pct: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
}, { tableName: 'comportamiento_sesion', timestamps: false });
 
const ResultadoStroop = sequelize.define('ResultadoStroop', {
  id:                    { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  id_sesion:             { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  rt_congruente_ms:      { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  rt_incongruente_ms:    { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  efecto_stroop_ms:      { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  aciertos_congruente:   { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  aciertos_incongruente: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  errores_congruente:    { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  errores_incongruente:  { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  total_items:           { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  tasa_error_pct:        { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  duracion_total_ms:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
}, { tableName: 'resultados_stroop', timestamps: false });
 
const StroopDetalle = sequelize.define('StroopDetalle', {
  id:                { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  id_sesion:         { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  orden:             { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  tipo:              { type: DataTypes.ENUM('congruente', 'incongruente'), allowNull: false },
  palabra:           { type: DataTypes.STRING(10), allowNull: false },
  color_tinta:       { type: DataTypes.STRING(10), allowNull: false },
  respuesta_usuario: { type: DataTypes.STRING(10), allowNull: true },
  correcto:          { type: DataTypes.TINYINT(1), allowNull: false },
  rt_ms:             { type: DataTypes.DECIMAL(8, 2), allowNull: true },
}, { tableName: 'stroop_detalle', timestamps: false });
 
const ResultadoSart = sequelize.define('ResultadoSart', {
  id:                { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  id_sesion:         { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  errores_omision:   { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  errores_comision:  { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  aciertos:          { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  total_go:          { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  total_nogo:        { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  tasa_omision_pct:  { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  tasa_comision_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  rt_promedio_ms:    { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  rt_desviacion_ms:  { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  duracion_total_ms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
}, { tableName: 'resultados_sart', timestamps: false });
 
const ResultadoNback = sequelize.define('ResultadoNback', {
  id:                { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  id_sesion:         { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  nivel_n:           { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 2 },
  pct_aciertos:      { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  aciertos:          { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  errores_omision:   { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  errores_comision:  { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  total_targets:     { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  total_lures:       { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  rt_promedio_ms:    { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  rt_desviacion_ms:  { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  duracion_total_ms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
}, { tableName: 'resultados_nback', timestamps: false });
 
// ── Asociaciones (reflejan las FKs del .sql) ──
Genero.hasMany(Usuario, { foreignKey: 'id_genero' });
Usuario.belongsTo(Genero, { foreignKey: 'id_genero' });
 
Usuario.hasMany(DatosAcademicos, { foreignKey: 'id_usuario', onDelete: 'CASCADE' });
DatosAcademicos.belongsTo(Usuario, { foreignKey: 'id_usuario' });
Carrera.hasMany(DatosAcademicos, { foreignKey: 'id_carrera' });
DatosAcademicos.belongsTo(Carrera, { foreignKey: 'id_carrera' });
 
Usuario.hasMany(DatosDispositivo, { foreignKey: 'id_usuario', onDelete: 'CASCADE' });
DatosDispositivo.belongsTo(Usuario, { foreignKey: 'id_usuario' });
 
Usuario.hasMany(Sesion, { foreignKey: 'id_usuario', onDelete: 'CASCADE' });
Sesion.belongsTo(Usuario, { foreignKey: 'id_usuario' });
 
Sesion.hasOne(ComportamientoSesion, { foreignKey: 'id_sesion', onDelete: 'CASCADE' });
ComportamientoSesion.belongsTo(Sesion, { foreignKey: 'id_sesion' });
 
Sesion.hasOne(ResultadoStroop, { foreignKey: 'id_sesion', onDelete: 'CASCADE' });
ResultadoStroop.belongsTo(Sesion, { foreignKey: 'id_sesion' });
 
Sesion.hasMany(StroopDetalle, { foreignKey: 'id_sesion', onDelete: 'CASCADE' });
StroopDetalle.belongsTo(Sesion, { foreignKey: 'id_sesion' });
 
Sesion.hasOne(ResultadoSart, { foreignKey: 'id_sesion', onDelete: 'CASCADE' });
ResultadoSart.belongsTo(Sesion, { foreignKey: 'id_sesion' });
 
Sesion.hasOne(ResultadoNback, { foreignKey: 'id_sesion', onDelete: 'CASCADE' });
ResultadoNback.belongsTo(Sesion, { foreignKey: 'id_sesion' });
 
Prueba.hasMany(PreguntaReactivo, { foreignKey: 'id_prueba' });
PreguntaReactivo.belongsTo(Prueba, { foreignKey: 'id_prueba' });
 
module.exports = {
  sequelize,
  Genero, Carrera, Prueba, PreguntaReactivo,
  Usuario, DatosAcademicos, DatosDispositivo,
  Sesion, ComportamientoSesion,
  ResultadoStroop, StroopDetalle,
  ResultadoSart, ResultadoNback,
};