let refreshTimer = null;
let countdownTimer = null;
let timeLeft = 0;
let isRunning = false;
let refreshInterval = 300; // Default 5 minutes

// Load state from storage on startup
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(["refreshInterval", "isRunning"], (data) => {
        if (data.isRunning && data.refreshInterval) {
            startRefresh(data.refreshInterval);
        }
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[DEBUG] Received message:", message);

    if (message.action === "start_refresh") {
        let interval = message.interval;
        startRefresh(interval);
        sendResponse({ status: "success", message: "Auto-refresh started" });
        return true;
    }

    if (message.action === "stop_refresh") {
        stopTimers();
        sendResponse({ status: "success", message: "Auto-refresh stopped" });
    }

    if (message.action === "get_status") {
        sendResponse({ isRunning: isRunning, timeLeft: timeLeft, refreshInterval: refreshInterval });
    }
});

function startRefresh(interval) {
    stopTimers(); // Stop any existing timers
    isRunning = true;
    refreshInterval = interval;
    timeLeft = interval;
    chrome.storage.local.set({ refreshInterval: refreshInterval, isRunning: true });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            let tabId = tabs[0].id;
            chrome.tabs.reload(tabId, () => {
                console.log("[DEBUG] Page refreshed immediately");

                refreshTimer = setInterval(() => {
                    chrome.tabs.reload(tabId);
                    console.log("[DEBUG] Page auto-refreshed");
                    timeLeft = refreshInterval; // Reset timer
                }, refreshInterval * 1000);

                startCountdown();
            });
        }
    });
}

function updateBadgeText() {
    if (isRunning && timeLeft > 0) {
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        let displayText = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
        chrome.action.setBadgeText({ text: displayText });
        chrome.action.setBadgeBackgroundColor({ color: "#007bff" });
    } else {
        chrome.action.setBadgeText({ text: "" });
    }
}

function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
        } else {
            timeLeft = refreshInterval;
        }
        updateBadgeText();
    }, 1000);
}

function stopTimers() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    isRunning = false;
    timeLeft = 0;
    chrome.storage.local.set({ isRunning: false });
    chrome.action.setBadgeText({ text: "" });
    console.log("[DEBUG] Auto-refresh stopped");
}
