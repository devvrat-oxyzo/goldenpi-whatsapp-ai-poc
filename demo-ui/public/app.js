const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");
const messages = document.querySelector("#messages");
const clearButton = document.querySelector("#clear-button");
const traceStatus = document.querySelector("#trace-status");
const emptyTrace = document.querySelector("#empty-trace");
const traceGrid = document.querySelector("#trace-grid");
const traceIdBlock = document.querySelector("#trace-id-block");

function appendMessage(role, text, loading = false) {
  const article = document.createElement("article");
  article.className = `message ${role === "user" ? "user-message" : "assistant-message"}${loading ? " loading" : ""}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = role === "user" ? "YOU" : "π";

  const body = document.createElement("div");
  const author = document.createElement("p");
  author.className = "message-author";
  author.textContent = role === "user" ? "Internal tester" : "GoldenPi assistant";
  const content = document.createElement("p");
  content.textContent = text;
  body.append(author, content);
  article.append(avatar, body);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
  return article;
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value ?? "Not used";
}

function showTrace(data) {
  emptyTrace.classList.add("hidden");
  traceGrid.classList.remove("hidden");
  traceIdBlock.classList.remove("hidden");

  const allowed = data.decision === "ALLOW_AI_RESPONSE";
  traceStatus.textContent = allowed ? "AI allowed" : "Policy controlled";
  traceStatus.className = `status-badge ${allowed ? "allowed" : "blocked"}`;

  setText("intent", data.intent);
  setText("decision", data.decision);
  setText("source", data.diagnostic.responseSource);
  setText("model", data.diagnostic.model);
  setText("prompt-version", data.diagnostic.promptVersion);
  setText("skill", data.diagnostic.skillId);
  setText("customer-data", data.diagnostic.customerDataAccessed ? "Accessed" : "Not accessed");
  setText("human-handoff", data.requiresHuman ? "Required" : "Not required");
  setText("latency", `${data.diagnostic.backendElapsedMs} ms`);
  setText("trace-id", data.traceId);
}

async function submitMessage(message) {
  appendMessage("user", message);
  const loading = appendMessage("assistant", "Checking policy and preparing a response…", true);
  sendButton.disabled = true;
  input.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await response.json();
    loading.remove();

    if (!response.ok) {
      appendMessage("assistant", data.message ?? "The assistant is temporarily unavailable.");
      traceStatus.textContent = "Error";
      traceStatus.className = "status-badge blocked";
      return;
    }

    appendMessage("assistant", data.answer);
    showTrace(data);
  } catch {
    loading.remove();
    appendMessage("assistant", "The assistant is temporarily unavailable. Please try again.");
    traceStatus.textContent = "Error";
    traceStatus.className = "status-badge blocked";
  } finally {
    sendButton.disabled = false;
    input.disabled = false;
    input.value = "";
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (message) submitMessage(message);
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.prompt;
    input.focus();
  });
});

clearButton.addEventListener("click", () => window.location.reload());

document.querySelector("#copy-trace").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  await navigator.clipboard.writeText(document.querySelector("#trace-id").textContent);
  button.textContent = "Copied";
  setTimeout(() => { button.textContent = "Copy"; }, 1200);
});
