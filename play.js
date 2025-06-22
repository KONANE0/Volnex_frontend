const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const userId = window.userId || localStorage.getItem("userId");
window.userId = userId;

let rocketImg = new Image();
rocketImg.src = "assets/rocket.png";

let coinImg = new Image();
coinImg.src = "assets/coin.png";

let planetImgs = [];
for (let i = 1; i <= 10; i++) {
  let img = new Image();
  img.src = `assets/planet${i}.png`;
  planetImgs.push(img);
}

let rocket = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 80,
  width: 50,
  height: 50,
  speed: 6,
};

let coins = [];
let planets = [];
let score = 0;
let earnedPoints = 0;
let basePoints = 0;
let hits = 0;
let difficulty = 1;
let frameCount = 0;
let gameOver = false;
let animationId;

// جلب النقاط من السيرفر (تم التعديل)
if (userId) {
  fetch(`https://volnex-backend--huissh04.repl.co/getPoints?uid=${userId}`)
    .then((res) => res.json())
    .then((data) => {
      basePoints = data.points || 0;
      score = basePoints;
      updateScore();
      animationId = requestAnimationFrame(gameLoop);
    })
    .catch((err) => {
      console.error("فشل تحميل النقاط:", err.message);
      animationId = requestAnimationFrame(gameLoop);
    });
} else {
  animationId = requestAnimationFrame(gameLoop);
}

function drawRocket() {
  ctx.drawImage(rocketImg, rocket.x, rocket.y, rocket.width, rocket.height);
}

function drawCircleImage(img, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

function drawItems() {
  coins.forEach((coin) => drawCircleImage(coinImg, coin.x, coin.y, coin.size));
  planets.forEach((planet) =>
    drawCircleImage(planetImgs[planet.imgIndex], planet.x, planet.y, planet.size)
  );
}

function moveItems() {
  if (gameOver) return;
  coins.forEach((coin) => (coin.y += coin.speed));
  planets.forEach((planet) => (planet.y += planet.speed));
}

function detectCollisions() {
  if (gameOver) return;

  coins = coins.filter((coin) => {
    if (
      coin.x < rocket.x + rocket.width &&
      coin.x + coin.size > rocket.x &&
      coin.y < rocket.y + rocket.height &&
      coin.y + coin.size > rocket.y
    ) {
      earnedPoints += 50;
      score += 50;
      updateScore();
      return false;
    }
    return true;
  });

  planets = planets.filter((planet) => {
    if (
      planet.x < rocket.x + rocket.width &&
      planet.x + planet.size > rocket.x &&
      planet.y < rocket.y + rocket.height &&
      planet.y + planet.size > rocket.y
    ) {
      hits++;
      if (hits === 1) {
        earnedPoints = Math.floor(earnedPoints / 2);
        score = basePoints + earnedPoints;
        flashScore();
        updateScore();
        return false;
      } else {
        endGame();
        return false;
      }
    }
    return true;
  });
}

function updateScore() {
  document.getElementById("score").textContent = score;
}

function flashScore() {
  const el = document.getElementById("score");
  el.style.color = "red";
  setTimeout(() => (el.style.color = "white"), 300);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animationId);

  // تحديث النقاط على السيرفر (تم التعديل)
  if (window.userId && earnedPoints > 0) {
    fetch(`https://volnex-backend--huissh04.repl.co/updatePoints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: window.userId,
        points: basePoints + earnedPoints,
      }),
    })
      .then((res) => res.json())
      .then((data) => console.log("تم تحديث النقاط:", data))
      .catch((err) => console.error("خطأ في التحديث:", err.message));
  }

  document.body.innerHTML += `
    <div class="game-over">
      <h2>انتهت اللعبة</h2>
      <p>نقاطك: ${score}</p>
      <button onclick="location.reload()">اللعب مرة أخرى</button>
      <button onclick="location.href='home.html'">العودة للرئيسية</button>
    </div>
  `;
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRocket();
  drawItems();
  moveItems();
  detectCollisions();

  if (!gameOver && frameCount % 60 === 0) {
    spawnItems();
    if (difficulty < 7) difficulty += 0.05;
  }

  frameCount++;
  animationId = requestAnimationFrame(gameLoop);
}

function spawnItems() {
  if (gameOver) return;

  const coinCount = Math.floor(Math.random() * 2) + 1;
  const planetCount = Math.floor(Math.random() * (1 + Math.floor(difficulty / 2))) + 1;

  const planetSpeed = 2 + difficulty;
  const coinSpeed = planetSpeed / 2;

  for (let i = 0; i < coinCount; i++) {
    coins.push({
      x: Math.random() * (canvas.width - 30),
      y: -30,
      size: 30,
      speed: coinSpeed,
    });
  }

  for (let i = 0; i < planetCount; i++) {
    planets.push({
      x: Math.random() * (canvas.width - 40),
      y: -40,
      size: 40,
      speed: planetSpeed,
      imgIndex: Math.floor(Math.random() * planetImgs.length),
    });
  }
}

// السحب باللمس
let dragging = false;

canvas.addEventListener("touchstart", function (e) {
  if (gameOver) return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (
    x >= rocket.x &&
    x <= rocket.x + rocket.width &&
    y >= rocket.y &&
    y <= rocket.y + rocket.height
  ) {
    dragging = true;
  }
});

canvas.addEventListener("touchmove", function (e) {
  if (gameOver || !dragging) return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  rocket.x = touch.clientX - rect.left - rocket.width / 2;

  if (rocket.x < 0) rocket.x = 0;
  if (rocket.x + rocket.width > canvas.width) rocket.x = canvas.width - rocket.width;
});

canvas.addEventListener("touchend", function () {
  dragging = false;
});