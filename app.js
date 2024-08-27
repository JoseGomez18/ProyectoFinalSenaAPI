import Express from 'express';
import cors from 'cors';
import placeRoutes from './routes/placeRoutes.js';

const app = Express();
const PORT = 3001;

app.use(cors());
app.use(Express.json());

app.use('/api', placeRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
