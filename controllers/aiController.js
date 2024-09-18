import dotenv from 'dotenv';
dotenv.config();

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { createToolCallingAgent } from 'langchain/agents';
import { AgentExecutor } from 'langchain/agents';

import consults from '../models/consults.js';

const apiKey = process.env.API_KEY;

const consulta = new consults();

const model = new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: 'gpt-4o-mini-2024-07-18',
});

// configuración del tool
const countrySchema = z.object({
    país: z.string().describe('El país para buscar en la base de datos los lugares'),
});
// const placeSchema = z.object({
//     país: z.string().describe('El país para buscar en la base de datos los lugares'),
// });
// tool
const searchCountryPlaces = tool(
    async ({ país }) => {
        const lugares = await consulta.selectPrueba('tbl_lugares', `nombre_lugar LIKE '%${país}%'`);
        return JSON.stringify(lugares);
    },
    {
        name: 'searchCountryPlaces',
        description: 'Este tool busca lugares en la base de datos que coincidan con el nombre de un país específico. Devuelve una lista en formato JSON de todos los lugares encontrados que tienen el nombre del país mencionado. Es útil para obtener un listado de destinos dentro de un país determinado para su posterior análisis o recomendación.',
        schema: countrySchema,
    }
);

const searchPlacesByDescription = tool(
    async () => {
        const lugares = await consulta.selectFrom("tbl_lugares");
        return JSON.stringify(lugares);
    },
    {
        name: 'searchPlacesByDescription',
        description: 'Este tool permite buscar y devolver todos los lugares de la db para poder escoger 2 que se ajusten a la descripcion dada',
        //schema: countrySchema,
    }
);

const tools = [searchCountryPlaces, searchPlacesByDescription];

const texto = '"Eres un asistente de viajes personalizado que recomienda destinos turísticos basados en las preferencias del usuario. Solo debes utilizar lugares disponibles en la base de datos y devolver IDs exactos y válidos. No respondas preguntas no relacionadas con viajes. Tipos de búsqueda: Por país: Si el usuario menciona un país, pregúntale qué tipo de lugar quiere visitar allí. Usa el tool específico para obtener una lista de lugares en ese país que coincidan con la descripción y selecciona los dos que mejor se adapten a la descripción proporcionada. Por tipo de lugar: Si el usuario describe el tipo de lugar deseado (por ejemplo, playas, montañas, ciudades históricas), utiliza el tool específico para obtener una lista de lugares que coincidan con esa descripción y selecciona los dos más adecuados. Instrucciones clave: Respuestas breves y claras: Comienza con una descripción general de los lugares recomendados y luego proporciona el array de IDs exactos. Uso del tool específico: Cada vez que necesites devolver lugares recomendados, asegúrate de usar el tool específico para obtener la información más precisa y actualizada. Formato de la respuesta: Primero proporciona una descripción general del tipo de lugares recomendados, seguida por un array de IDs exactos de los lugares recomendados, por ejemplo: Descripción general: "Aquí tienes dos playas tranquilas y económicas:" IDs exactos: [1, 16] Selección y Verificación de IDs: Obtener IDs Exactos: Usa el tool específico para obtener lugares y asegúrate de que los IDs devueltos correspondan a los lugares válidos en la base de datos. Validar IDs: Antes de devolver los IDs, verifica que cada ID esté presente en la base de datos y corresponda exactamente a un lugar recomendado. Evitar Errores: Asegúrate de no devolver IDs que no estén presentes en los resultados de la consulta o que no correspondan a lugares válidos. No inventes datos: Solo devuelve lugares y IDs que están en la base de datos. No generes IDs inventados ni nombres de lugares que no están disponibles. Solicitar detalles adicionales: Si el usuario no menciona un país o tipo de lugar específico, solicita más detalles para hacer recomendaciones precisas. Manejo de casos sin resultados: Si no hay lugares disponibles que coincidan con la búsqueda, informa al usuario con un mensaje claro y devuelve un array vacío []. Si el usuario busca en un país o región sin lugares disponibles, sugiere explorar otros países o tipos de lugares. Ejemplos de interacción: Input: "Quiero ir a un lugar relajado." Output: "Aquí tienes dos lugares relajados:" seguido por [1, 16] (verificados y válidos) obtenidos mediante el uso del tool específico. Input: "Lugar donde haya muchas playas." Output: "Aquí tienes dos lugares con muchas playas:" seguido por [5, 22] (verificados y válidos) obtenidos mediante el uso del tool específico. Input: "Brasil." Output: "¿A qué tipo de lugar quieres ir en Brasil?" Si el usuario responde con una descripción, selecciona los lugares más adecuados y devuelve "Aquí tienes dos lugares recomendados en Brasil:" seguido por [8, 12] (verificados y válidos) obtenidos mediante el uso del tool específico. Input: "Quiero ir a Italia." Output: "¿A qué tipo de lugar te gustaría ir en Italia?" Si responde, selecciona los lugares más adecuados y devuelve "Aquí tienes dos lugares recomendados en Italia:" seguido por [10, 17] (verificados y válidos) obtenidos mediante el uso del tool específico. Input: "Busco un destino en la Antártida." Output: "Lo siento, no tenemos lugares disponibles en la Antártida. ¿Hay algún otro país que te interese?" Con un array vacío []. Recuerda: Usa el tool específico: Cada vez que necesites devolver lugares, asegúrate de usar el tool específico para obtener y verificar la información. Selecciona solo los IDs: Asegúrate de que los IDs devueltos sean obtenidos directamente del tool específico y correspondan exactamente a los lugares recomendados. Verifica la validez: Verifica que cada ID devuelto sea válido y existente en la base de datos antes de incluirlo en la respuesta. Mantén la precisión: Evita cualquier error en la selección de IDs y asegúrate de que la información devuelta sea precisa y actualizada.'

const prompt = ChatPromptTemplate.fromMessages([
    ['system', texto],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
]);

const chat_history = [];

const agent = await createToolCallingAgent({ llm: model, tools, prompt });

const agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: true,
});

export const searchIA = async (req, res) => {
    try {
        const inputUser = req.body.input;
        const response = await agentExecutor.invoke({
            input: inputUser,
            chat_history: chat_history,
        });

        chat_history.push(new HumanMessage(response.input));
        chat_history.push(new AIMessage(response.output));

        if (response === 'No se encontraron resultados.') {
            res.json({ error: response });
            return;
        }

        res.json(response.output);
        await consulta.closeConect();
    } catch (error) {
        res.json({ error: 'Hubo un error: ' + error });
        await consulta.closeConect();
    }
};

export const infoDestino = async (req, res) => {
    try {
        const ids = req.body.id;
        const idList = Array.isArray(ids) ? ids.join(',') : ids;

        const destinos = await consulta.select('tbl_lugares', `id IN (${idList})`);

        res.json(destinos);
        await consulta.closeConect();
    } catch (error) {
        res.json({ error: 'Hubo un error: ' + error });
        await consulta.closeConect();
    }
};

export const detallesLugar = async (req, res) => {
    try {
        const id = req.body.id;

        const resultados = await consulta.selectDetallesLugar(id);

        const destinos = resultados.reduce((acc, curr) => {
            const { id, nombre_lugar, clima, descripcion, imagen } = curr;

            if (!acc[id]) {
                acc[id] = {
                    id,
                    nombre_lugar,
                    clima,
                    descripcion,
                    imagen,
                    actividades: [],
                };
            }

            acc[id].actividades.push({
                nombre_actividad: curr.nombre_actividad,
                descripcion_actividad: curr.descripcion_actividad,
                imagen_actividad: curr.imagen_actividad
            });

            return acc;
        }, {});

        const destinosArray = Object.values(destinos);

        res.json(destinosArray);

        await consulta.closeConect();
    } catch (error) {
        res.json({ error: 'Hubo un error: ' + error });
        await consulta.closeConect();
    }
};

export const hotelesLugar = async (req, res) => {
    try {
        const id = req.body.id;

        const resultados = await consulta.selectHotelesLugar(id);

        res.json(resultados);

        await consulta.closeConect();
    } catch (error) {
        res.json({ error: 'Hubo un error: ' + error });
        await consulta.closeConect();
    }
};

export const detallesCard = async (req, res) => {
    try {
        let limit2 = req.body.limit;
        const destinos = await consulta.selectCard(limit2);

        res.json(destinos);
        await consulta.closeConect();
    } catch (error) {
        res.json({ error: 'Hubo un error: ' + error });
        await consulta.closeConect();
    }
};

export const lugaresPorIds = async (req, res) => {
    try {
        const ids = req.body.ids; // Recibe un array de IDs
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Se requiere un array de IDs' });
        }

        const idList = ids.join(',');
        const destinos = await consulta.select('tbl_lugares', `id IN (${idList})`);

        res.json(destinos);
        await consulta.closeConect();
    } catch (error) {
        res.json({ error: 'Hubo un error: ' + error });
        await consulta.closeConect();
    }
};


// const searchCountryPlaces = tool(
//     async ({ país }) => {
//         const lugares = await consulta.select('tbl_lugares', `nombre_lugar LIKE '%${país}%'`);
//         return JSON.stringify(lugares);
//     },
//     {
//         name: 'searchCountryPlaces',
//         description: 'Este tool permite buscar y devolver en lista json los lugares de un país',
//         schema: countrySchema,
//     }
// );




// const prompt = ChatPromptTemplate.fromMessages([
//     ['system', 'Eres un asistente de viajes personalizado que recomienda destinos según las preferencias del usuario. No respondas preguntas no relacionadas con viajes. Hay dos tipos de búsqueda: Por país: Si el usuario menciona un país, pregúntale qué tipo de lugar quiere visitar allí. Usa una herramienta para obtener una lista de lugares en ese país y selecciona los 2 que mejor se adapten a la descripción. Por tipo de lugar: Si el usuario describe el tipo de lugar, usa una herramienta para obtener una lista de lugares que coincidan con la descripción y selecciona los 2 más adecuados. Las respuestas deben ser cortas e incluir solo el nombre, descripción y clima del lugar. Si no hay coincidencias o lugares disponibles en la base de datos, informa al usuario. Si el usuario no menciona un país o una descripción específica, pídele más detalles. Siempre devuelve un array con los IDs de los lugares de la base de datos que seleccionaste, por ejemplo, [1, 16]. Toma los id que trae la consulta junto con el nombre del lugar, nunca coloques o inventes otros id. No digas nombres de lugares que no viste en la base de datos, Si no hay lugares disponibles, no devuelvas nada. Ejemplos: Input: "Quiero ir a un lugar relajado." Output: "[Lista de lugares relajados]" Input: "Lugar donde haya muchas playas." Output: "[Lista de lugares con muchas playas]" Input: "Quiero unas vacaciones en un lugar frío para esquiar." Output: "[Lista de lugares fríos para esquiar]" Input: "Me gustaría visitar mercados exóticos en Marruecos." Output: "[Lista correspondiente]" Input: "Un lugar para ver paisajes naturales impresionantes en Nueva Zelanda." Output: "[Lista de lugares en Nueva Zelanda]" Input: "Brasil." Output: "¿A qué tipo de lugar quieres ir en Brasil?" Input: "Lugares emocionantes." Output: "[Lista de lugares emocionantes en Brasil]" Input: "Quiero ir a Italia." Output: "¿A qué tipo de lugar te gustaría ir en Italia?" Input: "Lugares turísticos." Output: "[Lista de lugares turísticos en Italia]" Input: "Quiero visitar un lugar tranquilo en Groenlandia." Output: "Lo siento, no tenemos lugares disponibles en Groenlandia. ¿Hay algún otro país que te interese?" Input: "Busco un destino en la Antártida." Output: "Lo siento, no tenemos lugares disponibles en la Antártida. ¿Hay algún otro país que te interese?" Input: "México." Output: "¿A qué tipo de lugar quieres ir en México?" Input: "Un lugar con historia y cultura." Output: "[Lista de lugares históricos y culturales en México]"'],
//     ['placeholder', '{chat_history}'],
//     ['human', '{input}'],
//     ['placeholder', '{agent_scratchpad}'],
// ]);
