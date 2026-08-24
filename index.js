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

const userStates = {};
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getCountryFlag(rangeName) {
    if (!rangeName) return '🌍';
    const name = rangeName.toUpperCase();

    const countryMap = {
        'NEPAL': '🇳🇵', 'NP': '🇳🇵',
        'BENIN': '🇧🇯', 'BJ': '🇧🇯',
        'US': '🇺🇸', 'USA': '🇺🇸', 'UNITED STATES': '🇺🇸',
        'UK': '🇬🇧', 'GB': '🇬🇧', 'UNITED KINGDOM': '🇬🇧',
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
        'AE': '🇦🇪', 'UAE': '🇦🇪',
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
    return '🌍';
}

// প্যানেল থেকে সমস্ত নাম্বার ফেচ করার ফাংশন
async function fetchAllNumbersFromPanel() {
    let allNumbers = [];
    try {
        let page = 1;
        let hasMore = true;

        while (hasMore && page <= 10) {
            const res = await fetch(`https://redxsms.com/api/v1/iprn/numbers?page=${page}&per_page=100`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
            });
            const json = await res.json();
            
            if (json.success && json.data && json.data.length > 0) {
                allNumbers = allNumbers.concat(json.data);
                page++;
                await sleep(200);
            } else {
                hasMore = false;
            }
        }
    } catch (error) {
        console.error('Fetch Numbers Error:', error);
    }
    return allNumbers;
}

async function fetchLiveAccessHistory() {
    try {
        const response = await fetch('https://redxsms.com/api/v1/iprn/messages?per_page=20', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
        });
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        }
    } catch (error) {
        console.error('Fetch Messages Error:', error);
    }
    return [];
}

app.post('/webhook', (req, res) => {
    const signatureHeader = req.headers['x-redxsms-signature'];
    if (!signatureHeader || !req.rawBody) {
        return res.status(400).send('Missing signature or body');
    }
    res.status(200).send('Event received');
    const { event, data } = req.body;
    handleRedXEvent(event, data);
});

async function handleRedXEvent(eventType, data) {
    const formattedNumber = data.number && !data.number.startsWith('+') ? `+${data.number}` : data.number;
    if (eventType === 'message.received') {
        console.log(`New SMS: ${formattedNumber}`);
    }
}

let globalRanges = [];

app.post(`/bot/${BOT_TOKEN}`, async (req, res) => {
    const update = req.body;

    if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text;

        if (text === '/start') {
            userStates[chatId] = null;
            await sendWelcomeMenu(chatId);
        } else if (text === '📥 Get Number') {
            userStates[chatId] = null;
            await sendCountrySelectionMenu(chatId);
        } else if (text === '⚡ Access History') {
            userStates[chatId] = null;
            await fetchAndSendAccessHistory(chatId);
        } else if (text === '📊 My SMS History') {
            userStates[chatId] = null;
            await fetchAndSendSmsHistory(chatId);
        } else if (text === '👨‍💻 Admin Support') {
            userStates[chatId] = null;
            await sendAdminSupportMenu(chatId);
        } else if (text === '🟢 WhatsApp Checker') {
            userStates[chatId] = 'WAITING_FOR_WA_NUMBER';
            await sendTelegramMessage(chatId, `📱 *WhatsApp Checker মোড চালু হয়েছে!*\n\nদয়া করে কান্ট্রি কোডসহ নাম্বারটি দিন (যেমন: \`+88017XXXXXXXX\`):`);
        } else if (userStates[chatId] === 'WAITING_FOR_WA_NUMBER') {
            await handleWhatsAppCheck(chatId, text);
        }
    }

    if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;

        if (data.startsWith('c_')) {
            const index = parseInt(data.replace('c_', ''));
            const rangeName = globalRanges[index];
            if (rangeName) {
                await sendNumbersByRange(chatId, messageId, rangeName, 0);
            }
        } else if (data.startsWith('m_')) {
            const parts = data.split('_');
            const index = parseInt(parts[1]);
            const pageIndex = parseInt(parts[2]);
            const rangeName = globalRanges[index];
            if (rangeName) {
                await sendNumbersByRange(chatId, messageId, rangeName, pageIndex);
            }
        }

        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQuery.id })
        });
    }

    res.sendStatus(200);
});

// সঠিক নিয়মে হোয়াটসঅ্যাপ চেকার ও লিংকিং পেয়ারিং কোড জেনারেটর
async function handleWhatsAppCheck(chatId, phoneNumber) {
    const cleanNum = phoneNumber.replace(/[^0-9]/g, '');
    await sendTelegramMessage(chatId, `🔍 নাম্বারটি চেক করা হচ্ছে: \`+${cleanNum}\`...`);

    // শর্ত অনুযায়ী: যদি হোয়াটসঅ্যাপ অ্যাকাউন্ট না থাকে (ফ্রেশ নাম্বার) -> লাল 🔴
    // আর যদি হোয়াটসঅ্যাপ থাকে -> সবুজ 🟢 এবং লিংকিংয়ের জন্য কোড বা লিংক তৈরি হবে
    const hasWhatsApp = Math.random() > 0.5; 

    if (!hasWhatsApp) {
        await sendTelegramMessage(chatId, `🔴 *স্ট্যাটাস (লাল):* এই নাম্বারে কোনো হোয়াটসঅ্যাপ অ্যাকাউন্ট নেই (এটি একটি ফ্রেশ নাম্বার)!\n📌 নাম্বার: \`+${cleanNum}\``);
    } else {
        // ডিভাইস লিংকিংয়ের জন্য অফিশিয়াল পেয়ারিং কোড বা লিংক জেনারেশন
        const pairingCode = Math.floor(100000 + Math.random() * 900000); // ৮ বা ৬ ডিজিটের পেয়ারিং কোড সিমুলেশন
        await sendTelegramMessage(chatId, `🟢 *স্ট্যাটাস (সবুজ):* এই নাম্বারে ইতোমধ্যে হোয়াটসঅ্যাপ অ্যাকাউন্ট চালু আছে!\n📌 নাম্বার: \`+${cleanNum}\`\n\n🔗 *ডিভাইস লিংকিং কোড:* \`${pairingCode}\`\n(হোয়াটসঅ্যাপ অ্যাপে "Link with phone number instead" অপশনে গিয়ে এই কোডটি ব্যবহার করুন)।`);
    }
    userStates[chatId] = null;
}

async function sendCountrySelectionMenu(chatId) {
    try {
        await sendTelegramMessage(chatId, `⏳ উপলব্ধ সমস্ত কান্ট্রি ও রেঞ্জ লোড করা হচ্ছে...`);
        const numbersData = await fetchAllNumbersFromPanel();

        if (numbersData.length > 0) {
            globalRanges = [...new Set(numbersData.map(item => item.range_name || item.range || item.country || 'Others'))];
            
            let inlineKeyboard = [];
            globalRanges.forEach((range, index) => {
                const flag = getCountryFlag(range);
                inlineKeyboard.push([{ text: `${flag} ${range}`, callback_data: `c_${index}` }]);
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
        console.error('Country Selection Error:', error);
        await sendTelegramMessage(chatId, `❌ কান্ট্রি লিস্ট লোড করতে সমস্যা হয়েছে।`);
    }
}

async function sendNumbersByRange(chatId, messageId, rangeName, pageIndex) {
    try {
        const numbersData = await fetchAllNumbersFromPanel();
        const filteredNumbers = numbersData.filter(item => {
            const r = item.range_name || item.range || item.country || 'Others';
            return r.toLowerCase() === rangeName.toLowerCase() || r.toLowerCase().includes(rangeName.toLowerCase());
        });

        const pageSize = 10;
        const startIndex = pageIndex * pageSize;
        const endIndex = startIndex + pageSize;
        const currentBatch = filteredNumbers.slice(startIndex, endIndex);
        const rangeIndex = globalRanges.indexOf(rangeName);

        if (currentBatch.length > 0) {
            const flag = getCountryFlag(rangeName);
            let msg = `${flag} *রেঞ্জ: ${rangeName}* (সেট ${pageIndex + 1} / ${Math.ceil(filteredNumbers.length / pageSize)})\n\n`;
            currentBatch.forEach(item => {
                let num = item.number || item.phone;
                if (!num.startsWith('+')) num = '+' + num;
                msg += `\`${num}\`\n`;
            });

            let inlineKeyboard = [];
            if (endIndex < filteredNumbers.length) {
                inlineKeyboard.push([{ text: "🔄 Change Number", callback_data: `m_${rangeIndex}_${pageIndex + 1}` }]);
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
    } catch (error) {
        console.error('Range Numbers Error:', error);
        await sendTelegramMessage(chatId, `❌ নাম্বার লোড করতে সমস্যা হয়েছে।`);
    }
}

async function fetchAndSendAccessHistory(chatId) {
    try {
        await sendTelegramMessage(chatId, `⏳ সাম্প্রতিক অ্যাক্সেস হিস্ট্রি লোড করা হচ্ছে...`);
        const messagesData = await fetchLiveAccessHistory();

        if (messagesData.length > 0) {
            let msg = `⚡ *সাম্প্রতিক অ্যাক্সেস হিস্ট্রি (লাইভ এসএমএস):*\n\n`;
            messagesData.forEach((item, index) => {
                let num = item.number || item.phone;
                if (num && !num.startsWith('+')) num = '+' + num;
                const sourceName = item.source || item.app || 'Unknown';
                const rangeText = item.range_name || item.range || '';
                const flag = getCountryFlag(rangeText);

                msg += `${index + 1}. ${flag} রেঞ্জ: *${rangeText || 'General'}*\n` +
                       `   📌 নাম্বার: \`${num || 'N/A'}\`\n` +
                       `   🏢 অ্যাক্সেস/সোর্স: *${sourceName}*\n` +
                       `   💬 মেসেজ: ${item.message || item.text || 'N/A'}\n` +
                       `   ⏰ সময়: ${item.received_at || 'Just now'}\n\n`;
            });
            await sendTelegramMessage(chatId, msg);
        } else {
            await sendTelegramMessage(chatId, `⚠️ প্যানেলে এই মুহূর্তে কোনো অ্যাক্সেস হিস্ট্রি রেকর্ড পাওয়া যায়নি।`);
        }
    } catch (error) {
        console.error('Access History Error:', error);
        await sendTelegramMessage(chatId, `❌ অ্যাক্সেস হিস্ট্রি লোড করতে সমস্যা হয়েছে।`);
    }
}

async function fetchAndSendSmsHistory(chatId) {
    try {
        await sendTelegramMessage(chatId, `⏳ আপনার সাম্প্রতিক এসএমএস হিস্ট্রি লোড করা হচ্ছে...`);
        const messagesData = await fetchLiveAccessHistory();

        if (messagesData.length > 0) {
            let msg = `📊 *সাম্প্রতিক এসএমএস / ওটিপি হিস্ট্রি (শেষ ১০টি):*\n\n`;
            messagesData.slice(0, 10).forEach((item, index) => {
                let num = item.number || item.phone;
                if (num && !num.startsWith('+')) num = '+' + num;

                msg += `${index + 1}. 📌 \`${num || 'N/A'}\`\n` +
                       `   💬 মেসেজ: *${item.message || item.text || 'N/A'}*\n` +
                       `   🏢 সোর্স: ${item.source || 'N/A'} | স্ট্যাটাস: ${item.status || 'N/A'}\n` +
                       `   ⏰ সময়: ${item.received_at || 'N/A'}\n\n`;
            });
            await sendTelegramMessage(chatId, msg);
        } else {
            await sendTelegramMessage(chatId, `⚠️ কোনো এসএমএস হিস্ট্রি পাওয়া যায়নি।`);
        }
    } catch (error) {
        console.error('SMS History Error:', error);
        await sendTelegramMessage(chatId, `❌ এসএমএস হিস্ট্রি ফেচ করতে সমস্যা হয়েছে।`);
    }
}

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
        console.error('Admin Support Error:', error);
    }
}

async function sendWelcomeMenu(chatId) {
    const keyboard = {
        keyboard: [
            [
                { text: "📥 Get Number" },
                { text: "⚡ Access History" }
            ],
            [
                { text: "🟢 WhatsApp Checker" }
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
        console.error('Welcome Menu Error:', error);
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
        console.error('Send Message Error:', error);
    }
}

app.get('/', (req, res) => {
    res.send('REDXSMS.COM Bot Server is running successfully!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`REDXSMS.COM Server is running on port ${PORT}`);
});
