import dotenv from 'dotenv';
dotenv.config();
const dbConfig = {
    host: process.env.DB_HOST,
    user: 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE
};

export default dbConfig;