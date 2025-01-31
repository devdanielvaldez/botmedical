import { createBot, createProvider, createFlow, addKeyword } from '@builderbot/bot';
import { JsonFileDB as Database } from '@builderbot/database-json';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';
import axios from 'axios';
import { config } from 'dotenv';
import fs from 'fs';
config();

const typing = async (ctx, provider) => {
    if (provider && provider?.vendor && provider.vendor?.sendPresenceUpdate) {
        const id = ctx.key.remoteJid;
        await provider.vendor.sendPresenceUpdate('composing', id);
    }
};

const PORT = process.env.PORT ?? 3009;
const FILE_NAME = `user_data_${new Date().toISOString().split('T')[0]}.json`;

const saveUserData = (phone, data) => {
    let users = {};
    if (fs.existsSync(FILE_NAME)) {
        users = JSON.parse(fs.readFileSync(FILE_NAME, 'utf8'));
    }
    users[phone] = data;
    fs.writeFileSync(FILE_NAME, JSON.stringify(users, null, 2));
};

const CONSULTORIOS = {
    "1": { name: "Dr. Abraham Aracena", endpoint: "https://api-jennifer-wkeor.ondigitalocean.app/apimedical3/api/chat/init" },
    "2": { name: "Dra. Gianna Castillo", endpoint: "https://api-jennifer-wkeor.ondigitalocean.app/apimedical2/api/chat/init" }
};

const selectConsultorio = async (ctx, { endFlow }) => {
    let users = {};
    if (fs.existsSync(FILE_NAME)) {
        users = JSON.parse(fs.readFileSync(FILE_NAME, 'utf8'));
    }
    const user = users[ctx.from];
    const today = new Date().toISOString().split('T')[0];

    if (user?.date === today) return user.consultorio;

    await endFlow("Seleccione con qué consultorio desea hablar:\n1. Dr. Abraham Aracena\n2. Dra. Gianna Castillo");
    return null;
};

const StartFlow = addKeyword('')
    .addAction(async (ctx, { flowDynamic, endFlow, provider }) => {
        await typing(ctx, provider);

        let consultorio = await selectConsultorio(ctx, { endFlow });

        if (!consultorio) {
            saveUserData(ctx.from, { date: new Date().toISOString().split('T')[0] });
            return;
        }

        const endpoint = CONSULTORIOS[consultorio].endpoint;
        const response = await axios.post(endpoint, {
            question: ctx.body,
            phoneNumber: ctx.from
        });

        console.log(endpoint);
        console.log(response);

        await flowDynamic(response.data.reply);
    })
    .addAction(async (ctx, { flowDynamic }) => {
        if(ctx.body == '1') {
            saveUserData(ctx.from, { consultorio: "1", date: new Date().toISOString().split('T')[0] });
            await flowDynamic(`Has seleccionado: ${CONSULTORIOS["1"].name}. Ahora puedes empezar a chatear.`);
        }
        if(ctx.body == '2') {
            saveUserData(ctx.from, { consultorio: "2", date: new Date().toISOString().split('T')[0] });
            await flowDynamic(`Has seleccionado: ${CONSULTORIOS["2"].name}. Ahora puedes empezar a chatear.`);
        }
    });

const main = async () => {
    const adapterFlow = createFlow([StartFlow]);
    const adapterProvider = createProvider(Provider);
    const adapterDB = new Database({ filename: 'db.json' });

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    httpServer(+PORT);

    adapterProvider.server.post('/v1/messages', handleCtx(async (bot, req, res) => {
        const { number, message } = req.body;
        await bot.sendMessage(number, message, {});
        return res.end('send');
    }));
};

main();
