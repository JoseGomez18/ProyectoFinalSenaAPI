import bcrypt from 'bcrypt';

//numero rondas para el hast
const saltRounds = 10

const hashMiddleware = async (req, res, next) => {
    try {
        if (req.body.password) {
            req.body.password = await bcrypt.hash(req.body.password, saltRounds)

        }
        next();
    } catch (error) {
        console.error('Error en el middleware de hashing:', error);
        res.status(500).send('Error al procesar la solicitud');
    }
}

export default hashMiddleware;