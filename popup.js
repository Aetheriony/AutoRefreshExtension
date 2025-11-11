document.addEventListener("DOMContentLoaded", function () {
    const startBtn = document.getElementById("start");
    const stopBtn = document.getElementById("stop");
    const intervalSelect = document.getElementById("interval");
    const timerDisplay = document.getElementById("timerDisplay");
    const customIntervalGroup = document.getElementById("custom-interval-group");
    const customMinutesInput = document.getElementById("custom-minutes");
    const customSecondsInput = document.getElementById("custom-seconds");

    let currentTabId = null;

    // Get the current tab to apply the timer to.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) return; // Should not happen
        currentTabId = tabs[0].id;

        // Get the initial status for the current tab.
        chrome.runtime.sendMessage({ action: "get_status", tabId: currentTabId }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error getting status:", chrome.runtime.lastError);
            } else if (response) {
                updateUI(response);
            }
        });

        // Set up a periodic update for the UI.
        setInterval(() => {
            chrome.runtime.sendMessage({ action: "get_status", tabId: currentTabId }, (response) => {
                if (chrome.runtime.lastError) {
                    // Background script might be inactive; assume stopped.
                    updateUI({ isRunning: false });
                } else if (response) {
                    updateUI(response);
                }
            });
        }, 1000);
    });

    // Show/hide custom interval inputs based on dropdown selection.
    intervalSelect.addEventListener("change", () => {
        customIntervalGroup.style.display = (intervalSelect.value === "custom") ? "flex" : "none";
    });

    // --- UI Update Logic ---
    function updateUI(status) {
        if (status.isRunning) {
            const minutes = Math.floor(status.timeLeft / 60);
            const seconds = status.timeLeft % 60;
            timerDisplay.textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
            timerDisplay.classList.remove("stopped");
            startBtn.disabled = true;
            stopBtn.disabled = false;

            const predefined = ["300", "600", "1200", "1800"];
            if (predefined.includes(status.interval.toString())) {
                intervalSelect.value = status.interval;
                customIntervalGroup.style.display = "none";
            } else {
                intervalSelect.value = "custom";
                customIntervalGroup.style.display = "flex";
                customMinutesInput.value = Math.floor(status.interval / 60);
                customSecondsInput.value = status.interval % 60;
            }
        } else {
            timerDisplay.textContent = "Not running";
            timerDisplay.classList.add("stopped");
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    }

    // --- Event Listeners for Buttons ---
    startBtn.addEventListener("click", () => {
        if (!currentTabId) return;
        let interval;
        if (intervalSelect.value === "custom") {
            const minutes = parseInt(customMinutesInput.value, 10) || 0;
            const seconds = parseInt(customSecondsInput.value, 10) || 0;
            interval = (minutes * 60) + seconds;
            if (interval < 1) {
                alert("The minimum refresh interval is 1 second.");
                return;
            }
        } else {
            interval = parseInt(intervalSelect.value, 10);
        }

        chrome.runtime.sendMessage({ action: "start_refresh", tabId: currentTabId, interval: interval }, () => {
            if (!chrome.runtime.lastError) {
                updateUI({ isRunning: true, timeLeft: interval, interval: interval });
            }
        });
    });

    stopBtn.addEventListener("click", () => {
        if (!currentTabI) return;
        chrome.runtime.sendMessage({ action: "stop_refresh", tabId: currentTabId }, () => {
            if (!chrome.runtime.lastError) {
                updateUI({ isRunning: false });
            }
        });
    });
});