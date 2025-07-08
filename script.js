window.addEventListener("DOMContentLoaded", () => {
// === Screen Switching ===

// === Audio Elements ===
const clockTickSound = new Audio("assets/ClockTickingSound.wav");
const dingSound = new Audio("assets/DingSound.wav");
const clappingSound = new Audio("assets/AudienceClapping.wav");
const flipSound = new Audio("assets/FlipCardSound.wav");


clockTickSound.loop = true;

let soundEnabled = true;

const soundCheckbox = document.getElementById("check-5");

soundCheckbox.addEventListener("change", () => {
  soundEnabled = soundCheckbox.checked;

  if (!soundEnabled) {
    clockTickSound.pause();
    clockTickSound.currentTime = 0;
  }
});




  const playNowBtn = document.getElementById("play-now-btn");
  const greetingScreen = document.getElementById("greeting-screen");
  const setupScreen = document.getElementById("setup-screen");
  const backBtn = document.getElementById("back-btn");
  const gameScreen = document.getElementById("game-screen");

  playNowBtn.addEventListener("click", () => {
    greetingScreen.style.display = "none";
    setupScreen.style.display = "flex";
    document.body.style.overflow = "hidden";
  });

  backBtn.addEventListener("click", () => {
    setupScreen.style.display = "none";
    greetingScreen.style.display = "flex";
  });

  // === Game State ===
  let gameData = {
    teamAName: "Team A",
    teamBName: "Team B",
    teamAScore: 0,
    teamBScore: 0,
    winningScore: 30,
    currentTeam: "A",
    roundCount: 0,
    selectedModules: [],
    conceptsByModule: {},
    teamThemes: {},
    usedConcepts: {
      A: [],
      B: []
    }
  };


  let currentRoundConcepts = [];

  // 🎨 Theme colors (side and center pairs)
const teamColorPairs = [
  { side: "#f94144", center: "#ffccd5" }, // Red
  { side: "#4a90e2", center: "#b3d4fc" }, // Blue
  { side: "#43aa8b", center: "#b8f3e6" }, // Green
  { side: "#f8961e", center: "#ffe4c2" }  // Orange
];

// Or use this instead if you want to calculate center dynamically
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return `rgb(${Math.min(R,255)}, ${Math.min(G,255)}, ${Math.min(B,255)})`;
}


  const colorThemes = ["green", "purple", "blue", "orange"];

  // === DOM Elements for Game Screen ===
  const startRoundBtn = document.getElementById("start-round-btn");
  const cardContainer = document.getElementById("card-container");
  const conceptList = document.getElementById("concept-list");
  const conceptLogContainer = document.getElementById("concept-log");

  const teamANameLabel = document.getElementById("teamA-name");
  const teamBNameLabel = document.getElementById("teamB-name");
  const activeTeamLabel = document.getElementById("active-team");
  const teamABar = document.getElementById("teamA-bar");
  const teamBBar = document.getElementById("teamB-bar");
  const teamAPoints = document.getElementById("teamA-points");
  const teamBPoints = document.getElementById("teamB-points");

  const roundResult = document.getElementById("round-result");
  const roundScoreInput = document.getElementById("round-score");
  const submitScoreBtn = document.getElementById("submit-score-btn");
  const quitGameBtn = document.getElementById("quit-game-btn");

  const timerDisplay = document.getElementById("timer");
  const currentTeamLabel = document.getElementById("current-team-label");
  const finishRoundBtn = document.getElementById("finish-round-btn");
  const toggleLogBtn = document.getElementById("toggle-log-btn");



  let countdownInterval;


  // === Helper Functions ===
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function assignThemes() {
    const shuffled = shuffleArray([...teamColorPairs]);

    const teamAColor = shuffled[0].side;
    const teamBColor = shuffled[1].side;

    gameData.teamThemes = {
      A: {
        side: teamAColor,
        center: lightenColor(teamAColor, 35)
      },
      B: {
        side: teamBColor,
        center: lightenColor(teamBColor, 35)
      }
    };
  }

  function applyCardTheme(team) {
  const theme = gameData.teamThemes[team];
  const cardFront = document.querySelector(".card-front");
  const sideLabels = cardFront.querySelectorAll(".side-label");
  const center = cardFront.querySelector(".concepts-area");

  if (!theme || !cardFront || sideLabels.length < 2 || !center) return;

  // Side bars
  sideLabels.forEach(label => {
    label.style.backgroundColor = theme.side;
    label.style.color = "#fff";
  });

  // Center panel
  center.style.backgroundColor = theme.center;
  center.style.color = "#222";
}



  function applyCardTheme(team) {
  const theme = gameData.teamThemes[team];
  const cardFront = document.querySelector(".card-front");
  const sideLabels = cardFront.querySelectorAll(".side-label");
  const center = cardFront.querySelector(".concepts-area");

  if (theme && cardFront && center && sideLabels.length === 2) {
    // Apply side color
    sideLabels.forEach(label => {
      label.style.backgroundColor = theme.side;
      label.style.color = "white"; // Optional: ensure contrast
    });

    // Apply center background
    center.style.backgroundColor = theme.center;
    center.style.color = "#222"; // Optional: readable text
  }
}


  async function loadConcepts() {
    try {
      const response = await fetch("assets/concepts.json");
      const allConcepts = await response.json();

      gameData.conceptsByModule = {};

      allConcepts.forEach(item => {
        if (gameData.selectedModules.includes(item.module)) {
          if (!gameData.conceptsByModule[item.module]) {
            gameData.conceptsByModule[item.module] = [];
          }
          gameData.conceptsByModule[item.module].push(item.concept);
        }
      });
    } catch (err) {
      console.error("Failed to load concepts:", err);
      showNotification("Something went wrong loading the concepts. Try again.", "error");
    }
  }

  // === Start Game from Setup Screen ===
  document.getElementById("start-game-btn").addEventListener("click", async () => {
    const teamAInput = document.getElementById("teamA").value.trim();
    const teamBInput = document.getElementById("teamB").value.trim();
    const winningScore = parseInt(document.getElementById("winningScore").value) || 30;


    const selectedCheckboxes = document.querySelectorAll("input[name='module']:checked");
    const selectedModules = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (selectedModules.length === 0) {
      showNotification("Select at least one module.", "warning");
      return;
    }

    // Save setup data
    gameData.teamAName = teamAInput || "Team A";
    gameData.teamBName = teamBInput || "Team B";
    gameData.selectedModules = selectedModules;
    gameData.winningScore = winningScore;

    assignThemes();

    // Update scoreboard
    teamANameLabel.textContent = gameData.teamAName;
    teamBNameLabel.textContent = gameData.teamBName;
    activeTeamLabel.textContent = `${gameData.teamAName}'s Turn`;

    // Update concept log headers
    document.getElementById("teamA-log-header").textContent = gameData.teamAName;
    document.getElementById("teamB-log-header").textContent = gameData.teamBName;


    await loadConcepts();

    // Transition to game screen
    setupScreen.style.display = "none";
    gameScreen.style.display = "block";
    document.body.style.overflow = "hidden";
  });


  // === Start Game from game Screen ===
  startRoundBtn.addEventListener("click", () => {
    const isVisible = conceptLogContainer.classList.contains("show");

    if (isVisible) {
    conceptLogContainer.classList.remove("show");
    toggleLogBtn.textContent = "📚 View Used Concepts";}
    
    finishRoundBtn.style.display = "inline-block";
    startRoundBtn.style.display = "none";

    // start timer
    startCountdown(30);

    // Flip the card
    cardContainer.classList.add("flipped");

    if (soundEnabled) {
      flipSound.play().catch(err => {
        console.warn("Flip sound play failed:", err);
      });
    }


    applyCardTheme(gameData.currentTeam);

    // Hide old concepts
    conceptList.innerHTML = "";

    // Select 5 random concepts
    const selectedConcepts = getFiveRandomConcepts();
    selectedConcepts.forEach(concept => {
      const li = document.createElement("li");
      li.textContent = concept;
      conceptList.appendChild(li);
    });
  });

  function getAllUsedConcepts() {
  return [...gameData.usedConcepts.A, ...gameData.usedConcepts.B];
}


  /// === Get 5 random concepts ===
  function getFiveRandomConcepts() {
  let pool = [];

  gameData.selectedModules.forEach(module => {
    const available = gameData.conceptsByModule[module] || [];
    available.forEach(concept => {
      if (!getAllUsedConcepts().includes(concept)) {
        pool.push(concept);
      }
    });
  });

  // If not enough fresh concepts, allow reuse
  if (pool.length < 5) {
    pool = [];
    gameData.selectedModules.forEach(module => {
      const available = gameData.conceptsByModule[module] || [];
      pool.push(...available);
    });
  }

  const selected = shuffleArray(pool).slice(0, 5);
  // gameData.usedConcepts[gameData.currentTeam].push(...selected);
  currentRoundConcepts = selected;
  return selected;
}

function startCountdown(seconds) {
  let remaining = seconds;
  timerDisplay.textContent = `${remaining}s`;

  clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    remaining--;
    timerDisplay.textContent = `${remaining}s`;

    // Start ticking at 5s
    if (remaining === 5 && soundEnabled) {
      clockTickSound.play().catch(err => {
        console.warn("Ticking sound play failed:", err);
      });
    }


    if (remaining <= 0) {
      clearInterval(countdownInterval);

      if (soundEnabled) {
        clockTickSound.pause();
        clockTickSound.currentTime = 0;
        dingSound.play();
      }

      finishRoundBtn.style.display = "none";
      timerDisplay.textContent = "⏰ Time's up!";
      roundResult.style.display = "block";

      currentTeamLabel.textContent = gameData.currentTeam === "A"
        ? gameData.teamAName
        : gameData.teamBName;
    }
  }, 1000);
}


submitScoreBtn.addEventListener("click", () => {
  const score = parseInt(roundScoreInput.value);
  if (isNaN(score) || score < 0 || score > 50) {
    showNotification("Please enter a valid score between 0 and 5.", "error");
    return;
  }

  // === Update score ===
  if (gameData.currentTeam === "A") {
    gameData.teamAScore += score;
    gameData.usedConcepts.A.push(...currentRoundConcepts);
    teamAPoints.textContent = `${gameData.teamAScore} pts`;
    updateProgressBar("A");
  } else {
    gameData.teamBScore += score;
    gameData.usedConcepts.B.push(...currentRoundConcepts);
    teamBPoints.textContent = `${gameData.teamBScore} pts`;
    updateProgressBar("B");
  }

  // === Check for winner ===
  if (gameData.teamAScore >= gameData.winningScore || gameData.teamBScore >= gameData.winningScore) {
    declareWinner();
    return;
  }


  renderUsedConceptsLog();


  // Switch team
  gameData.currentTeam = gameData.currentTeam === "A" ? "B" : "A";
  activeTeamLabel.textContent = `${gameData.currentTeam === "A" ? gameData.teamAName : gameData.teamBName}'s Turn`;

  // Reset UI
  roundScoreInput.value = "";
  roundResult.style.display = "none";
  cardContainer.classList.remove("flipped");
  timerDisplay.textContent = `${30}s`;
  startRoundBtn.style.display = "inline-block";
  finishRoundBtn.style.display = "none";
});

function renderUsedConceptsLog() {
  const teamALog = document.getElementById("teamA-concepts-log");
  const teamBLog = document.getElementById("teamB-concepts-log");
  const teamAHeader = document.getElementById("teamA-log-header");
  const teamBHeader = document.getElementById("teamB-log-header");

  // Clear previous logs
  teamALog.innerHTML = "";
  teamBLog.innerHTML = "";

  // Update headers
  teamAHeader.textContent = gameData.teamAName;
  teamBHeader.textContent = gameData.teamBName;

  // Add concepts for Team A
  gameData.usedConcepts.A.forEach((concept, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${concept}`;
    teamALog.appendChild(li);
  });

  // Add concepts for Team B
  gameData.usedConcepts.B.forEach((concept, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${concept}`;
    teamBLog.appendChild(li);
  });
}


toggleLogBtn.addEventListener("click", () => {
  const isVisible = conceptLogContainer.classList.contains("show");

  if (isVisible) {
    conceptLogContainer.classList.remove("show");
    toggleLogBtn.textContent = "📚 View Used Concepts";
  } else {
    renderUsedConceptsLog();
    conceptLogContainer.classList.add("show");
    toggleLogBtn.textContent = "❌ Hide Used Concepts";
  }


});



finishRoundBtn.addEventListener("click", () => {
  clearInterval(countdownInterval);
  timerDisplay.textContent = "⏱️ Round Ended Early";
  roundResult.style.display = "block";

  currentTeamLabel.textContent = gameData.currentTeam === "A"
    ? gameData.teamAName
    : gameData.teamBName;

  if (soundEnabled) {
    clockTickSound.pause();
    console.log("Round ended early — ticking sound stopped.");
    clockTickSound.currentTime = 0;
    dingSound.play();
  }

  timerDisplay.textContent = "⏱️ Round Ended Early";
  roundResult.style.display = "block";
  currentTeamLabel.textContent = gameData.currentTeam === "A"
    ? gameData.teamAName
    : gameData.teamBName;

  finishRoundBtn.style.display = "none";
});

function updateProgressBar(team) {
  const score = team === "A" ? gameData.teamAScore : gameData.teamBScore;
  const bar = team === "A" ? teamABar : teamBBar;
  const percentage = Math.min(100, (score / gameData.winningScore) * 100);
  bar.style.width = `${percentage}%`;
}

function declareWinner() {
  const winner = gameData.teamAScore >= gameData.winningScore
    ? gameData.teamAName
    : gameData.teamBName;

  showCelebration(winner);
}

function showNotification(message, type = "info", duration = 3000) {
  const notification = document.getElementById("notification");
  const messageBox = document.getElementById("notification-message");

  // Clear any existing type classes
  notification.className = "notification";

  // Add type-specific class
  notification.classList.add(type);
  notification.classList.remove("hidden");
  notification.classList.add("show");

  messageBox.textContent = message;

  setTimeout(() => {
    notification.classList.remove("show");
    notification.classList.add("hidden");
  }, duration);
}

function showCelebration(winningTeamName) {
  const modal = document.getElementById("celebration-modal");

  // Unhide and show modal
  modal.classList.remove("hidden");
  modal.classList.add("show");

  // Update winner message
  document.getElementById("winner-message").textContent = `🎓 ${winningTeamName} has Graduated! 🎓`;

  // Play clapping
  if (soundEnabled) {
    clappingSound.play().catch(err => {
      console.warn("Clapping sound play failed:", err);
    });
  }

  // Fire confetti
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.6 }
  });
}


document.getElementById("play-again-btn").addEventListener("click", () => {
  resetGame(); // Reset everything
  gameScreen.style.display = "none";
  setupScreen.style.display = "flex";
});

document.getElementById("return-lobby-btn").addEventListener("click", () => {
  resetGame(); // Reset everything
  gameScreen.style.display = "none";
  greetingScreen.style.display = "flex";
});

function resetGame() {
  // Reset gameData
  document.getElementById("celebration-modal").classList.remove("show");
  gameData.teamAName = "Team A";
  gameData.teamBName = "Team B";
  gameData.teamAScore = 0;
  gameData.teamBScore = 0;
  gameData.currentTeam = "A";
  gameData.roundCount = 0;
  gameData.usedConcepts = { A: [], B: [] };
  gameData.selectedModules = [];
  gameData.conceptsByModule = {};
  gameData.teamThemes = {};

  // Clear UI
  teamAPoints.textContent = "0 pts";
  teamBPoints.textContent = "0 pts";
  teamABar.style.width = "0%";
  teamBBar.style.width = "0%";
  activeTeamLabel.textContent = "";
  conceptList.innerHTML = "";
  roundResult.style.display = "none";
  roundScoreInput.value = "";
  cardContainer.classList.remove("flipped");
  timerDisplay.textContent = "30s";
  finishRoundBtn.style.display = "none";
  startRoundBtn.style.display = "inline-block";

  // Reset team name input fields (optional)
  document.getElementById("teamA").value = "";
  document.getElementById("teamB").value = "";
  document.getElementById("winningScore").value = "";

  // Uncheck all module checkboxes
  document.querySelectorAll("input[name='module']").forEach(cb => cb.checked = false);

// Reset concept log UI
const conceptLogContainer = document.getElementById("concept-log");
const teamALog = document.getElementById("teamA-concepts-log");
const teamBLog = document.getElementById("teamB-concepts-log");
const toggleLogBtn = document.getElementById("toggle-log-btn");

teamALog.innerHTML = "";
teamBLog.innerHTML = "";

conceptLogContainer.classList.remove("show");
toggleLogBtn.textContent = "📚 View Used Concepts";

}

const quitModal = document.getElementById("quit-modal");
const cancelQuitBtn = document.getElementById("cancel-quit");
const confirmQuitBtn = document.getElementById("confirm-quit");

// Show modal when Quit button is clicked
quitGameBtn.addEventListener("click", () => {
  quitModal.classList.remove("hidden");
});

// Hide modal on cancel
cancelQuitBtn.addEventListener("click", () => {
  quitModal.classList.add("hidden");
});

// Confirm quit
confirmQuitBtn.addEventListener("click", () => {
  resetGame(); // Clear game state
  gameScreen.style.display = "none";
  greetingScreen.style.display = "flex";
  document.body.style.overflow = "";
  quitModal.classList.add("hidden");
});


});
