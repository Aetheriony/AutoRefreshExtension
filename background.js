let tabTimers = {}; // Stores timer data keyed by tabId: { timeLeft, interval }

// This global interval runs once per second to manage all active timers.
setInterval(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTabId = (tabs.length > 0) ? tabs[0].id : null;

        for (const tabIdStr in tabTimers) {
            const tabId = parseInt(tabIdStr, 10);
            const timer = tabTimers[tabId];

            if (timer.timeLeft > 0) {
                timer.timeLeft--;
            }

            if (timer.timeLeft === 0) {
                // When time is up, reset the timer and reload the tab.
                timer.timeLeft = timer.interval;
                chrome.tabs.reload(tabId);
            }

            // Update the badge text only if the tab is the currently active one.
            if (tabId === activeTabId) {
                updateBadgeForTab(tabId);
            }
        }
    });
}, 1000);

// Handles messages from the popup script.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = message.tabId || (sender.tab && sender.tab.id);
    if (!tabId) return;

    switch (message.action) {
        case "start_refresh":
            startTimerForTab(tabId, message.interval);
            sendResponse({ status: "success" });
            break;
        case "stop_refresh":
            stopTimerForTab(tabId);
            sendResponse({ status: "success" });
            break;
        case "get_status":
            sendResponse(tabTimers[tabId] ? 
                { isRunning: true, ...tabTimers[tabId] } : 
                { isRunning: false }
            );
            break;
    }
    return true; // Needed for asynchronous sendResponse.
});

// Updates the badge when the user switches to a different tab.
chrome.tabs.onActivated.addListener(activeInfo => {
    updateBadgeForTab(activeInfo.tabId);
});

// Cleans up the timer when a tab is closed.
chrome.tabs.onRemoved.addListener(tabId => {
    stopTimerForTab(tabId);
});

function startTimerForTab(tabId, interval) {
    if (tabTimers[tabId]) {
        stopTimerForTab(tabId);
    }
    tabTimers[tabId] = {
        timeLeft: interval,
        interval: interval
    };
    // Perform an initial reload.
    chrome.tabs.reload(tabId);
    updateBadgeForTab(tabId);
}

function stopTimerForTab(tabId) {
    if (tabTimers[tabId]) {
        delete tabTimers[tabId];
    }
    // Ensure the badge text is cleared for the specific tab.
    chrome.action.setBadgeText({ text: '', tabId: tabId });
}

function updateBadgeForTab(tabId) {
    const timer = tabTimers[tabId];
    if (timer) {
        const minutes = Math.floor(timer.timeLeft / 60);
        const seconds = timer.timeLeft % 60;
        const text = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        chrome.action.setBadgeText({ text: text, tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#007bff', tabId: tabId });
    } else {
        chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
}
