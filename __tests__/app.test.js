import request from 'supertest';
import app from '../app.js';

describe('POST /api/busquedaIA', () => {
    it('Send Promp chat IA', async () => {
        const response = await request(app)
            .post('/api/busquedaIA')
            .send({ "input": 'lugares calidos de españa' });
            
        console.log('Response Body:', response.body);

        expect(response.statusCode).toBe(200); // Verifica que el estado sea 200
        expect(response.body).toBeDefined();

        expect(typeof response.body).toBe('string');

    }, 20000);
});
