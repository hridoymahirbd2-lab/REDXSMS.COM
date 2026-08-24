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
const PANEL_URL = "https://redxsms.com";
const API_KEY = "sk_live_9TtycMXNuMhz09GbFetndm1IVnHAmiL9F4L3Qxc6";
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
    const formattedNumber = data.number && !data.number.startsWith('+') ? `+${data.number}` : data.number;

    switch (eventType) {
        case 'message.received':
            messageText = `🔴 *[REDXSMS.COM]* - নতুন SMS / OTP এসেছে!\n\n` +
                          `📌 নাম্বার: \`${formattedNumber}\`\n` +
                          `💬 মেসেজ: *${data.message}*\n` +
                          `🏢 কোম্পানি: ${data.source}\n` +
                          `⏰ সময়: ${data.received_at}`;
            break;

        case 'number.assigned':
            messageText = `🟢 *[REDXSMS.COM]* - নতুন নাম্বার যুক্ত হয়েছে!\n\n` +
                          `📌 নাম্বার: \`${formattedNumber}\`\n` +
                          `📂 রেঞ্জ: ${data.range_name}\n` +
                          `💵 রেট: $${data.a2p_rate}`;
            break;

        case 'number.removed':
            messageText = `❌ *[REDXSMS.COM]* - নাম্বার রিমুভ হয়েছে!\n\n` +
                          `📌 নাম্বার: \`${formattedNumber}\`\n` +
                          `📂 রেঞ্জ: ${data.range_name}`;
            break;

        case 'earnings.daily':
            messageText = `💰 *[REDXSMS.COM]* - দৈনিক আয়ের সারাংশ (${data.date})\n\n` +
                          `📊 মোট মেসেজ: ${data.messages}\n` +
                          `💵 মোট আয়: $${data.earnings} ${data.currency}`;
            break;
    }
}

// ==========================================
// টেলিগ্রাম বট টেক্সট ও পার্মানেন্ট বাটন হ্যান্ডলার
// ==========================================
app.post(`/bot/${BOT_TOKEN}`, async (req, res) => {
    const update = req.body;

    if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text;

        if (text === '/start') {
            await sendWelcomeMenu(chatId);
        } else if (text === '📥 My Numbers') {
            await fetchAndSendNumbers(chatId);
        } else if (text === '❌ Remove Number') {
            await sendTelegramMessage(chatId, `❌ নাম্বার রিমুভ করতে আপনার প্যানেলে লগইন করুন:\n${PANEL_URL}\n\n(প্যানেলের নাম্বার ম্যানেজমেন্ট থেকে যেকোনো নাম্বার সরাসরি রিমুভ করতে পারবেন)`);
        } else if (text === '📊 My SMS History') {
            await fetchAndSendSmsHistory(chatId);
        } else if (text === '👨‍💻 Admin Support') {
            await sendTelegramMessage(chatId, `👨‍💻 কোনো সহায়তার জন্য এডমিনের সাথে যোগাযোগ করুন: ${ADMIN_USERNAME}`);
        } else if (text === '/status') {
            await sendTelegramMessage(chatId, `✅ REDXSMS.COM বট এবং সার্ভার সম্পূর্ণ সচল রয়েছে!`);
        }
    }

    res.sendStatus(200);
});

// প্যানেল থেকে রেঞ্জ অনুযায়ী সাজিয়ে নাম্বার পাঠানোর ফাংশন
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
            const groupedByRange = {};
            result.data.forEach(item => {
                const range = item.range_name || 'Others';
                if (!groupedByRange[range]) {
                    groupedByRange[range] = [];
                }
                groupedByRange[range].push(item);
            });

            let msg = `📋 *আপনার অ্যাসাইন করা নাম্বারসমূহ:*\n\n`;
            let globalIndex = 1;

            for (const [rangeName, numbers] of Object.entries(groupedByRange)) {
                msg += `📂 *রেঞ্জ: ${rangeName}*\n`;
                
                numbers.forEach((item) => {
                    let num = item.number;
                    if (!num.startsWith('+')) {
                        num = '+' + num;
                    }

                    msg += `  ${globalIndex}. \`${num}\` (Rate: $${item.a2p_rate})\n`;
                    globalIndex++;
                });
                msg += `\n`;
            }

            await sendTelegramMessage(chatId, msg);
        } else {
            await sendTelegramMessage(chatId, `⚠️ আপনার অ্যাকাউন্টে বর্তমানে কোনো নাম্বার পাওয়া যায়নি।`);
        }
    } catch (error) {
        console.error('API Error:', error);
        await sendTelegramMessage(chatId, `❌ নাম্বার ফেচ করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।`);
    }
}

// প্যানেল থেকে মেসেজ বা ওটিপি হিস্ট্রি ফেচ করার ফাংশন
async function fetchAndSendSmsHistory(chatId) {
    try {
        await sendTelegramMessage(chatId, `⏳ আপনার সাম্প্রতিক এসএমএস হিস্ট্রি লোড করা হচ্ছে...`);

        const response = await fetch('https://redxsms.com/api/v1/iprn/messages?per_page=10', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            let msg = `📊 *সাম্প্রতিক এসএমএস / ওটিপি হিস্ট্রি (শেষ ১০টি):*\n\n`;
            result.data.forEach((item, index) => {
                let num = item.number;
                if (!num.startsWith('+')) num = '+' + num;

                msg += `${index + 1}. 📌 \`${num}\`\n` +
                       `   💬 মেসেজ: *${item.message}*\n` +
                       `   🏢 সোর্স: ${item.source} | স্ট্যাটাস: ${item.status}\n` +
                       `   ⏰ সময়: ${item.received_at}\n\n`;
            });
            await sendTelegramMessage(chatId, msg);
        } else {
            await sendTelegramMessage(chatId, `⚠️ কোনো এসএমএস হিস্ট্রি পাওয়া যায়নি।`);
        }
    } catch (error) {
        console.error('API Error:', error);
        await sendTelegramMessage(chatId, `❌ এসএমএস হিস্ট্রি ফেচ করতে সমস্যা হয়েছে।`);
    }
}

// স্থায়ী কিবোর্ড বাটন (Reply Keyboard)
async function sendWelcomeMenu(chatId) {
    const keyboard = {
        keyboard: [
            [
                { text: "📥 My Numbers" },
                { text: "❌ Remove Number" }
            ],
            [
                { text: "📊 My SMS History" },
                { text: "👨‍💻 Admin Support" }
            ]
        ],
        resize_keyboard: true,
        is_persistent: true
    };

    try {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: `🤖 *REDXSMS.COM Bot*-এ আপনাকে স্বাগতম!\n\nনিচের কিবোর্ড বাটনগুলো থেকে আপনার প্রয়োজনীয় অপশন সিলেক্ট করুন:`, 
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
