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
const SUPPORT_GROUP_URL = "https://t.me/hridoyrojikop";

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
                          `🏢 কোম্পানি/সোর্স: ${data.source}\n` +
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
// টেলিগ্রাম বট টেক্সট ও বাটন হ্যান্ডলার
// ==========================================
app.post(`/bot/${BOT_TOKEN}`, async (req, res) => {
    const update = req.body;

    if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text;

        if (text === '/start') {
            await sendWelcomeMenu(chatId);
        } else if (text === '📥 Get Number') {
            await sendCountrySelectionMenu(chatId);
        } else if (text === '⚡ Access History') {
            await fetchAndSendAccessHistory(chatId);
        } else if (text === '📊 My SMS History') {
            await fetchAndSendSmsHistory(chatId);
        } else if (text === '👨‍💻 Admin Support') {
            await sendAdminSupportMenu(chatId);
        } else if (text === '/status') {
            await sendTelegramMessage(chatId, `✅ REDXSMS.COM বট এবং সার্ভার সম্পূর্ণ সচল রয়েছে!`);
        }
    }

    if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        if (data.startsWith('country_')) {
            const rangeName = data.replace('country_', '');
            await sendNumbersByRange(chatId, rangeName, 0);
        } else if (data.startsWith('more_')) {
            const parts = data.split('_');
            const rangeName = decodeURIComponent(parts[1]);
            const pageIndex = parseInt(parts[2]);
            await sendNumbersByRange(chatId, rangeName, pageIndex);
        }

        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQuery.id })
        });
    }

    res.sendStatus(200);
});

// কান্ট্রি সিলেকশন মেনু
async function sendCountrySelectionMenu(chatId) {
    try {
        await sendTelegramMessage(chatId, `⏳ উপলব্ধ কান্ট্রি ও রেঞ্জ লোড করা হচ্ছে...`);

        const response = await fetch('https://redxsms.com/api/v1/iprn/numbers', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            const ranges = [...new Set(result.data.map(item => item.range_name || 'Others'))];
            
            let inlineKeyboard = [];
            ranges.forEach(range => {
                inlineKeyboard.push([{ text: `🌍 ${range}`, callback_data: `country_${encodeURIComponent(range)}` }]);
            });

            await fetch(`${TELEGRAM_API}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: `📌 *নিচের কান্ট্রি বা রেঞ্জগুলো থেকে একটি সিলেক্ট করুন:*`, 
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: inlineKeyboard }
                })
            });
        } else {
            await sendTelegramMessage(chatId, `⚠️ আপনার অ্যাকাউন্টে বর্তমানে কোনো নাম্বার পাওয়া যায়নি।`);
        }
    } catch (error) {
        console.error('API Error:', error);
        await sendTelegramMessage(chatId, `❌ কান্ট্রি লিস্ট লোড করতে সমস্যা হয়েছে।`);
    }
}

// রেঞ্জ অনুযায়ী ১০টি নাম্বার ও চেঞ্জ বাটন পাঠানো
async function sendNumbersByRange(chatId, rangeName, pageIndex) {
    try {
        const response = await fetch('https://redxsms.com/api/v1/iprn/numbers', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success && result.data) {
            const filteredNumbers = result.data.filter(item => (item.range_name || 'Others') === rangeName);
            
            const pageSize = 10;
            const startIndex = pageIndex * pageSize;
            const endIndex = startIndex + pageSize;
            const currentBatch = filteredNumbers.slice(startIndex, endIndex);

            if (currentBatch.length > 0) {
                let msg = `📂 *রেঞ্জ: ${rangeName}* (সেট ${pageIndex + 1})\n\n`;
                currentBatch.forEach(item => {
                    let num = item.number;
                    if (!num.startsWith('+')) num = '+' + num;
                    msg += `\`${num}\`\n`;
                });

                let inlineKeyboard = [];
                if (endIndex < filteredNumbers.length) {
                    inlineKeyboard.push([{ text: "🔄 Change Number (Next 10)", callback_data: `more_${encodeURIComponent(rangeName)}_${pageIndex + 1}` }]);
                }

                await fetch(`${TELEGRAM_API}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        chat_id: chatId, 
                        text: msg, 
                        parse_mode: 'Markdown',
                        reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined
                    })
                });
            } else {
                await sendTelegramMessage(chatId, `⚠️ এই দেশের আর কোনো নাম্বার নেই।`);
            }
        }
    } catch (error) {
        console.error('API Error:', error);
        await sendTelegramMessage(chatId, `❌ নাম্বার লোড করতে সমস্যা হয়েছে।`);
    }
}

// অ্যাক্সেস হিস্ট্রি (শেষ ১০ মিনিটের বা সাম্প্রতিক মেসেজ কোন রেঞ্জ ও সোর্স থেকে এসেছে তা দেখানো)
async function fetchAndSendAccessHistory(chatId) {
    try {
        await sendTelegramMessage(chatId, `⏳ সাম্প্রতিক অ্যাক্সেস হিস্ট্রি চেক করা হচ্ছে...`);

        const response = await fetch('https://redxsms.com/api/v1/iprn/messages?per_page=10', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            let msg = `⚡ *সাম্প্রতিক অ্যাক্সেস হিস্ট্রি (কোন সোর্স ও নাম্বার থেকে মেসেজ এসেছে):*\n\n`;
            
            result.data.forEach((item, index) => {
                let num = item.number;
                if (!num.startsWith('+')) num = '+' + num;

                msg += `${index + 1}. 📌 \`${num}\`\n` +
                       `   🏢 সোর্স/অ্যাক্সেস: *${item.source}* (যেমন: WhatsApp ইত্যাদি)\n` +
                       `   💬 মেসেজ: ${item.message}\n` +
                       `   ⏰ সময়: ${item.received_at}\n\n`;
            });

            await sendTelegramMessage(chatId, msg);
        } else {
            await sendTelegramMessage(chatId, `⚠️ সাম্প্রতিক কোনো অ্যাক্সেস হিস্ট্রি পাওয়া যায়নি।`);
        }
    } catch (error) {
        console.error('API Error:', error);
        await sendTelegramMessage(chatId, `❌ অ্যাক্সেস হিস্ট্রি লোড করতে সমস্যা হয়েছে।`);
    }
}

// সাধারণ এসএমএস হিস্ট্রি
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

// এডমিন সাপোর্ট মেনু
async function sendAdminSupportMenu(chatId) {
    const inlineKeyboard = {
        inline_keyboard: [
            [
                { text: "ADMIN", url: `https://t.me/${ADMIN_USERNAME.replace('@', '')}` },
                { text: "SUPPORT GROUP", url: SUPPORT_GROUP_URL }
            ]
        ]
    };

    try {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: `👨‍💻 *এডমিন সাপোর্ট*\n\nযেকোনো প্রয়োজনে সরাসরি যোগাযোগ করুন:\n👤 Admin: ${ADMIN_USERNAME}\n🔗 Support Group: ${SUPPORT_GROUP_URL}`, 
                parse_mode: 'Markdown',
                reply_markup: inlineKeyboard
            })
        });
    } catch (error) {
        console.error('Telegram API Error:', error);
    }
}

// স্টার্ট মেনু কিবোর্ড লেআউট (নতুন Access History বাটন সহ)
async function sendWelcomeMenu(chatId) {
    const keyboard = {
        keyboard: [
            [
                { text: "📥 Get Number" },
                { text: "⚡ Access History" }
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
