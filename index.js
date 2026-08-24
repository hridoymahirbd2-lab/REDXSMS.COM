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
const LIVE_SMS_URL = "https://redxsms.com/Switchfy/test/live-sms"; // আপনার দেওয়া লাইভ এসএমএস লিংক
const ADMIN_USERNAME = "@Teamgenz25";
const SUPPORT_GROUP_URL = "https://t.me/hridoyrojikop";

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// পৃথিবীর যেকোনো দেশের নাম বা টেক্সট থেকে নিখুঁতভাবে পতাকা (Flag Emoji) জেনারেট করার ইউনিভার্সাল ফাংশন
function getCountryFlag(rangeName) {
    if (!rangeName) return '🌍';
    const name = rangeName.toUpperCase();

    // বিশ্বের প্রধান প্রধান দেশগুলোর নাম ম্যাপিং
    const countryMap = {
        'US': '🇺🇸', 'USA': '🇺🇸', 'UNITED STATES': '🇺🇸', 'AMERICA': '🇺🇸',
        'UK': '🇬🇧', 'GB': '🇬🇧', 'UNITED KINGDOM': '🇬🇧', 'BRITAIN': '🇬🇧', 'ENGLAND': '🇬🇧',
        'BD': '🇧🇩', 'BANGLADESH': '🇧🇩',
        'IN': '🇮🇳', 'INDIA': '🇮🇳',
        'TG': '🇹🇬', 'TOGO': '🇹🇬',
        'JM': '🇯🇲', 'JAMAICA': '🇯🇲',
        'PK': '🇵🇰', 'PAKISTAN': '🇵🇰',
        'NG': '🇳🇬', 'NIGERIA': '🇳🇬',
        'ZA': '🇿🇦', 'SOUTH AFRICA': '🇿🇦',
        'CA': '🇨🇦', 'CANADA': '🇨🇦',
        'AU': '🇦🇺', 'AUSTRALIA': '🇦🇺',
        'DE': '🇩🇪', 'GERMANY': '🇩🇪',
        'FR': '🇫🇷', 'FRANCE': '🇫🇷',
        'BR': '🇧🇷', 'BRAZIL': '🇧🇷',
        'RU': '🇷🇺', 'RUSSIA': '🇷🇺',
        'CN': '🇨🇳', 'CHINA': '🇨🇳',
        'JP': '🇯🇵', 'JAPAN': '🇯🇵',
        'AE': '🇦🇪', 'UAE': '🇦🇪', 'DUBAI': '🇦🇪',
        'SA': '🇸🇦', 'SAUDI ARABIA': '🇸🇦',
        'MY': '🇲🇾', 'MALAYSIA': '🇲🇾',
        'ID': '🇮🇩', 'INDONESIA': '🇮🇩',
        'SG': '🇸🇬', 'SINGAPORE': '🇸🇬',
        'IT': '🇮🇹', 'ITALY': '🇮🇹',
        'ES': '🇪🇸', 'SPAIN': '🇪🇸',
        'TR': '🇹🇷', 'TURKEY': '🇹🇷',
        'NL': '🇳🇱', 'NETHERLANDS': '🇳🇱',
        'SE': '🇸🇪', 'SWEDEN': '🇸🇪',
        'CH': '🇨🇭', 'SWITZERLAND': '🇨🇭',
        'PH': '🇵🇭', 'PHILIPPINES': '🇵🇭',
        'VN': '🇻🇳', 'VIETNAM': '🇻🇳',
        'TH': '🇹🇭', 'THAILAND': '🇹🇭',
        'EG': '🇪🇬', 'EGYPT': '🇪🇬'
    };

    for (const key in countryMap) {
        if (name.includes(key)) {
            return countryMap[key];
        }
    }

    // যদি টেক্সটের মধ্যে দুই অক্ষরের কান্ট্রি কোড থাকে (যেমন US, GB, TG)
    const words = name.split(/[\s-]+/);
    for (let word of words) {
        if (word.length === 2 && /^[A-Z]{2}$/.test(word)) {
            const codePoints = word
                .toUpperCase()
                .split('')
                .map(char => 127397 + char.charCodeAt(0));
            return String.fromCodePoint(...codePoints);
        }
    }

    return '🌍';
}

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
                          `🏢 সোর্স: ${data.source}\n` +
                          `⏰ সময়: ${data.received_at}`;
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
        }
    }

    if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;

        if (data.startsWith('country_')) {
            const rangeName = decodeURIComponent(data.replace('country_', ''));
            await sendNumbersByRange(chatId, messageId, rangeName, 0);
        } else if (data.startsWith('more_')) {
            const parts = data.split('_');
            const rangeName = decodeURIComponent(parts[1]);
            const pageIndex = parseInt(parts[2]);
            await sendNumbersByRange(chatId, messageId, rangeName, pageIndex);
        }

        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQuery.id })
        });
    }

    res.sendStatus(200);
});

// কান্ট্রি বা রেঞ্জ সিলেক্ট মেনু (সকল দেশের পতাকা সহ)
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
                const flag = getCountryFlag(range);
                inlineKeyboard.push([{ text: `${flag} ${range}`, callback_data: `country_${encodeURIComponent(range)}` }]);
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
            await sendTelegramMessage(chatId, `⚠️ প্যানেল থেকে কোনো নাম্বার পাওয়া যায়নি।`);
        }
    } catch (error) {
        console.error('API Error:', error);
        await sendTelegramMessage(chatId, `❌ কান্ট্রি লিস্ট লোড করতে সমস্যা হয়েছে।`);
    }
}

// রেঞ্জ অনুযায়ী ১০টি নাম্বার এবং Change Number বাটন
async function sendNumbersByRange(chatId, messageId, rangeName, pageIndex) {
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
                const flag = getCountryFlag(rangeName);
                let msg = `${flag} *রেঞ্জ: ${rangeName}* (সেট ${pageIndex + 1} / ${Math.ceil(filteredNumbers.length / pageSize)})\n\n`;
                currentBatch.forEach(item => {
                    let num = item.number;
                    if (!num.startsWith('+')) num = '+' + num;
                    msg += `\`${num}\`\n`;
                });

                let inlineKeyboard = [];
                if (endIndex < filteredNumbers.length) {
                    inlineKeyboard.push([{ text: "🔄 Change Number", callback_data: `more_${encodeURIComponent(rangeName)}_${pageIndex + 1}` }]);
                }

                await fetch(`${TELEGRAM_API}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        chat_id: chatId, 
                        message_id: messageId,
                        text: msg, 
                        parse_mode: 'Markdown',
                        reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined
                    })
                });
            } else {
                await sendTelegramMessage(chatId, `⚠️ এই রেঞ্জের আর কোনো নাম্বার নেই।`);
            }
        }
    } catch (error) {
        console.error('API Error:', error);
        await sendTelegramMessage(chatId, `❌ নাম্বার লোড করতে সমস্যা হয়েছে।`);
    }
}

// অ্যাক্সেস হিস্ট্রি (আপনার দেওয়া লাইভ এসএমএস লিংক বা এপিআই থেকে ফেচ করা)
async function fetchAndSendAccessHistory(chatId) {
    try {
        await sendTelegramMessage(chatId, `⏳ আপনার লাইভ অ্যাক্সেস হিস্ট্রি চেক করা হচ্ছে...`);

        // আপনার দেওয়া লিংক থেকে ডেটা ফেচ করার চেষ্টা
        const response = await fetch(LIVE_SMS_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        let result;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        } else {
            // যদি সরাসরি JSON না হয়ে মূল এপিআই ব্যাকআপ থেকে নিতে হয়
            const fallbackRes = await fetch('https://redxsms.com/api/v1/iprn/messages?per_page=10', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
            });
            result = await fallbackRes.json();
        }

        const messagesData = result.data || (Array.isArray(result) ? result : []);

        if (messagesData.length > 0) {
            let msg = `⚡ *সাম্প্রতিক অ্যাক্সেস হিস্ট্রি (লাইভ এসএমএস):*\n\n`;
            
            messagesData.forEach((item, index) => {
                let num = item.number;
                if (num && !num.startsWith('+')) num = '+' + num;
                const sourceName = item.source || 'Unknown';
                const rangeText = item.range_name || 'General Range';
                const flag = getCountryFlag(rangeText);

                msg += `${index + 1}. ${flag} রেঞ্জ: *${rangeText}*\n` +
                       `   📌 নাম্বার: \`${num || 'N/A'}\`\n` +
                       `   🏢 অ্যাক্সেস/সোর্স: *${sourceName}* (যেমন: WhatsApp)\n` +
                       `   💬 মেসেজ: ${item.message || item.text || 'N/A'}\n` +
                       `   ⏰ সময়: ${item.received_at || 'Just now'}\n\n`;
            });

            await sendTelegramMessage(chatId, msg);
        } else {
            await sendTelegramMessage(chatId, `⚠️ এই মুহূর্তে কোনো অ্যাক্সেস হিস্ট্রি পাওয়া যায়নি।`);
        }
    } catch (error) {
        console.error('API Error:', error);
        await sendTelegramMessage(chatId, `❌ লাইভ অ্যাক্সেস হিস্ট্রি লোড করতে সমস্যা হয়েছে।`);
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

// স্টার্ট মেনু কিবোর্ড লেআউট
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
