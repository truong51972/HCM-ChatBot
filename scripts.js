let GEMINI_API_KEY = '';
let DEBUG = false;

let prompt = (message) =>
`Bạn là một giảng viên về môn "Tư tưởng Hồ Chí Minh".
Hãy trả lời ngắn gọn và súc tích các câu hỏi liên quan đến môn học này.

##Người dùng hỏi:
${message}
`;

async function callGeminiAPI(message) {
    if (DEBUG) {
        return `Đây là phản hồi giả từ chế độ DEBUG.${message}`;
    }
    
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;
    const body = {
        contents: [
            {
                parts: [
                    { text: message }
                ]
            }
        ]
    };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        // Lấy kết quả trả về từ API
        if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return 'Không nhận được phản hồi từ Gemini.';
        }
    } catch (err) {
        return 'Lỗi khi gọi API Gemini.';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const setTokenBtn = document.getElementById('setTokenBtn');
    const tokenInput = document.getElementById('tokenInput');
    const saveTokenBtn = document.getElementById('saveTokenBtn');

    function updateTokenUI() {
        if (!GEMINI_API_KEY) {
            setTokenBtn.style.display = 'none';
            tokenInput.style.display = 'inline-block';
            saveTokenBtn.style.display = 'inline-block';
        } else {
            setTokenBtn.style.display = 'none';
            tokenInput.style.display = 'none';
            saveTokenBtn.style.display = 'none';
        }
    }

    setTokenBtn.addEventListener('click', function() {
        setTokenBtn.style.display = 'none';
        tokenInput.style.display = 'inline-block';
        saveTokenBtn.style.display = 'inline-block';
    });

    saveTokenBtn.addEventListener('click', function() {
        const token = tokenInput.value.trim();
        if (token) {
            GEMINI_API_KEY = token;
            tokenInput.value = '';
            updateTokenUI();
        }
    });

    updateTokenUI();

    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message) {
            chatInput.value = '';

            const userMsg = document.createElement('div');
            userMsg.innerHTML = message.replace(/\n/g, '<br>');
            userMsg.className = 'chat-message user-message';
            chatMessages.appendChild(userMsg);

            const botMsg = document.createElement('div');
            botMsg.textContent = '...';
            botMsg.className = 'chat-message bot-message';
            chatMessages.appendChild(botMsg);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            const reply = await callGeminiAPI(prompt(message));
            botMsg.innerHTML = reply.replace(/\n/g, '<br>');
            chatMessages.scrollTop = chatMessages.scrollHeight;

        }
    });
});