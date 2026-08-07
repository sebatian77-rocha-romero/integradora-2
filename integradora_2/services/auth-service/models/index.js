// ─────────────────────────────────────────────
//  auth-service/models/index.js
//  Conexión propia a la BD + SOLO los modelos que
//  auth-service poose: Cuenta, email + password
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
 
const Cuenta = sequelize.define('Cuenta', {
  id:            { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  // id_usuario ya NO tiene FK real a nivel de BD (Usuario vive en la
  // base de datos logica de sesion-service). Se guarda como referencia
  // simple; la integridad se garantiza en la app, no con constraint SQL.
  id_usuario:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
  email:         { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  created_at:    { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'cuentas', timestamps: false });
 
module.exports = { sequelize, Cuenta };