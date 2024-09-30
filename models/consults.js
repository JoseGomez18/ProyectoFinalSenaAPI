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

    async selectPrueba(table, condition) {
        const connection = await this.connect();
        const [rows] = await connection.execute(`SELECT id,nombre_lugar,descripcion FROM ${table} WHERE ${condition}`);
        await connection.end();
        return rows;
    }

    async selectLogin(table, user) {
        const connection = await this.connect();
        const [rows, fields] = await connection.execute(`SELECT id,nombre,correo,contra FROM ${table} WHERE correo = '${user}'`)
        await connection.end();
        return rows;
    }

    async selectFrom(table) {
        const connection = await this.connect();
        const [rows] = await connection.execute(`SELECT * FROM ${table}`);
        await connection.end();
        return rows;
    }

    async selectHotelesLugar(id) {
        const connection = await this.connect();
        const [rows] = await connection.execute(`SELECT * FROM tbl_hoteles_lugar WHERE lugar_id = ${id}`);
        await connection.end();
        return rows;
    }


    async selectCard(limit) {
        const connection = await this.connect();
        const [rows] = await connection.execute(`SELECT * FROM tbl_lugares LIMIT ${limit};`);
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

    async insert(table, values) {
        const connection = await this.connect()
        const [rows, fields] = await connection.execute(`INSERT INTO ${table} VALUES ${values}`);
        return rows
    }

    async validationFav(idUser, idLugar) {
        const connection = await this.connect();
        const [rows] = await connection.execute(`SELECT COUNT(*) FROM tbl_favoritos_lugar WHERE usuario_id = ${idUser} AND lugar_id = ${idLugar}`);
        await connection.end();
        return rows;
    }

    async selectFavoritosUser(idUser) {
        const connection = await this.connect();
        const [rows] = await connection.execute(`  SELECT 
            f.id AS favorito_id,
            l.id AS lugar_id,
            l.nombre_lugar,
            l.clima,
            l.descripcion,
            l.imagen
        FROM 
            tbl_favoritos_lugar f
        INNER JOIN 
            tbl_lugares l ON f.lugar_id = l.id
        WHERE 
            f.usuario_id = ${idUser};`);
        await connection.end();
        return rows;
    }

    async deleteFavoritos(idUser, idLugar) {
        const connection = await this.connect();
        const [rows] = await connection.execute(`DELETE FROM tbl_favoritos_lugar WHERE usuario_id = ${idUser} AND lugar_id = ${idLugar}`);
        await connection.end();
        return rows;
    }

    async closeConect() {
        // Implementación no necesaria aquí, ya que la conexión se cierra automáticamente después de cada consulta
    }
}
