class KeyInput {
  constructor() {
    this.keys = {};
    document.addEventListener('keydown', (e) => {
      this.keys[e.keyCode] = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.keyCode] = false;
    });
  }

  getKey(key) {
    return this.keys[key];
  }
}

let nowPlaying = false;
window.onload = gamePlay;
const ENEMY_SAFE_AREA = 100;
const SPAWN_COLOR = '#0000AA';
const ENEMY_COLOR = '#00AA00';
const PLAYER_COLOR = '#AA0000';
const BLUR_WIDTH = 4;

function gamePlay() {
  if (nowPlaying) return;
  nowPlaying = true;

  getRankingScoreAll();

  const key = new KeyInput();
  
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  
  const player = {
    x: canvas.width * .5,
    y: canvas.height * .5,
    size: 3,
    speed: 4,
    color: PLAYER_COLOR
  }

  const moveBorder = {
    left: canvas.width * .25,
    top: canvas.height * .25,
    right: canvas.width * .75,
    bottom: canvas.height * .75
  }
  
  const enemies = [];
  const moveSpeed = 1;
  let score = 0;
  let isEnd = false;
  let moveRate = 1;
  let enemyRate = 1;
  let lastFrameTime = Date.now();
  
  function createEnemy() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      dir: Math.random() * Math.PI * 2,
      size: 4,
      speed: 2,
      color: ENEMY_COLOR
    }
  }

  function mainloop() {
    const now = Date.now();
    const delta = (now - lastFrameTime) / (1000 / 60);

    score += (moveSpeed * moveRate * enemyRate) * delta;
    moveRate = 1;

    if (key.getKey(37)) {
      player.x -= player.speed * delta;
      moveRate = 1.5;
    } else if (key.getKey(38)) {
      player.y -= player.speed * delta;
      moveRate = 1.5;
    } else if (key.getKey(39)) {
      player.x += player.speed * delta;
      moveRate = 1.5;
    } else if (key.getKey(40)) {
      player.y += player.speed * delta;
      moveRate = 1.5;
    }

    player.x = Math.max(Math.min(player.x, moveBorder.right), moveBorder.left);
    player.y = Math.max(Math.min(player.y, moveBorder.bottom), moveBorder.top);

    ctx.shadowBlur = 0;
    ctx.shadowColor = '';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.shadowBlur = BLUR_WIDTH;
    ctx.shadowColor = '#333333';
    ctx.strokeStyle = '#333333';
    ctx.strokeRect(moveBorder.left, moveBorder.top, moveBorder.right - moveBorder.left, moveBorder.bottom - moveBorder.top);

    ctx.beginPath();
    ctx.shadowBlur = BLUR_WIDTH;
    ctx.shadowColor = PLAYER_COLOR;
    ctx.fillStyle = player.color;
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    for (const element of enemies) {
      const enemy = element;
      enemy.x += Math.cos(enemy.dir) * (enemy.speed * delta);
      enemy.y += Math.sin(enemy.dir) * (enemy.speed * delta);
      if (enemy.x < 0 || enemy.x > canvas.width) {
        enemy.dir = Math.PI - enemy.dir;
      }
      if (enemy.y < 0 || enemy.y > canvas.height) {
        enemy.dir = -enemy.dir;
      }

      ctx.beginPath();
      ctx.shadowBlur = 4;
      ctx.shadowColor = ENEMY_COLOR;
      ctx.fillStyle = enemy.color;
      ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < player.size + enemy.size) {
        isEnd = true;
      }
    }

    if (isEnd) {
      nowPlaying = false;
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#EEEEEE';
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      player.color = 'red';
      ctx.font = '48px メイリオ';
      ctx.fillStyle = 'red';
      ctx.textAlign = 'center';
      ctx.fillText('ゲームオーバー', canvas.width * .5, canvas.height * .5);

      setTimeout(() => {
        const name = prompt('ランキングに登録されます。名前を入力してください。');
        if (name) registRankingScore(name, score);
      }, 2000);
      return;
    } else {
      const scoreTextElement = document.getElementById('score-text');
      scoreTextElement.innerText = `${~~score}`;
      requestAnimationFrame(mainloop);
    }
    lastFrameTime = Date.now();
  }
  

  setInterval(() => {
    enemySpawn();
    enemyRate += 0.1;
  }, 500);

  function enemySpawn() {
    const enemy = createEnemy();
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > player.size * ENEMY_SAFE_AREA) {
      enemies.push(enemy);
    } else {
     enemySpawn(); 
    }
  }
  mainloop();
}

function getRankingScoreAll() {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'http://localhost:8080/scoreAll');
  xhr.send();
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    const response = JSON.parse(xhr.responseText);
    const result = response.result;
    const rankingElement = document.getElementById('ranking');
    rankingElement.innerHTML = '';
    for (const element of result) {
      const score = element;
      const liElement = document.createElement('div');
      liElement.innerText = `${score.name}: ${score.score}`;
      rankingElement.appendChild(liElement);
    }
  }
}

function registRankingScore(name, score) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://localhost:8080/score');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify({
    name: name,
    score: score
  }));
}