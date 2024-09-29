import Express from 'express';
import cors from 'cors';
import placeRoutes from './routes/placeRoutes.js';

const app = Express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
    origin: [process.env.VUE_APP_RUTA_FRONT, 'http://localhost:8080'],
    credentials: true
}

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', ['https://proyectofinalsena.onrender.com', 'http://localhost:8080']);  // Origen permitido
    res.header('Access-Control-Allow-Credentials', 'true');  // Permitir credenciales
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');  // Métodos permitidos
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');  // Cabeceras permitidas
    next();
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(Express.json());

app.use('/api', placeRoutes);

app.get('/healthz', (req, res) => {
    res.json({ running: 'ok' })
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
