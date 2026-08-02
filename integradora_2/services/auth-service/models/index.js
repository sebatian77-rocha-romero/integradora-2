// ─────────────────────────────────────────────
//  auth-service/models/index.js
//  Conexión propia a la BD + SOLO los modelos que
//  auth-service necesita para hacer su trabajo:
//  Usuario, Cuenta, Genero, y Sesion (para saber si
//  el usuario logueado ya tiene una sesión de test).
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

const Genero = sequelize.define('Genero', {
  id:    { type: DataTypes.TINYINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  descr: { type: DataTypes.STRING(30), allowNull: false },
}, { tableName: 'generos', timestamps: false });

const Usuario = sequelize.define('Usuario', {
  id:         { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  p_apellido: { type: DataTypes.STRING(100), allowNull: false },
  s_apellido: { type: DataTypes.STRING(100), allowNull: true },
  nombre:     { type: DataTypes.STRING(100), allowNull: false },
  fecha_nac:  { type: DataTypes.DATEONLY, allowNull: false },
  id_genero:  { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'usuarios', timestamps: false });

const Sesion = sequelize.define('Sesion', {
  id:         { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  id_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  completada: { type: DataTypes.TINYINT(1), allowNull: false, defaultValue: 0 },
  ip_origen:  { type: DataTypes.STRING(45), allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'sesiones', timestamps: false });

const Cuenta = sequelize.define('Cuenta', {
  id:            { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  id_usuario:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
  email:         { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  created_at:    { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'cuentas', timestamps: false });

// ── Asociaciones que usa este servicio ────────
Genero.hasMany(Usuario, { foreignKey: 'id_genero' });
Usuario.belongsTo(Genero, { foreignKey: 'id_genero' });

Usuario.hasMany(Sesion, { foreignKey: 'id_usuario', onDelete: 'CASCADE' });
Sesion.belongsTo(Usuario, { foreignKey: 'id_usuario' });

Usuario.hasOne(Cuenta, { foreignKey: 'id_usuario', onDelete: 'CASCADE' });
Cuenta.belongsTo(Usuario, { foreignKey: 'id_usuario' });

module.exports = { sequelize, Genero, Usuario, Sesion, Cuenta };
