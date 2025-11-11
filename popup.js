document.addEventListener("DOMContentLoaded", function () {
    const startBtn = document.getElementById("start");
    const stopBtn = document.getElementById("stop");
    const intervalSelect = document.getElementById("interval");
    const timerDisplay = document.getElementById("timerDisplay");
    const customIntervalGroup = document.getElementById("custom-interval-group");
    const customMinutesInput = document.getElementById("custom-minutes");
    const customSecondsInput = document.getElementById("custom-seconds");

    // Show/hide custom interval inputs
    intervalSelect.addEventListener("change", () => {
        if (intervalSelect.value === "custom") {
            customIntervalGroup.style.display = "block";
        } else {
            customIntervalGroup.style.display = "none";
        }
    });

    // Function to update the UI based on the background state
    function updateUI(status) {
        if (status.isRunning) {
            const minutes = Math.floor(status.timeLeft / 60);
            const seconds = status.timeLeft % 60;
            timerDisplay.textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
            timerDisplay.classList.remove("stopped");
            startBtn.disabled = true;
            stopBtn.disabled = false;

            // Set the dropdown or custom fields based on the running interval
            const predefined = ["300", "600", "1200", "1800"];
            if (predefined.includes(status.refreshInterval.toString())) {
                intervalSelect.value = status.refreshInterval;
                customIntervalGroup.style.display = "none";
            } else {
                intervalSelect.value = "custom";
                customIntervalGroup.style.display = "block";
                customMinutesInput.value = Math.floor(status.refreshInterval / 60);
                customSecondsInput.value = status.refreshInterval % 60;
            }
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
        } else if (response) {
            updateUI(response);
        }
    });

    // Start auto-refresh
    startBtn.addEventListener("click", () => {
        let interval = 0;
        if (intervalSelect.value === "custom") {
            const minutes = parseInt(customMinutesInput.value, 10) || 0;
            const seconds = parseInt(customSecondsInput.value, 10) || 0;
            interval = (minutes * 60) + seconds;
            
            if (interval < 1) { // Minimum 1 second interval
                alert("The minimum refresh interval is 1 second.");
                return;
            }
        } else {
            interval = parseInt(intervalSelect.value, 10);
        }

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
                // Assume it's stopped if the background script is unreachable
                updateUI({ isRunning: false });
            } else if (response) {
                updateUI(response);
            }
        });
    }, 1000);
});