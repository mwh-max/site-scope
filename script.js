const noiseDisplay = document.getElementById("noiseLevel");
const vibrationDisplay = document.getElementById("vibrationLevel");
const logList = document.getElementById("logList");
const exportBtn = document.getElementById("exportBtn");

let audioContext;
let micStream;

function rmsToDb(rms) {
  return Math.round(20 * Math.log10(rms));
}

async function startNoiseMonitoring() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    micStream = audioContext.createMediaStreamSource(stream);

    const analyser = audioContext.createAnalyser();
    const dataArray = new Uint8Array(analyser.fftSize);
    micStream.connect(analyser);

    function updateVolume() {
      analyser.getByteTimeDomainData(dataArray);

      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);
      const db = rmsToDb(rms);

      if (db > -Infinity) {
        noiseDisplay.textContent = db + " dB";
        if (db > 85) {
          addToLog(`⚠️ High noise: ${db} dB`);
        }
      }

      requestAnimationFrame(updateVolume);
    }

    updateVolume();
  } catch (err) {
    noiseDisplay.textContent = "Mic access denied";
    console.error("Microphone error:", err);
  }
}

function startVibrationMonitoring() {
  vibrationDisplay.textContent = "-- m/s²";
  if (window.DeviceMotionEvent) {
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      // iOS requires permission
      DeviceMotionEvent.requestPermission()
        .then((permissionState) => {
          if (permissionState === "granted") {
            window.addEventListener("devicemotion", handleMotion);
          } else {
            vibrationDisplay.textContent = "Permission denied";
          }
        })
        .catch((err) => {
          console.error("Permission error:", err);
          vibrationDisplay.textContent = "Permission error";
        });
    } else {
      // Android / desktop browsers
      window.addEventListener("devicemotion", handleMotion);
    }
  } else {
    vibrationDisplay.textContent = "Not supported";
    console.warn("Accelerometer not supported on this device.");
  }
}

let lastVibrationLogTime = 0;

function handleMotion(event) {
  try {
    const acc = event.accelerationIncludingGravity;

    // Check for undefined or null
    if (!acc || acc.x === null || acc.y === null || acc.z === null) {
      vibrationDisplay.textContent = "Waiting for data...";
      return;
    }

    // Calculate total acceleration
    const totalAccel = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

    // Check for invalid math result
    if (isNaN(totalAccel)) {
      vibrationDisplay.textContent = "Invalid sensor data";
      return;
    }

    const formattedAccel = totalAccel.toFixed(2);
    vibrationDisplay.textContent = `${formattedAccel} m/s²`;

    // Debounce log entries to avoid spam
    const now = Date.now();
    if (totalAccel > 15 && now - lastVibrationLogTime > 3000) {
      addToLog(`⚠️ High vibration: ${formattedAccel} m/s²`);
      lastVibrationLogTime = now;
    }
  } catch (err) {
    console.error("Vibration error:", err);
    vibrationDisplay.textContent = "Sensor error";
  }
}

function addToLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = `[${timestamp}] ${message}`;

  const li = document.createElement("li");
  li.textContent = entry;
  logList.prepend(li);

  const logs = JSON.parse(localStorage.getItem("sitescopeLogs")) || [];
  logs.unshift(entry);
  localStorage.setItem("sitescopeLogs", JSON.stringify(logs));
}

function restoreLogs() {
  const logs = JSON.parse(localStorage.getItem("sitescopeLogs")) || [];
  logs.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry;
    logList.appendChild(li);
  });
}

function updateRuntime() {
  const elapsedMs = Date.now() - startTime;
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  document.getElementById(
    "runtime"
  ).textContent = `Monitoring for: ${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;
  setTimeout(updateRuntime, 1000);
}

function filterLogs(type) {
  const logItems = document.querySelectorAll("#logList li");
  logItems.forEach((item) => {
    const text = item.textContent;
    if (type === "all") {
      item.style.display = "list-item";
    } else if (type === "Noise") {
      item.style.display = text.includes("noise") ? "list-item" : "none";
    } else if (type === "Vibration") {
      item.style.display = text.includes("vibration") ? "list-item" : "none";
    }
  });
}

exportBtn.addEventListener("click", () => {
  const logItems = document.querySelectorAll("#logList li");
  if (logItems.length === 0) {
    alert("No log data to export.");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,Timestamp,Event\n";

  logItems.forEach((item) => {
    const [time, ...message] = item.textContent.split("] ");
    csvContent += `"${time.replace("[", "")}","${message.join("")}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `sitescope_log_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

let startTime = Date.now();

startNoiseMonitoring();
startVibrationMonitoring();
restoreLogs();
updateRuntime();
