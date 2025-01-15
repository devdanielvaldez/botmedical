import { createBot, createProvider, createFlow, addKeyword } from '@builderbot/bot'
import { JsonFileDB as Database } from '@builderbot/database-json'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import axios from 'axios';
import { config } from 'dotenv';
config();

const typing = async (ctx: any, provider: any) => {
    if (provider && provider?.vendor && provider.vendor?.sendPresenceUpdate) {
        const id = ctx.key.remoteJid
        await provider.vendor.sendPresenceUpdate('composing', id)
    }
};

const PORT = process.env.PORT ?? 3009;

const StartFlow = addKeyword<Provider, Database>('').addAction(async (ctx, { flowDynamic, endFlow, provider }) => {
    await typing(ctx, provider);
    const response = await axios
    .post('https://api-jennifer-wkeor.ondigitalocean.app/api/chat/init', {
        question: ctx.body,
        phoneNumber: ctx.from
    });
    await endFlow(response.data.reply);    
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
        const { number, message } = req.body
        await bot.sendMessage(number, message, {})
        return res.end('send')
    }))
};

main();
