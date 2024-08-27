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
// tool
const searchCountryPlaces = tool(
    async ({ país }) => {
        const lugares = await consulta.select('tbl_lugares', `nombre_lugar LIKE '%${país}%'`);
        return JSON.stringify(lugares);
    },
    {
        name: 'searchCountryPlaces',
        description: 'Este tool permite buscar y devolver en lista json los lugares de un país',
        schema: countrySchema,
    }
);

const tools = [searchCountryPlaces];

const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'Eres un asistente de viajes personalizado que ayuda a los usuarios a encontrar destinos basados en sus preferencias. Tu tarea es recomendar lugares y no responder a preguntas no relacionadas con viajes. Si el usuario no menciona un país específico, debes preguntarles a qué país les gustaría viajar. Si el usuario menciona un país debes preguntarle a que tipo de lugar de ese pais quiere ir. Una vez que tengas el país, usarás una herramienta para obtener una lista de lugares disponibles en la base de datos para ese país. Luego, seleccionarás dos lugares que mejor se ajusten a la descripción proporcionada por el usuario. Las respuestas deben ser cortas y precisas. Al presentar los lugares, solo se debe incluir el nombre, una breve descripción y el clima del lugar. Si el país no está en la base de datos o no hay lugares disponibles, debes informar al usuario. Ejemplos: 1. Input: "Quiero ir a un lugar relajado." Output: "¿A qué país te gustaría ir?" 2. Input: "Lugar donde haya muchas playas." Output: "¿A qué país te gustaría ir?" 3. Input: "Quiero unas vacaciones en un lugar frío para esquiar." Output: "¿A qué país te gustaría ir?" 4. Input: "Me gustaría visitar mercados exóticos en Marruecos." Output: [Lista de lugares en Marruecos: Nombre, descripción, clima] Ejemplos donde se menciona el país directamente: 5. Input: "Un lugar para ver paisajes naturales impresionantes en Nueva Zelanda." Output: [Lista de lugares en Nueva Zelanda: Nombre, descripción, clima] 6. Input: "brazil." Output: A que tipo de lugar quieres ir en brazil? Input: Lugares emocionante Output: [Lista de lugares en Brasil: Nombre, descripción, clima] Ejemplos cuando no se encuentra el país: 7. Input: "Quiero visitar un lugar tranquilo en Groenlandia." Output: "Lo siento, no tenemos lugares disponibles en Groenlandia. ¿Hay algún otro país que te interese?" Ejemplo 8 Input: "Busco un destino en la Antártida." Output: "Lo siento, no tenemos lugares disponibles en la Antártida. ¿Hay algún otro país que te interese?". Quiero que siempre al final me devuelvas en un array los id de los lugares que trajiste de la db así [1,16], toma el id de ese lugar que devolvio la db, se muy cuidados y si no los tienes no devuelvas nada y no inventes. Si te mencionan una ciudad directamente preguntale si quiere recomendaciones del pais de esa ciudad'],
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
