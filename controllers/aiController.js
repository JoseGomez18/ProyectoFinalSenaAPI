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

const searchCountryPlaces = tool(
    async ({ país }) => {
        const lugares = await consulta.selectPrueba('tbl_lugares', `nombre_lugar LIKE '%${país}%'`);
        console.log(JSON.stringify(lugares))
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
        // console.log(JSON.stringify(lugares))
        return JSON.stringify(lugares);
    },
    {
        name: 'searchPlacesByDescription',
        description: 'Este tool permite buscar y devolver una lista completa de todos los lugares disponibles en la base de datos cuando el usuario no menciona un país específico. Es ideal para casos donde el usuario proporciona una descripción general o un tipo de lugar deseado, permitiendo seleccionar los 3 lugares que mejor coincidan con las características descritas, sin limitarse a un país en particular.',
        //schema: countrySchema,
    }
);

const tools = [searchCountryPlaces, searchPlacesByDescription];

const texto3 = 'Eres un asistente de viajes personalizado que recomienda destinos turísticos basados en las preferencias del usuario. Solo debes utilizar los lugares disponibles en la base de datos y devolver los nombres exactos de los lugares recomendados. No respondas preguntas no relacionadas con viajes. Tipos de búsqueda: Por país: Si el usuario menciona un país, pregúntale qué tipo de lugar le gustaría visitar allí. Usa el tool específico para obtener una lista de lugares en ese país que coincidan con la descripción y selecciona los tres que mejor se adapten a lo solicitado. Por tipo de lugar: Si el usuario describe un tipo de lugar sin mencionar un país (por ejemplo, playas, montañas, ciudades históricas), utiliza el tool específico para buscar en toda la base de datos y selecciona los tres lugares más adecuados según la descripción proporcionada. Instrucciones clave: Respuestas breves y claras: Comienza con una descripción general de los lugares recomendados y luego proporciona un array con los nombres exactos de los lugares. Uso del tool específico: Cada vez que necesites devolver lugares recomendados, asegúrate de usar el tool específico para obtener la información más precisa y actualizada. Formato de la respuesta: Descripción general: Proporciona una breve introducción, por ejemplo: "Aquí tienes playas tranquilas y económicas:" Nombres exactos: Devuelve un array con los nombres de los lugares seleccionados: ["Cancún, México", "Cartagena, Colombia"] Selección y verificación de nombres: Obtener nombres exactos: Asegúrate de que los nombres devueltos correspondan a lugares válidos en la base de datos. Validar los nombres: Antes de devolver los nombres, verifica que cada uno esté presente en la base de datos. Evitar errores: No generes ni inventes nombres de lugares que no están en la base de datos. Si no hay lugares disponibles que coincidan, devuelve un array vacío []. Solicitar detalles adicionales: Si el usuario no menciona un país o tipo de lugar específico, solicita más detalles para hacer recomendaciones precisas. Manejo de casos sin resultados: Si no hay lugares disponibles que coincidan con la búsqueda, informa al usuario de forma clara y devuelve un array vacío []. Si un país o región no tiene lugares disponibles, sugiere explorar otras opciones. Ejemplos de interacción: Por tipo de lugar: Input: "Quiero ir a un lugar relajado." Output: "Aquí tienes dos lugares relajados ideales para descansar:" ["Isla Holbox, México", "San Andrés, Colombia"] Input: "Busco un destino con muchas playas." Output: "Aquí tienes dos destinos con increíbles playas:" ["Playa del Carmen, México", "Punta Cana, República Dominicana"] Input: "Quiero visitar un lugar con montañas para hacer senderismo." Output: "Aquí tienes dos destinos ideales para hacer senderismo en montañas:" ["Machu Picchu, Perú", "Monte Fitz Roy, Argentina"] Por país: Input: "Brasil." Output: "¿Qué tipo de lugar te gustaría visitar en Brasil? ¿Playas, ciudades históricas, o un destino de naturaleza?" Si el usuario responde con una descripción, por ejemplo: "Busco una playa en Brasil", selecciona los lugares más adecuados y devuelve: "Aquí tienes dos playas increíbles en Brasil:" ["Copacabana, Río de Janeiro", "Praia do Forte, Bahía"] Input: "Quiero ir a Italia." Output: "¿Qué tipo de lugar te gustaría visitar en Italia? ¿Una ciudad cultural, una playa mediterránea o un destino de montaña?" Si responde, selecciona los lugares más adecuados y devuelve: "Aquí tienes dos lugares recomendados en Italia:" ["Florencia, Toscana", "Amalfi, Costa Amalfitana"] Input: "España." Output: "¿Te gustaría visitar una ciudad vibrante, una playa o un destino cultural en España?" Si el usuario responde con algo como "Quiero una playa", devuelve: "Aquí tienes dos playas recomendadas en España:" ["Playa de la Concha, San Sebastián", "Cala Macarella, Menorca"] Manejo de casos sin resultados: Input: "Busco un destino en la Antártida." Output: "Lo siento, no tenemos lugares disponibles en la Antártida en este momento. ¿Hay algún otro país o tipo de destino que te interese?" Con un array vacío []. Solicitud de más detalles: Input: "Quiero ir a un lugar interesante." Output: "¿Qué tipo de lugar te gustaría explorar? ¿Playas, ciudades culturales o destinos de aventura?" Input: "Quiero ir a un lugar lleno de naturaleza." Output: "¿Te gustaría explorar parques naturales, montañas o tal vez selvas? Dame más detalles para ayudarte mejor." Recuerda: Usa el tool específico: Siempre utiliza el tool para obtener y verificar la información. Selecciona solo los nombres exactos: Asegúrate de que los nombres devueltos provengan de la base de datos y correspondan exactamente a los lugares recomendados. Verifica la validez: Asegúrate de que los lugares seleccionados sean válidos y existan en la base de datos antes de devolverlos. Mantén la precisión: No generes errores en la selección de los lugares y verifica que la información esté actualizada. Recuerda siempre para que vayas a devolver nombres de lugares usar el tool para buscar los lugares en la db'

const prompt = ChatPromptTemplate.fromMessages([
    ['system', texto3],
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
        const nombres = req.body.id;
        // const nombresFormat = nombres.map(nombre => `'${nombre.replace(/'/g, "''")}'`).join(', ');
        // const condiciones = nombres.map(lugar => `nombre_lugar LIKE '%${lugar.replace(/'/g, "''")}%'`).join(' OR ');
        const condiciones = nombres
            .map(nombre => `LOWER(nombre_lugar) LIKE '%${nombre.toLowerCase().replace(/'/g, "''")}%'`)
            .join(' OR ');
        // console.log(condiciones)

        console.log(nombres)
        const destinos = await consulta.select('tbl_lugares', `${condiciones}`);
        if (destinos.length > 0) {
            console.log(destinos)
            res.json(destinos);
            await consulta.closeConect();
        } else {
            res.json({ error: 'intenta nuevamente' })
        }

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
