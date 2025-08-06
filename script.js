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
  if (window.DeviceMotionEvent) {
    window.addEventListener("devicemotion", (event) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      const totalAccel = Math.sqrt(
        acc.x ** 2 + acc.y ** 2 + acc.z ** 2
      ).toFixed(2);

      vibrationDisplay.textContent = ` ${totalAccel} m/s²`;

      if (totalAccel > 15) {
        addToLog(`⚠️ High vibration: ${totalAccel} m/s²`);
      }
    });
  } else {
    vibrationDisplay.textContent = "Not supported";
    console.warn("Accelerometer not supported on this device.");
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
