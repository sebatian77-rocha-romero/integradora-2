const mysql = require("mysql2")

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "estudio2",
    port: process.env.DB_PORT || 3306
});

db.connect((err) => {
    if(err) {
        console.error('Error de conexion: ', err)
        return;
    }
    console.log("conexion exitosa a la base de datos")
});

module.exports = db;