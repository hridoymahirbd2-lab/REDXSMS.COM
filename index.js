const express = require('express');
const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

const BOT_TOKEN = process.env.BOT_TOKEN || '8899123886:AAE8BEJiN_XQSfkuzakx8EhCpDxdxxcM7YM';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; 
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '7334814626';
const PANEL_URL = "https://redxsms.com";
const API_KEY = "sk_live_9TtycMXNuMhz09GbFetndm1IVnHAmiL9F4L3Qxc6"; // আপনার এপিআই কি
const ADMIN_USERNAME = "@Teamgenz25";

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ==========================================
// REDXSMS.COM ওয়েবহুক রিসিভার
// ==========================================
app.post('/webhook', (req, res) => {
    const signatureHeader = req.headers['x-redxsms-signature'];
    
    if (!signatureHeader || !req.rawBody) {
        return res.status(400).send('Missing signature or body');
    }

    if (WEBHOOK_SECRET) {
        const computedHmac = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(req.rawBody)
            .digest('hex');

        if (`sha256=${computedHmac}` !== signatureHeader) {
            return res.status(401).send('Invalid signature');
        }
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

// ==========================================
// টেলিগ্রাম বট ইন্টারঅ্যাকশন ও বাটন হ্যান্ডলার
// ==========================================
app.post(`/bot/${BOT_TOKEN}`, async (req, res) => {
    const update = req.body;

    if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text;

        if (text === '/start') {
            await sendWelcomeMenu(chatId);
        } else if (text === '/status') {
            await sendTelegramMessage(chatId, `✅ REDXSMS.COM বট এবং সার্ভার সম্পূর্ণ সচল রয়েছে!`);
        } else if (text === '/numbers') {
            await fetchAndSendNumbers(chatId);
        }
    }

    if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        if (data === 'get_number') {
            await fetchAndSendNumbers(chatId);
        } else if (data === 'remove_number') {
            await sendTelegramMessage(chatId, `❌ নাম্বার রিমুভ করতে আপনার প্যানেলে লগইন করুন:\n${PANEL_URL}`);
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

// প্যানেল থেকে নাম্বার ফেচ করে টেলিগ্রামে পাঠানোর ফাংশন
async function fetchAndSendNumbers(chatId) {
    try {
        await sendTelegramMessage(chatId, `⏳ আপনার প্যানেল থেকে নাম্বারগুলো লোড করা হচ্ছে...`);

        const response = await fetch('https://redxsms.com/api/v1/iprn/numbers', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            let msg = `📋 *আপনার অ্যাসাইন করা নাম্বারসমূহ:*\n\n`;
            result.data.forEach((item, index) => {
                msg += `${index + 1}. \`${item.number}\`\n   📂 ${item.range_name}\n   💵 রেট: $${item.a2p_rate}\n\n`;
            });
            await sendTelegramMessage(chatId, msg);
        } else {
            await sendTelegramMessage(chatId, `⚠️ আপনার অ্যাকাউন্টে বর্তমানে কোনো নাম্বার পাওয়া যায়নি।`);
        }
    } catch (error) {
        console.error('API Error:', error);
        await sendTelegramMessage(chatId, `❌ নাম্বার ফেচ করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।`);
    }
}

async function sendWelcomeMenu(chatId) {
    const keyboard = {
        inline_keyboard: [
            [
                { text: "📥 My Numbers", callback_data: "get_number" },
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
