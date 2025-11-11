document.addEventListener("DOMContentLoaded", function () {
    const startBtn = document.getElementById("start");
    const stopBtn = document.getElementById("stop");
    const intervalSelect = document.getElementById("interval");
    const timerDisplay = document.getElementById("timerDisplay");

    // Function to update the UI based on the background state
    function updateUI(status) {
        if (status.isRunning) {
            const minutes = Math.floor(status.timeLeft / 60);
            const seconds = status.timeLeft % 60;
            timerDisplay.textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
            timerDisplay.classList.remove("stopped");
            intervalSelect.value = status.refreshInterval;
            startBtn.disabled = true;
            stopBtn.disabled = false;
        } else {
            timerDisplay.textContent = "Not running";
            timerDisplay.classList.add("stopped");
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    }

    // Get the current status from the background script when the popup is opened
    chrome.runtime.sendMessage({ action: "get_status" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error getting status:", chrome.runtime.lastError);
        } else {
            updateUI(response);
        }
    });

    // Start auto-refresh
    startBtn.addEventListener("click", () => {
        const interval = parseInt(intervalSelect.value);
        chrome.runtime.sendMessage({ action: "start_refresh", interval: interval }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error starting refresh:", chrome.runtime.lastError);
            } else {
                updateUI({ isRunning: true, timeLeft: interval, refreshInterval: interval });
            }
        });
    });

    // Stop auto-refresh
    stopBtn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "stop_refresh" }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error stopping refresh:", chrome.runtime.lastError);
            }
            updateUI({ isRunning: false });
        });
    });

    // Periodically update the timer display
    setInterval(() => {
        chrome.runtime.sendMessage({ action: "get_status" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error getting status:", chrome.runtime.lastError);
                // Assume it's stopped if the background script is unreachable
                updateUI({ isRunning: false });
            } else if (response) {
                updateUI(response);
            }
        });
    }, 1000);
});