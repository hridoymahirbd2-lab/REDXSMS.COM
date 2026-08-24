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

// ইউজারদের দেখানো নাম্বার ট্র্যাক করার জন্য মেমোরি স্টোরেজ (যাতে একই নাম্বার বারবার না আসে)
const userShownNumbers = {};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// নিখুঁত কান্ট্রি ফ্ল্যাগ কনভার্টার
function getCountryFlag(rangeName) {
    if (!rangeName) return '🌍';
    const name = rangeName.toUpperCase();

    const countryMap = {
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

// প্যানেলের সব পেজ থেকে সব নাম্বার ফেচ করার রোবাস্ট ফাংশন
async function fetchAllNumbersFromPanel() {
    let allNumbers = [];
    try {
        let currentPage = 1;
        let lastPage = 1;

        do {
            const res = await fetch(`https://redxsms.com/api/v1/iprn/numbers?page=${currentPage}&per_page=100`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
            });
            const json = await res.json();
            
            if (json.success && json.data) {
                allNumbers = allNumbers.concat(json.data);
                if (json.pagination && json.pagination.last_page) {
                    lastPage = json.pagination.last_page;
                }
            } else {
                break;
            }
            currentPage++;
            await sleep(400);
        } while (currentPage <= lastPage);
    } catch (error) {
        console.error('Fetch Numbers Error:', error);
    }
    return allNumbers;
}

// অ্যাক্সেস হিস্ট্রি ফেচ করার ফাংশন
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

// ==========================================
// ওয়েবহুক রিসিভার
// ==========================================
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

// ==========================================
// টেলিগ্রাম বট হ্যান্ডলার
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

        if (data.startsWith('c_')) {
            const index = parseInt(data.replace('c_', ''));
            const rangeName = globalRanges[index];
            if (rangeName) {
                // নতুন কান্ট্রি সিলেক্ট করলে আগের দেখানো নাম্বারের হিস্ট্রি রিসেট হবে
                if (!userShownNumbers[chatId]) userShownNumbers[chatId] = {};
                userShownNumbers[chatId][rangeName] = [];
                await sendNumbersByRange(chatId, messageId, rangeName);
            }
        } else if (data.startsWith('m_')) {
            const index = parseInt(data.replace('m_', ''));
            const rangeName = globalRanges[index];
            if (rangeName) {
                await sendNumbersByRange(chatId, messageId, rangeName);
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

// সমস্ত কান্ট্রি বা রেঞ্জ লোড করা
async function sendCountrySelectionMenu(chatId) {
    try {
        await sendTelegramMessage(chatId, `⏳ উপলব্ধ সমস্ত কান্ট্রি ও রেঞ্জ লোড করা হচ্ছে...`);
        const numbersData = await fetchAllNumbersFromPanel();

        if (numbersData.length > 0) {
            globalRanges = [...new Set(numbersData.map(item => item.range_name || item.range || 'Others'))];
            
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

// রেঞ্জ অনুযায়ী ১০টি নতুন নাম্বার এবং Change Number বাটন (যেগুলো একবার দেখানো হয়েছে তা আর আসবে না)
async function sendNumbersByRange(chatId, messageId, rangeName) {
    try {
        const numbersData = await fetchAllNumbersFromPanel();
        const filteredNumbers = numbersData.filter(item => {
            const r = item.range_name || item.range || 'Others';
            return r.toLowerCase() === rangeName.toLowerCase() || r.toLowerCase().includes(rangeName.toLowerCase());
        });

        if (!userShownNumbers[chatId]) userShownNumbers[chatId] = {};
        if (!userShownNumbers[chatId][rangeName]) userShownNumbers[chatId][rangeName] = [];

        // যে নাম্বারগুলো ইতিমধ্যে দেখানো হয়েছে, সেগুলো বাদ দেওয়া
        const remainingNumbers = filteredNumbers.filter(item => {
            const num = item.number || item.phone;
            return !userShownNumbers[chatId][rangeName].includes(num);
        });

        const currentBatch = remainingNumbers.slice(0, 10);
        const rangeIndex = globalRanges.indexOf(rangeName);

        if (currentBatch.length > 0) {
            // নতুন দেখানো নাম্বারগুলো মেমোরিতে যুক্ত করা
            currentBatch.forEach(item => {
                const num = item.number || item.phone;
                userShownNumbers[chatId][rangeName].push(num);
            });

            const flag = getCountryFlag(rangeName);
            let msg = `${flag} *রেঞ্জ: ${rangeName}*\n\n`;
            currentBatch.forEach(item => {
                let num = item.number || item.phone;
                if (!num.startsWith('+')) num = '+' + num;
                msg += `\`${num}\`\n`;
            });

            let inlineKeyboard = [];
            // যদি আরও নাম্বার বাকি থাকে তবে Change Number বাটন দেখাবে
            if (remainingNumbers.length > 10) {
                inlineKeyboard.push([{ text: "🔄 Change Number", callback_data: `m_${rangeIndex}` }]);
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
            await sendTelegramMessage(chatId, `⚠️ এই রেঞ্জের আর কোনো নতুন নাম্বার বাকি নেই।`);
        }
    } catch (error) {
        console.error('Range Numbers Error:', error);
        await sendTelegramMessage(chatId, `❌ নাম্বার লোড করতে সমস্যা হয়েছে।`);
    }
}

// অ্যাক্সেস হিস্ট্রি
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

// সাধারণ এসএমএস হিস্ট্রি
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
        console.error('Admin Support Error:', error);
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
