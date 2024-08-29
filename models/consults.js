import mysql from 'mysql2/promise';
import dbConfig from '../config/dbConfig.js';

export default class Consultas {
    async connect() {
        const connection = await mysql.createConnection(dbConfig);
        return connection;
    }

    async select(table, condition) {
        const connection = await this.connect();
        const [rows] = await connection.execute(`SELECT * FROM ${table} WHERE ${condition}`);
        await connection.end();
        return rows;
    }

    async selectFrom(table) {
        const connection = await this.connect();
        const [rows] = await connection.execute(`SELECT * FROM ${table}`);
        await connection.end();
        return rows;
    }

    async selectDetallesLugar(id) {
        const connection = await this.connect();
        const [rows] = await connection.execute(`SELECT 
            l.id, 
            l.nombre_lugar, 
            l.clima, 
            l.descripcion, 
            l.imagen,
            a.nombre_actividad, 
            a.descripcion AS descripcion_actividad, 
            a.imagen AS imagen_actividad
        FROM 
            tbl_lugares l
        LEFT JOIN 
            tbl_actividades_lugar a ON l.id = a.id_lugar
        WHERE 
            l.id = ${id}`);
        await connection.end();
        return rows;
    }

    async closeConect() {
        // Implementación no necesaria aquí, ya que la conexión se cierra automáticamente después de cada consulta
    }
}
