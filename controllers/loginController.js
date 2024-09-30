import consults from '../models/consults.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'

const consulta = new consults();
const secretKey = '123456789'


export const register = async (req, res) => {
    try {
        const { nombre, user, password } = req.body

        const result = await consulta.insert('tbl_usuarios', `(null, '${nombre}','${user}', '${password}')`);
        if (result.affectedRows) {
            res.json({ ok: "Registro exitoso" })
        } else {
            res.json({ ok: "fallo en el registro" })
        }
        consulta.closeConect();
    } catch (error) {
        console.log(error)
        res.json({ error: error })
    }
};

export const login = async (req, res) => {
    const { user, password } = req.body;

    console.log(user, password)
    const result = await consulta.selectLogin('tbl_usuarios', user)
    console.log(result)
    consulta.closeConect();

    const accesToken = jwt.sign({ user }, secretKey, { expiresIn: '1h' });
    res.cookie('token', accesToken, { httpOnly: true, secure: true }); // secure: true solo en HTTPS
    res.json({ validacion: "Login exitoso", usuario: result })

};
// const use = await result.find(u => u.user == user);
// console.log(use)
// const match = await bcrypt.compare(password, result[0].contra);
// console.log(match)
// if (match) {
// } else {
//     return res.status(401).send('Usuario o contraseña incorrectos');
// }
