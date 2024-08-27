// import request from 'supertest';
// import app from '../controllers/aiController.js';

const request = require('supertest');
const app = require('../app')

describe('POST /api/busquedaIA', () => {
    it('Send Prompt chat IA', async () => {
        const response = await request(app)
            .post('/api/busquedaIA')
            .send({ "input": 'lugares calidos de españa' });

        expect(response.statusCode).toBe(200); // Verifica que el estado sea 200
        expect(response.body).toBeDefined(); // Verifica que el cuerpo de la respuesta esté definido

        // Verifica que la respuesta contenga el texto esperado
        const responseBody = response.body;
        const expectedText = 'lugares cálidos en España';
        expect(JSON.stringify(responseBody)).toContain(expectedText);
    }, 10000); // Aumenta el tiempo de espera a 10 segundos (10000 ms)
});

// describe('POST /api/busquedaIA', () => {
//     it('Send Prompt chat IA', async () => {
//         const response = await request(app)
//             .post('/api/busquedaIA')
//             .send({ "input": 'lugares calidos de españa' });

//         expect(response.statusCode).toBe(200); // Verifica que el estado sea 200
//         expect(response.body).toBeDefined(); // Verifica que el cuerpo de la respuesta esté definido


//         // Verifica que la respuesta contenga el texto esperado
//         const responseBody = response.body;
//         const expectedText = 'lugares cálidos en España';
//         expect(responseBody).toContain(expectedText);
//     });
// });
