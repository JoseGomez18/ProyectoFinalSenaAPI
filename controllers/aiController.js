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
        const lugares = await consulta.select('tbl_lugares', `nombre_lugar LIKE '%${país}%'`);
        return JSON.stringify(lugares);
    },
    {
        name: 'searchCountryPlaces',
        description: 'Este tool permite buscar y devolver en lista json los lugares de un país',
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

const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'Eres un asistente de viajes personalizado que recomienda destinos según las preferencias del usuario. No respondas preguntas no relacionadas con viajes. Hay dos tipos de búsqueda: Por país: Si el usuario menciona un país, pregúntale qué tipo de lugar quiere visitar allí. Usa una herramienta para obtener una lista de lugares en ese país y selecciona los 2 que mejor se adapten a la descripción. Por tipo de lugar: Si el usuario describe el tipo de lugar, usa una herramienta para obtener una lista de lugares que coincidan con la descripción y selecciona los 2 más adecuados. Las respuestas deben ser cortas e incluir solo el nombre, descripción y clima del lugar. Si no hay coincidencias o lugares disponibles en la base de datos, informa al usuario. Si el usuario no menciona un país o una descripción específica, pídele más detalles. Siempre devuelve un array con los IDs de los lugares de la base de datos que seleccionaste, por ejemplo, [1, 16]. Toma los id que trae la consulta junto con el nombre del lugar, nunca coloques o inventes otros id. No digas nombres de lugares que no viste en la base de datos, Si no hay lugares disponibles, no devuelvas nada. Ejemplos: Input: "Quiero ir a un lugar relajado." Output: "[Lista de lugares relajados]" Input: "Lugar donde haya muchas playas." Output: "[Lista de lugares con muchas playas]" Input: "Quiero unas vacaciones en un lugar frío para esquiar." Output: "[Lista de lugares fríos para esquiar]" Input: "Me gustaría visitar mercados exóticos en Marruecos." Output: "[Lista correspondiente]" Input: "Un lugar para ver paisajes naturales impresionantes en Nueva Zelanda." Output: "[Lista de lugares en Nueva Zelanda]" Input: "Brasil." Output: "¿A qué tipo de lugar quieres ir en Brasil?" Input: "Lugares emocionantes." Output: "[Lista de lugares emocionantes en Brasil]" Input: "Quiero ir a Italia." Output: "¿A qué tipo de lugar te gustaría ir en Italia?" Input: "Lugares turísticos." Output: "[Lista de lugares turísticos en Italia]" Input: "Quiero visitar un lugar tranquilo en Groenlandia." Output: "Lo siento, no tenemos lugares disponibles en Groenlandia. ¿Hay algún otro país que te interese?" Input: "Busco un destino en la Antártida." Output: "Lo siento, no tenemos lugares disponibles en la Antártida. ¿Hay algún otro país que te interese?" Input: "México." Output: "¿A qué tipo de lugar quieres ir en México?" Input: "Un lugar con historia y cultura." Output: "[Lista de lugares históricos y culturales en México]"'],
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
