const express = require('express');
const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// আপনার দেওয়া কনফিগারেশন
const BOT_TOKEN = process.env.BOT_TOKEN || '8899123886:AAE8BEJiN_XQSfkuzakx8EhCpDxdxxcM7YM';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // এটি Render-এর Environment Variables-এ সেট করবেন
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '7334814626';
const PANEL_URL = "https://redxsms.com";
const ADMIN_USERNAME = "@Teamgenz25";

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// REDXSMS.COM ওয়েবহুক রিসিভার
app.post('/webhook', (req, res) => {
    const signatureHeader = req.headers['x-redxsms-signature'];
    
    if (!signatureHeader || !req.rawBody) {
        return res.status(400).send('Missing signature or body');
    }

    const computedHmac = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(req.rawBody)
        .digest('hex');

    if (`sha256=${computedHmac}` !== signatureHeader) {
        return res.status(401).send('Invalid signature');
    }

    res.status(200).send('Event received');

    const { event, data } = req.body;
    handleRedXEvent(event, data);
});

async function handleRedXEvent(eventType, data) {
    let messageText = '';

    switch (eventType) {
        case 'message.received':
            messageText = `🔴 *[REDXSMS.COM]* - নতুন SMS / OTP এসেছে!\n\n` +
                          `📌 নাম্বার: \`${data.number}\`\n` +
                          `💬 মেসেজ: *${data.message}*\n` +
                          `🏢 কোম্পানি: ${data.source}\n` +
                          `⏰ সময়: ${data.received_at}`;
            break;

        case 'number.assigned':
            messageText = `🟢 *[REDXSMS.COM]* - নতুন নাম্বার যুক্ত হয়েছে!\n\n` +
                          `📌 নাম্বার: \`${data.number}\`\n` +
                          `📂 রেঞ্জ: ${data.range_name}\n` +
                          `💵 রেট: $${data.a2p_rate}`;
            break;

        case 'number.removed':
            messageText = `❌ *[REDXSMS.COM]* - নাম্বার রিমুভ হয়েছে!\n\n` +
                          `📌 নাম্বার: \`${data.number}\`\n` +
                          `📂 রেঞ্জ: ${data.range_name}`;
            break;

        case 'earnings.daily':
            messageText = `💰 *[REDXSMS.COM]* - দৈনিক আয়ের সারাংশ (${data.date})\n\n` +
                          `📊 মোট মেসেজ: ${data.messages}\n` +
                          `💵 মোট আয়: $${data.earnings} ${data.currency}`;
            break;
    }

    if (messageText && ADMIN_CHAT_ID) {
        await sendTelegramMessage(ADMIN_CHAT_ID, messageText);
    }
}

// টেলিগ্রাম বট কমান্ড এবং বাটন হ্যান্ডলার
app.post(`/bot/${BOT_TOKEN}`, async (req, res) => {
    const update = req.body;

    if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text;

        if (text === '/start') {
            await sendWelcomeMenu(chatId);
        } else if (text === '/status') {
            await sendTelegramMessage(chatId, `✅ REDXSMS.COM বট এবং সার্ভার সম্পূর্ণ সচল রয়েছে!`);
        }
    }

    if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        if (data === 'get_number') {
            await sendTelegramMessage(chatId, `📥 নাম্বার নিতে বা দেখতে নিচের লিংকে প্যানেলে ভিজিট করুন:\n${PANEL_URL}`);
        } else if (data === 'remove_number') {
            await sendTelegramMessage(chatId, `❌ নাম্বার রিমুভ করতে আপনার প্যানেলে লগইন করে নাম্বার ম্যানেজমেন্ট থেকে রিমুভ করুন:\n${PANEL_URL}`);
        } else if (data === 'admin_support') {
            await sendTelegramMessage(chatId, `👨‍💻 কোনো সহায়তার জন্য এডমিনের সাথে যোগাযোগ করুন: ${ADMIN_USERNAME}`);
        }

        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQuery.id })
        });
    }

    res.sendStatus(200);
});

async function sendWelcomeMenu(chatId) {
    const keyboard = {
        inline_keyboard: [
            [
                { text: "📥 Get Number", callback_data: "get_number" },
                { text: "❌ Remove Number", callback_data: "remove_number" }
            ],
            [
                { text: "👨‍💻 Admin Support", callback_data: "admin_support" }
            ]
        ]
    };

    try {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: `🤖 *REDXSMS.COM Bot*-এ আপনাকে স্বাগতম!\n\nনিচের অপশনগুলো থেকে আপনার প্রয়োজনীয় কাজ সিলেক্ট করুন:`, 
                parse_mode: 'Markdown',
                reply_markup: keyboard
            })
        });
    } catch (error) {
        console.error('Telegram API Error:', error);
    }
}

async function sendTelegramMessage(chatId, text) {
    try {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: text, 
                parse_mode: 'Markdown' 
            })
        });
    } catch (error) {
        console.error('Telegram API Error:', error);
    }
}

app.get('/', (req, res) => {
    res.send('REDXSMS.COM Bot Server is running successfully!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`REDXSMS.COM Server is running on port ${PORT}`);
});