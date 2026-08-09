(function () {
  "use strict";

  const canvas = document.getElementById("ping-canvas");
  const context = canvas.getContext("2d", { alpha: false });
  const overlay = document.getElementById("ping-overlay");
  const message = document.getElementById("ping-message");
  const startButton = document.getElementById("ping-start");
  const pauseButton = document.getElementById("ping-pause");
  const upButton = document.getElementById("ping-up");
  const downButton = document.getElementById("ping-down");
  const status = document.getElementById("ping-status");

  const world = {
    width: canvas.width,
    height: canvas.height,
    winningScore: 7,
    running: false,
    paused: false,
    ended: false,
    lastTime: 0,
    playerScore: 0,
    computerScore: 0,
    keys: { up: false, down: false },
    player: { x: 34, y: 175, width: 14, height: 100, speed: 390 },
    computer: { x: 752, y: 175, width: 14, height: 100, speed: 295 },
    ball: { x: 400, y: 225, size: 14, vx: 300, vy: 90 }
  };

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function updateStatus() {
    status.textContent = `Joueur ${world.playerScore} — Ordinateur ${world.computerScore}`;
  }

  function resetRound(direction) {
    world.player.y = (world.height - world.player.height) / 2;
    world.computer.y = (world.height - world.computer.height) / 2;
    world.ball.x = world.width / 2;
    world.ball.y = world.height / 2;
    const angle = (Math.random() * .75 - .375);
    const speed = 305;
    world.ball.vx = Math.cos(angle) * speed * direction;
    world.ball.vy = Math.sin(angle) * speed;
  }

  function startGame() {
    if (world.ended) {
      world.playerScore = 0;
      world.computerScore = 0;
      world.ended = false;
      resetRound(Math.random() > .5 ? 1 : -1);
      updateStatus();
    }

    world.running = true;
    world.paused = false;
    overlay.hidden = true;
    pauseButton.textContent = "Pause";
    pauseButton.setAttribute("aria-pressed", "false");
    canvas.focus();
  }

  function showOverlay(text, buttonLabel) {
    message.textContent = text;
    startButton.textContent = buttonLabel;
    overlay.hidden = false;
  }

  function togglePause() {
    if (!world.running || world.ended) return;
    world.paused = !world.paused;
    pauseButton.textContent = world.paused ? "Reprendre" : "Pause";
    pauseButton.setAttribute("aria-pressed", String(world.paused));
    if (world.paused) {
      showOverlay("PAUSE", "Reprendre");
    } else {
      overlay.hidden = true;
      canvas.focus();
    }
  }

  function intersects(paddle) {
    const ballLeft = world.ball.x - world.ball.size / 2;
    const ballRight = world.ball.x + world.ball.size / 2;
    const ballTop = world.ball.y - world.ball.size / 2;
    const ballBottom = world.ball.y + world.ball.size / 2;
    return ballRight >= paddle.x && ballLeft <= paddle.x + paddle.width && ballBottom >= paddle.y && ballTop <= paddle.y + paddle.height;
  }

  function bounceFrom(paddle, direction) {
    const relative = clamp((world.ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2), -1, 1);
    const currentSpeed = Math.min(590, Math.hypot(world.ball.vx, world.ball.vy) + 22);
    const angle = relative * .82;
    world.ball.vx = Math.cos(angle) * currentSpeed * direction;
    world.ball.vy = Math.sin(angle) * currentSpeed;
    world.ball.x = direction > 0 ? paddle.x + paddle.width + world.ball.size / 2 : paddle.x - world.ball.size / 2;
  }

  function scorePoint(playerWon) {
    if (playerWon) {
      world.playerScore += 1;
    } else {
      world.computerScore += 1;
    }
    updateStatus();

    if (world.playerScore >= world.winningScore || world.computerScore >= world.winningScore) {
      world.ended = true;
      world.running = false;
      showOverlay(world.playerScore > world.computerScore ? "VICTOIRE !" : "L'ORDINATEUR GAGNE", "Rejouer");
      return;
    }

    resetRound(playerWon ? -1 : 1);
  }

  function update(delta) {
    if (world.keys.up) world.player.y -= world.player.speed * delta;
    if (world.keys.down) world.player.y += world.player.speed * delta;
    world.player.y = clamp(world.player.y, 12, world.height - world.player.height - 12);

    const computerCenter = world.computer.y + world.computer.height / 2;
    const target = world.ball.y + world.ball.vy * .06;
    const deadZone = 13;
    if (target < computerCenter - deadZone) world.computer.y -= world.computer.speed * delta;
    if (target > computerCenter + deadZone) world.computer.y += world.computer.speed * delta;
    world.computer.y = clamp(world.computer.y, 12, world.height - world.computer.height - 12);

    world.ball.x += world.ball.vx * delta;
    world.ball.y += world.ball.vy * delta;

    if (world.ball.y - world.ball.size / 2 <= 9 && world.ball.vy < 0) {
      world.ball.y = 9 + world.ball.size / 2;
      world.ball.vy *= -1;
    }
    if (world.ball.y + world.ball.size / 2 >= world.height - 9 && world.ball.vy > 0) {
      world.ball.y = world.height - 9 - world.ball.size / 2;
      world.ball.vy *= -1;
    }

    if (world.ball.vx < 0 && intersects(world.player)) bounceFrom(world.player, 1);
    if (world.ball.vx > 0 && intersects(world.computer)) bounceFrom(world.computer, -1);

    if (world.ball.x < -25) scorePoint(false);
    if (world.ball.x > world.width + 25) scorePoint(true);
  }

  function drawNet() {
    context.fillStyle = "#426f49";
    for (let y = 14; y < world.height - 14; y += 28) {
      context.fillRect(world.width / 2 - 2, y, 4, 15);
    }
  }

  function drawScore() {
    context.fillStyle = "#7cff63";
    context.font = "bold 44px 'Courier New', monospace";
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(String(world.playerScore), world.width / 2 - 70, 22);
    context.fillText(String(world.computerScore), world.width / 2 + 70, 22);
  }

  function draw() {
    context.fillStyle = "#030807";
    context.fillRect(0, 0, world.width, world.height);
    context.strokeStyle = "#315a39";
    context.lineWidth = 4;
    context.strokeRect(8, 8, world.width - 16, world.height - 16);
    drawNet();
    drawScore();

    context.fillStyle = "#e9ffe7";
    context.fillRect(world.player.x, world.player.y, world.player.width, world.player.height);
    context.fillRect(world.computer.x, world.computer.y, world.computer.width, world.computer.height);

    context.fillStyle = "#7cff63";
    const half = world.ball.size / 2;
    context.fillRect(Math.round(world.ball.x - half), Math.round(world.ball.y - half), world.ball.size, world.ball.size);
  }

  function frame(time) {
    const delta = Math.min(.035, Math.max(0, (time - world.lastTime) / 1000));
    world.lastTime = time;
    if (world.running && !world.paused && !world.ended) update(delta);
    draw();
    window.requestAnimationFrame(frame);
  }

  function setDirection(direction, pressed) {
    world.keys[direction] = pressed;
  }

  function bindHoldButton(button, direction) {
    const press = (event) => {
      event.preventDefault();
      setDirection(direction, true);
    };
    const release = (event) => {
      event.preventDefault();
      setDirection(direction, false);
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "z", "s", " "].includes(key)) event.preventDefault();
    if (key === "arrowup" || key === "z") setDirection("up", true);
    if (key === "arrowdown" || key === "s") setDirection("down", true);
    if (key === " " && !event.repeat) togglePause();
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key === "arrowup" || key === "z") setDirection("up", false);
    if (key === "arrowdown" || key === "s") setDirection("down", false);
  });

  window.addEventListener("blur", () => {
    world.keys.up = false;
    world.keys.down = false;
    if (world.running && !world.paused && !world.ended) togglePause();
  });

  startButton.addEventListener("click", () => {
    if (world.paused) {
      world.paused = false;
      overlay.hidden = true;
      pauseButton.textContent = "Pause";
      pauseButton.setAttribute("aria-pressed", "false");
      canvas.focus();
      return;
    }
    startGame();
  });
  pauseButton.addEventListener("click", togglePause);
  bindHoldButton(upButton, "up");
  bindHoldButton(downButton, "down");

  resetRound(Math.random() > .5 ? 1 : -1);
  updateStatus();
  draw();
  window.requestAnimationFrame(frame);
}());
