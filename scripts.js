let GEMINI_API_KEY = '';
let DEBUG = false;

let prompt_get_detail = `Để bắt đầu trả lời 1 câu hỏi, bạn luôn phải sử dụng thông tin tóm tắt bên dưới như một nguồn tham khảo cho việc gọi tool lấy thông tin chi tiết. Sau khi có được thông tin chi tiết thì mới bắt đầu trả lời câu hỏi của người dùng.

Dưới đây là một số thông tin tóm tắt về tư tưởng Hồ Chí Minh:
1: ${summary_1}
2: ${summary_2}
3: ${summary_3}
4: ${summary_4}
5: ${summary_5}
6: ${summary_6}
7: ${summary_7}

Để có thể lấy thông tin chi tiết, bạn cần gọi tool để lấy thông tin.
Cách gọi tool:
###TOOL: get_detail.<số thứ tự>
Ví dụ: get_detail.1`

let prompt_answer = (content_detail) => `Nội dung được cung cấp bên dưới là thông tin chi tiết về tư tưởng Hồ Chí Minh. Hãy sử dụng thông tin này để trả lời câu hỏi của người dùng một cách ngắn gọn và súc tích.

${content_detail}

`

let prompt = (message, body) =>
    `Bạn là một giảng viên về môn "Tư tưởng Hồ Chí Minh".
Hãy trả lời ngắn gọn và súc tích các câu hỏi liên quan đến môn học này.

${body}

##Người dùng hỏi:
${message}
`;


async function loadJson(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json(); // Tự động parse thành object
        return data;
    } catch (err) {
        console.error('Error loading JSON:', err);
        return null;
    }
}

// Ví dụ sử dụng:


async function callGeminiAPI(message, temperature = 0) {
    if (DEBUG) {
        return `Đây là phản hồi giả từ chế độ DEBUG.${message}`;
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';
    const body = {
        contents: [
            {
                parts: [
                    { text: message }
                ]
            }
        ],
        generationConfig: {
            temperature: temperature
        }
    };
    let attempts = 0;
    while (attempts < 5) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': GEMINI_API_KEY
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            console.log(data);
            // Lấy kết quả trả về từ API
            if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
                return data.candidates[0].content.parts[0].text;
            } else {
                return 'Không nhận được phản hồi từ Gemini.';
            }
        } catch (err) {
            attempts++;
            if (attempts >= 5) {
                return 'Lỗi khi gọi API Gemini.';
            }
        }
    }
}

function extractContentNumber(toolString) {
    const match = toolString.match(/###TOOL: get_detail\.(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

document.addEventListener('DOMContentLoaded', function () {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const setTokenBtn = document.getElementById('setTokenBtn');
    const tokenInput = document.getElementById('tokenInput');
    const saveTokenBtn = document.getElementById('saveTokenBtn');
    const extracted_content_section = document.getElementById('extracted-content-section');

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

    setTokenBtn.addEventListener('click', function () {
        setTokenBtn.style.display = 'none';
        tokenInput.style.display = 'inline-block';
        saveTokenBtn.style.display = 'inline-block';
    });

    saveTokenBtn.addEventListener('click', function () {
        const token = tokenInput.value.trim();
        if (token) {
            GEMINI_API_KEY = token;
            tokenInput.value = '';
            updateTokenUI();
        }
    });

    updateTokenUI();

    chatForm.addEventListener('submit', async function (e) {
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

            let reply = await callGeminiAPI(prompt(message, prompt_get_detail));
            const content_number = extractContentNumber(reply);
            if (content_number !== null) {
                botMsg.innerHTML = reply.replace(/\n/g, '<br>');

                let extracted_content = content_data[content_number]
                let extracted_content_for_display = extracted_content.replace(/\n/g, '<br>');

                extracted_content_section.innerHTML = extracted_content_for_display;

                reply = await callGeminiAPI(prompt(message, prompt_answer(extracted_content)));
            }
            botMsg.innerHTML = reply.replace(/\n/g, '<br>');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
});