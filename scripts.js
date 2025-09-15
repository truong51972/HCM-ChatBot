let GEMINI_API_KEY = "";
let DEBUG = false;
// Cấu hình avatar (để trống sẽ dùng biểu tượng mặc định)
const AVATAR_USER_URL = ""; // Ví dụ: "https://example.com/user.png"
const AVATAR_BOT_URL = ""; // Ví dụ: "https://example.com/bot.png"
const SHOW_AVATAR = false; // Đặt false để tắt avatar/icon

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
Ví dụ: get_detail.1`;

let prompt_answer = (
  content_detail
) => `Nội dung được cung cấp bên dưới là thông tin chi tiết về tư tưởng Hồ Chí Minh. Hãy sử dụng thông tin này để trả lời câu hỏi của người dùng một cách ngắn gọn và súc tích.

${content_detail}

`;

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
    console.error("Error loading JSON:", err);
    return null;
  }
}

// Ví dụ sử dụng:

async function callGeminiAPI(message, temperature = 0) {
  if (DEBUG) {
    return `Đây là phản hồi giả từ chế độ DEBUG.${message}`;
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";
  const body = {
    contents: [
      {
        parts: [{ text: message }],
      },
    ],
    generationConfig: {
      temperature: temperature,
    },
  };
  let attempts = 0;
  while (attempts < 5) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      console.log(data);
      // Lấy kết quả trả về từ API
      if (
        data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0].text
      ) {
        return data.candidates[0].content.parts[0].text;
      } else {
        return "Không nhận được phản hồi từ Gemini.";
      }
    } catch (err) {
      attempts++;
      if (attempts >= 5) {
        return "Lỗi khi gọi API Gemini.";
      }
    }
  }
}

function renderMarkdown(markdownText) {
  if (!markdownText) return "";
  // Escape HTML
  let text = markdownText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks ```...```
  const codeBlocks = [];
  text = text.replace(/```([\s\S]*?)```/g, function (_, code) {
    const idx = codeBlocks.push(code) - 1;
    return `{{CODE_BLOCK_${idx}}}`;
  });

  // Links [text](url)
  text = text.replace(
    /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Bold **text**
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic *text* or _text_
  text = text.replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, "$1<em>$2</em>");
  text = text.replace(/(^|\W)_([^_]+)_(?=\W|$)/g, "$1<em>$2</em>");

  // Inline code `code`
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Simple lists: lines starting with - or * → wrap with <ul>
  const lines = text.split(/\r?\n/);
  let html = "";
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*[-*]\s+(.*)$/);
    if (m) {
      if (!inList) {
        inList = true;
        html += "<ul>";
      }
      html += `<li>${m[1]}</li>`;
    } else {
      if (inList) {
        inList = false;
        html += "</ul>";
      }
      if (line.trim() === "") {
        html += "<br>";
      } else {
        html += line;
        if (i < lines.length - 1) html += "<br>";
      }
    }
  }
  if (inList) html += "</ul>";

  // Restore code blocks
  html = html.replace(/\{\{CODE_BLOCK_(\d+)\}\}/g, function (_, idxStr) {
    const idx = parseInt(idxStr, 10);
    const code = (codeBlocks[idx] || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre><code>${code}<\/code><\/pre>`;
  });

  return html;
}

function extractContentNumber(toolString) {
  const match = toolString.match(/###TOOL: get_detail\.(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

document.addEventListener("DOMContentLoaded", function () {
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatMessages = document.getElementById("chatMessages");
  const setTokenBtn = document.getElementById("setTokenBtn");
  const tokenInput = document.getElementById("tokenInput");
  const saveTokenBtn = document.getElementById("saveTokenBtn");
  const useDefaultBtn = document.getElementById("useDefaultBtn");
  const extracted_content_section = document.getElementById(
    "extracted-content-section"
  );
  const extracted_title = document.getElementById("extracted-title");
  const copyExtractBtn = document.getElementById("copyExtractBtn");
  const sampleQuestions = document.getElementById("sampleQuestions");
  const quickPrompts = document.getElementById("quickPrompts");
  const scrollBottomBtn = document.getElementById("scrollBottomBtn");
  const toggleThemeBtn = document.getElementById("toggleThemeBtn");

  function updateTokenUI() {
    if (!GEMINI_API_KEY) {
      setTokenBtn.style.display = "inline-block";
      tokenInput.style.display = "none";
      saveTokenBtn.style.display = "none";
      if (useDefaultBtn) useDefaultBtn.style.display = "inline-block";
    } else {
      setTokenBtn.style.display = "none";
      tokenInput.style.display = "none";
      saveTokenBtn.style.display = "none";
      if (useDefaultBtn) useDefaultBtn.style.display = "none";
    }
  }

  setTokenBtn.addEventListener("click", function () {
    tokenInput.style.display =
      tokenInput.style.display === "inline-block" ? "none" : "inline-block";
    saveTokenBtn.style.display = tokenInput.style.display;
  });

  saveTokenBtn.addEventListener("click", function () {
    const token = tokenInput.value.trim();
    if (token) {
      GEMINI_API_KEY = token;
      tokenInput.value = "";
      updateTokenUI();
    }
  });

  if (useDefaultBtn) {
    useDefaultBtn.addEventListener("click", function () {
      // Token mẫu do người dùng yêu cầu
      const DEFAULT_KEY = "AIzaSyD4-dDNGJGxyJDcgHBAHHMx80m2zUVY8Ik";
      GEMINI_API_KEY = DEFAULT_KEY;
      try {
        localStorage.setItem("gemini_api_key", DEFAULT_KEY);
      } catch (_) {}
      updateTokenUI();
    });
  }

  updateTokenUI();

  // Theme: init from system/localStorage
  function applyTheme(theme) {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }
  (function initTheme() {
    try {
      const saved = localStorage.getItem("theme_pref");
      if (saved) {
        applyTheme(saved);
      } else if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        applyTheme("dark");
      }
    } catch (_) {}
  })();
  if (toggleThemeBtn) {
    toggleThemeBtn.addEventListener("click", function () {
      const isDark = document.documentElement.classList.toggle("dark");
      try {
        localStorage.setItem("theme_pref", isDark ? "dark" : "light");
      } catch (_) {}
      toggleThemeBtn.textContent = isDark ? "Light" : "Dark";
    });
    // Sync label
    toggleThemeBtn.textContent = document.documentElement.classList.contains(
      "dark"
    )
      ? "Light"
      : "Dark";
  }

  // Tự động nạp token lưu trữ (nếu có) khi tải trang
  try {
    const stored = localStorage.getItem("gemini_api_key");
    if (stored && !GEMINI_API_KEY) {
      GEMINI_API_KEY = stored;
      updateTokenUI();
    }
  } catch (_) {}

  chatForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (message) {
      chatInput.value = "";
      // Reset nội dung trích dẫn cho câu hỏi mới
      if (extracted_content_section) {
        extracted_content_section.innerHTML =
          "[Đang lấy nội dung trích dẫn...]";
      }
      if (extracted_title) extracted_title.textContent = "Đang lấy trích dẫn";
      if (sampleQuestions) sampleQuestions.style.display = "none";

      const userWrap = document.createElement("div");
      const userMsg = document.createElement("div");
      userMsg.className = "chat-message user-message";
      userMsg.innerHTML = renderMarkdown(message);
      chatMessages.appendChild(userMsg);
      if (SHOW_AVATAR) {
        const userAvatar = document.createElement("div");
        userAvatar.className = "avatar avatar-user";
        if (AVATAR_USER_URL) {
          userAvatar.style.backgroundImage = `url('${AVATAR_USER_URL}')`;
          userAvatar.style.backgroundSize = "cover";
          userAvatar.style.backgroundPosition = "center";
          userAvatar.textContent = "";
          userAvatar.title = "User";
        } else {
          userAvatar.textContent = "🙂";
        }
        chatMessages.appendChild(userAvatar);
      }

      const botMsg = document.createElement("div");
      botMsg.className = "chat-message bot-message";
      // Typing indicator
      const typingWrap = document.createElement("span");
      typingWrap.className = "typing";
      typingWrap.innerHTML =
        '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
      botMsg.appendChild(typingWrap);
      if (SHOW_AVATAR) {
        const botAvatar = document.createElement("div");
        if (AVATAR_BOT_URL) {
          botAvatar.style.backgroundImage = `url('${AVATAR_BOT_URL}')`;
          botAvatar.style.backgroundSize = "cover";
          botAvatar.style.backgroundPosition = "center";
          botAvatar.textContent = "";
          botAvatar.title = "Bot";
        } else {
          botAvatar.textContent = "🤖";
        }
        botAvatar.className = "avatar avatar-bot";
        chatMessages.appendChild(botAvatar);
      }
      chatMessages.appendChild(botMsg);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      let reply = await callGeminiAPI(prompt(message, prompt_get_detail));
      const content_number = extractContentNumber(reply);
      if (content_number !== null) {
        botMsg.innerHTML = renderMarkdown(reply);

        let extracted_content = content_data[content_number];
        let extracted_content_for_display = extracted_content.replace(
          /\n/g,
          "<br>"
        );

        extracted_content_section.innerHTML = extracted_content_for_display;
        if (extracted_title)
          extracted_title.textContent = `Trích dẫn #${content_number}`;
        if (sampleQuestions) sampleQuestions.style.display = "none";

        reply = await callGeminiAPI(
          prompt(message, prompt_answer(extracted_content))
        );
      }
      botMsg.innerHTML = renderMarkdown(reply);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      updateScrollBtnVisibility();
    }
  });

  // Wire quick prompts
  if (quickPrompts) {
    quickPrompts.addEventListener("click", function (e) {
      const target = e.target;
      if (target && target.classList.contains("chip")) {
        const text =
          target.getAttribute("data-text") || target.textContent || "";
        chatInput.value = text;
        chatForm.requestSubmit();
      }
    });
  }

  // Scroll to bottom button visibility
  function updateScrollBtnVisibility() {
    if (!scrollBottomBtn) return;
    const nearBottom =
      chatMessages.scrollHeight -
        chatMessages.scrollTop -
        chatMessages.clientHeight <
      80;
    scrollBottomBtn.style.display = nearBottom ? "none" : "inline-block";
  }
  if (scrollBottomBtn) {
    scrollBottomBtn.addEventListener("click", function () {
      chatMessages.scrollTop = chatMessages.scrollHeight;
      updateScrollBtnVisibility();
      chatInput.focus();
    });
    chatMessages.addEventListener("scroll", updateScrollBtnVisibility);
    updateScrollBtnVisibility();
  }

  // Copy extract button
  if (copyExtractBtn && extracted_content_section) {
    copyExtractBtn.addEventListener("click", async function () {
      const tmp = extracted_content_section.innerText || "";
      try {
        await navigator.clipboard.writeText(tmp);
        copyExtractBtn.textContent = "Đã sao chép";
        setTimeout(() => (copyExtractBtn.textContent = "Sao chép"), 1200);
      } catch (_) {}
    });
  }
});
