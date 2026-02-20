// ============================================
// FLAPPY BIRD - ENHANCED VERSION
// ============================================

// Game Constants
const FPS = 60;
const jump_amount = -9;
const max_fall_speed = 8;
const acceleration = 0.6;
const BASE_PIPE_SPEED = -2;

// Level System
const LEVELS = [
  { level: 1, speedMultiplier: 0.8, scoreThreshold: 0, gapSize: 160, name: "Beginner" },
  { level: 2, speedMultiplier: 1.0, scoreThreshold: 50, gapSize: 150, name: "Easy" },
  { level: 3, speedMultiplier: 1.2, scoreThreshold: 100, gapSize: 140, name: "Medium" },
  { level: 4, speedMultiplier: 1.4, scoreThreshold: 150, gapSize: 130, name: "Hard" },
  { level: 5, speedMultiplier: 1.6, scoreThreshold: 200, gapSize: 120, name: "Expert" },
  { level: 6, speedMultiplier: 1.8, scoreThreshold: 250, gapSize: 115, name: "Master" },
  { level: 7, speedMultiplier: 2.0, scoreThreshold: 300, gapSize: 110, name: "Insane" }
];

// Power-up Types
const POWERUP_TYPES = {
  SHIELD: { color: '#00FFFF', duration: 300, chance: 0.08 },
  SLOW_MOTION: { color: '#FF00FF', duration: 200, chance: 0.06 },
  MAGNET: { color: '#FFD700', duration: 250, chance: 0.07 },
  DOUBLE_POINTS: { color: '#00FF00', duration: 200, chance: 0.05 }
};

// Achievements
const ACHIEVEMENTS = [
  { id: 'first_flight', name: 'First Flight', desc: 'Play your first game', unlocked: false },
  { id: 'coin_collector', name: 'Coin Collector', desc: 'Collect 20 coins', unlocked: false, progress: 0, target: 20 },
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Reach level 5', unlocked: false },
  { id: 'survivor', name: 'Survivor', desc: 'Score 100 points', unlocked: false },
  { id: 'master', name: 'Master', desc: 'Score 200 points', unlocked: false },
  { id: 'combo_king', name: 'Combo King', desc: 'Get a 5x combo', unlocked: false },
  { id: 'power_user', name: 'Power User', desc: 'Use 10 power-ups', unlocked: false, progress: 0, target: 10 }
];

// Game Variables
let game_mode = 'prestart';
let time_game_last_running;
let bottom_bar_offset = 0;
let pipes = [];
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let lastPipePassed = null;
let currentLevel = 1;
let pipe_speed = BASE_PIPE_SPEED;
let currentGapSize = 140;
let levelUpAnimation = 0;
let incentives = [];
let powerups = [];
let particles = [];
let clouds = [];
let stars = [];

// Power-up states
let activePowerups = {
  shield: 0,
  slowMotion: 0,
  magnet: 0,
  doublePoints: 0
};

// Combo system
let comboCount = 0;
let comboTimer = 0;
let lastComboTime = 0;

// Statistics
let stats = JSON.parse(localStorage.getItem('gameStats')) || {
  totalGames: 0,
  totalCoins: 0,
  totalDistance: 0,
  totalPipes: 0,
  totalPowerups: 0
};

// Lives system
let lives = 3;
let maxLives = 3;
let invincible = 0;

// Camera shake
let shakeAmount = 0;

// Background time for day/night cycle
let gameTime = 0;

// Pause state
let isPaused = false;

// Bird animation
let birdFrame = 0;
let birdAnimTimer = 0;

// Leaderboard
let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];

// Daily challenge
let dailyChallenge = {
  target: 150,
  completed: false,
  date: new Date().toDateString()
};

// DOM Elements
const myCanvas = document.getElementById('myCanvas');
const ctx = myCanvas.getContext('2d');

// Make canvas responsive
function resizeCanvas() {
  const container = document.querySelector('.game-container');
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    // On mobile, fill the entire viewport
    myCanvas.width = window.innerWidth;
    myCanvas.height = window.innerHeight;
  } else {
    // On desktop, use fixed size with aspect ratio
    const maxWidth = Math.min(window.innerWidth * 0.5, 400);
    const maxHeight = Math.min(window.innerHeight * 0.9, 600);
    
    // Maintain aspect ratio
    const aspectRatio = 2 / 3;
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    myCanvas.width = width;
    myCanvas.height = height;
  }
  
  // Reposition bird if needed
  if (bird) {
    bird.x = myCanvas.width / 3;
    if (game_mode === 'prestart') {
      bird.y = myCanvas.height / 2;
    }
  }
}

// Call on load and resize
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);

// Sound Elements
const flapSound = document.getElementById("flapSound");
const hitSound = document.getElementById("hitSound");
const gameOverSound = document.getElementById("gameOverSound");
const backgroundMusic = document.getElementById("backgroundMusic");
const scoreSound = document.getElementById("scoreSound");

// ============================================
// CLASSES
// ============================================

class MySprite {
  constructor(img_url) {
    this.x = 0;
    this.y = 0;
    this.visible = true;
    this.velocity_x = 0;
    this.velocity_y = 0;
    this.MyImg = new Image();
    this.MyImg.src = img_url || '';
    this.angle = 0;
    this.flipV = false;
    this.flipH = false;
    this.scale = 1;
  }

  Do_Frame_Things() {
    ctx.save();
    ctx.translate(this.x + this.MyImg.width / 2, this.y + this.MyImg.height / 2);
    ctx.rotate((this.angle * Math.PI) / 180);
    if (this.flipV) ctx.scale(this.scale, -this.scale);
    else if (this.flipH) ctx.scale(-this.scale, this.scale);
    else ctx.scale(this.scale, this.scale);
    if (this.visible) {
      ctx.drawImage(this.MyImg, -this.MyImg.width / 2, -this.MyImg.height / 2);
    }
    this.x += this.velocity_x;
    this.y += this.velocity_y;
    ctx.restore();
  }
}

class Particle {
  constructor(x, y, color, size, vx, vy) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.vx = vx;
    this.vy = vy;
    this.life = 1;
    this.decay = 0.02;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2;
    this.life -= this.decay;
    return this.life > 0;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Cloud {
  constructor() {
    this.x = myCanvas.width + Math.random() * 200;
    this.y = Math.random() * myCanvas.height * 0.6;
    this.speed = -0.3 - Math.random() * 0.5;
    this.size = 30 + Math.random() * 40;
    this.opacity = 0.3 + Math.random() * 0.3;
  }

  update() {
    this.x += this.speed;
    if (this.x < -this.size * 2) {
      this.x = myCanvas.width + this.size;
      this.y = Math.random() * myCanvas.height * 0.6;
    }
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.arc(this.x + this.size * 0.7, this.y, this.size * 0.8, 0, Math.PI * 2);
    ctx.arc(this.x + this.size * 1.4, this.y, this.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Star {
  constructor() {
    this.x = Math.random() * myCanvas.width;
    this.y = Math.random() * myCanvas.height * 0.7;
    this.size = 1 + Math.random() * 2;
    this.twinkle = Math.random() * Math.PI * 2;
  }

  update() {
    this.twinkle += 0.05;
  }

  draw() {
    const brightness = 0.5 + Math.sin(this.twinkle) * 0.5;
    ctx.save();
    ctx.globalAlpha = brightness;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ============================================
// GAME ASSETS
// ============================================

const pipe_piece = new Image();
pipe_piece.src = 'http://s2js.com/img/etc/flappypipe.png';

const bottom_bar = new Image();
bottom_bar.src = 'http://s2js.com/img/etc/flappybottom.png';

const coin_img = new Image();
coin_img.src = 'https://i.imgur.com/yqNx0jD.png';

const bird = new MySprite('http://s2js.com/img/etc/flappybird.png');
bird.x = myCanvas.width / 3;
bird.y = myCanvas.height / 2;
bird.scale = 1;

// Initialize
pipe_piece.onload = () => {
  add_all_my_pipes();
  initClouds();
  initStars();
};

function initClouds() {
  for (let i = 0; i < 5; i++) {
    const cloud = new Cloud();
    cloud.x = Math.random() * myCanvas.width;
    clouds.push(cloud);
  }
}

function initStars() {
  for (let i = 0; i < 50; i++) {
    stars.push(new Star());
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function ImagesTouching(a, b) {
  if (!a.visible || !b.visible) return false;
  const padding = 5;
  return !(
    a.x + padding >= b.x + b.MyImg.width - padding ||
    a.x + a.MyImg.width - padding <= b.x + padding ||
    a.y + padding >= b.y + b.MyImg.height - padding ||
    a.y + a.MyImg.height - padding <= b.y + padding
  );
}

function vibrateDevice() {
  if ("vibrate" in navigator) {
    navigator.vibrate(200);
  }
}

function createParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 2 + Math.random() * 3;
    particles.push(new Particle(
      x, y, color, 3 + Math.random() * 3,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    ));
  }
}

function saveToLocalStorage() {
  localStorage.setItem('highScore', highScore);
  localStorage.setItem('gameStats', JSON.stringify(stats));
  localStorage.setItem('achievements', JSON.stringify(ACHIEVEMENTS));
  localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
}

function unlockAchievement(id) {
  const achievement = ACHIEVEMENTS.find(a => a.id === id);
  if (achievement && !achievement.unlocked) {
    achievement.unlocked = true;
    showAchievementNotification(achievement);
    saveToLocalStorage();
  }
}

function showAchievementNotification(achievement) {
  // Visual notification will be shown in display_achievements
  createParticles(myCanvas.width / 2, 100, '#FFD700', 20);
}

function updateAchievements() {
  // First Flight
  if (stats.totalGames > 0) unlockAchievement('first_flight');
  
  // Coin Collector
  const coinAch = ACHIEVEMENTS.find(a => a.id === 'coin_collector');
  if (coinAch) {
    coinAch.progress = stats.totalCoins;
    if (stats.totalCoins >= 20) unlockAchievement('coin_collector');
  }
  
  // Speed Demon
  if (currentLevel >= 5) unlockAchievement('speed_demon');
  
  // Survivor
  if (score >= 100) unlockAchievement('survivor');
  
  // Master
  if (score >= 200) unlockAchievement('master');
  
  // Combo King
  if (comboCount >= 5) unlockAchievement('combo_king');
  
  // Power User
  const powerAch = ACHIEVEMENTS.find(a => a.id === 'power_user');
  if (powerAch) {
    powerAch.progress = stats.totalPowerups;
    if (stats.totalPowerups >= 10) unlockAchievement('power_user');
  }
}

function addToLeaderboard(playerScore) {
  const entry = {
    score: playerScore,
    level: currentLevel,
    date: new Date().toLocaleDateString()
  };
  leaderboard.push(entry);
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);
  saveToLocalStorage();
}

// ============================================
// INPUT HANDLING
// ============================================

function Got_Player_Input(e) {
  // Pause toggle with 'P' key
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    if (game_mode === 'running') {
      togglePause();
      e.preventDefault();
      return;
    }
  }

  if (isPaused) {
    if (e.type === 'keydown' && (e.key === 'p' || e.key === 'P' || e.key === 'Escape')) {
      togglePause();
    }
    e.preventDefault();
    return;
  }

  switch (game_mode) {
    case 'prestart':
      game_mode = 'running';
      backgroundMusic.play();
      stats.totalGames++;
      updateAchievements();
      break;
    case 'running':
      bird.velocity_y = jump_amount;
      flapSound.currentTime = 0;
      flapSound.play();
      createParticles(bird.x + 15, bird.y + 15, '#FFFFFF', 5);
      break;
    case 'over':
      if (new Date() - time_game_last_running > 1000) {
        reset_game();
        game_mode = 'running';
        backgroundMusic.currentTime = 0;
        backgroundMusic.play();
      }
      break;
  }
  e.preventDefault();
}

function togglePause() {
  isPaused = !isPaused;
  if (isPaused) {
    backgroundMusic.pause();
  } else {
    backgroundMusic.play();
  }
}

// ============================================
// GAME LOGIC FUNCTIONS
// ============================================

function make_bird_slow_and_fall() {
  const slowFactor = activePowerups.slowMotion > 0 ? 0.5 : 1;
  
  if (bird.velocity_y < max_fall_speed) {
    bird.velocity_y += acceleration * slowFactor;
  }
  
  if (bird.y > myCanvas.height - bird.MyImg.height || bird.y < 0) {
    if (activePowerups.shield > 0) {
      bird.y = Math.max(0, Math.min(bird.y, myCanvas.height - bird.MyImg.height));
      bird.velocity_y = 0;
      activePowerups.shield = 0;
      createParticles(bird.x + 15, bird.y + 15, '#00FFFF', 15);
      return;
    }
    
    lives--;
    if (lives > 0) {
      bird.y = myCanvas.height / 2;
      bird.velocity_y = 0;
      invincible = 60;
      createParticles(bird.x + 15, bird.y + 15, '#FF0000', 20);
    } else {
      bird.velocity_y = 0;
      if (game_mode !== 'over') {
        hitSound.play();
        vibrateDevice();
        shakeAmount = 15;
        setTimeout(() => gameOverSound.play(), 300);
        endGame();
      }
    }
  }
}

function endGame() {
  game_mode = 'over';
  backgroundMusic.pause();
  addToLeaderboard(score);
  updateAchievements();
  saveToLocalStorage();
}

function add_pipe(x, gapY, gapSize) {
  const top = new MySprite();
  top.MyImg = pipe_piece;
  top.x = x;
  top.y = gapY - pipe_piece.height;
  top.velocity_x = pipe_speed;
  top.scored = false;
  pipes.push(top);

  const bottom = new MySprite();
  bottom.MyImg = pipe_piece;
  bottom.flipV = true;
  bottom.x = x;
  bottom.y = gapY + gapSize;
  bottom.velocity_x = pipe_speed;
  bottom.scored = false;
  pipes.push(bottom);
  
  // Add coin randomly
  if (Math.random() < 0.5) {
    add_incentive(x + 30, gapY + gapSize / 2);
  }
  
  // Add power-up randomly
  if (Math.random() < 0.15) {
    add_powerup(x + 50, gapY + gapSize / 2);
  }
}

function add_incentive(x, y) {
  const incentive = new MySprite();
  incentive.MyImg = coin_img;
  incentive.x = x;
  incentive.y = y - 15;
  incentive.velocity_x = pipe_speed;
  incentive.scale = 0.5;
  incentives.push(incentive);
}

function add_powerup(x, y) {
  const types = Object.keys(POWERUP_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const powerup = {
    x: x,
    y: y - 15,
    velocity_x: pipe_speed,
    type: type,
    visible: true,
    angle: 0,
    size: 15
  };
  powerups.push(powerup);
}

function show_incentives() {
  incentives.forEach(incentive => {
    if (incentive.visible) {
      incentive.angle = (incentive.angle || 0) + 5;
      
      // Magnet effect
      if (activePowerups.magnet > 0) {
        const dx = bird.x - incentive.x;
        const dy = bird.y - incentive.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          incentive.x += dx * 0.1;
          incentive.y += dy * 0.1;
        }
      }
      
      incentive.Do_Frame_Things();
    }
  });
}

function show_powerups() {
  powerups.forEach(powerup => {
    if (powerup.visible) {
      powerup.angle = (powerup.angle || 0) + 3;
      powerup.x += powerup.velocity_x;
      
      ctx.save();
      ctx.translate(powerup.x, powerup.y);
      ctx.rotate((powerup.angle * Math.PI) / 180);
      ctx.fillStyle = POWERUP_TYPES[powerup.type].color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      
      // Draw power-up shape based on type
      ctx.beginPath();
      if (powerup.type === 'SHIELD') {
        // Shield shape
        ctx.arc(0, 0, powerup.size, 0, Math.PI * 2);
      } else if (powerup.type === 'SLOW_MOTION') {
        // Clock shape
        ctx.arc(0, 0, powerup.size, 0, Math.PI * 2);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -powerup.size * 0.7);
      } else if (powerup.type === 'MAGNET') {
        // Magnet shape
        ctx.rect(-powerup.size, -powerup.size, powerup.size * 2, powerup.size * 2);
      } else {
        // Star shape for double points
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const x = Math.cos(angle) * powerup.size;
          const y = Math.sin(angle) * powerup.size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
      
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  });
}

function make_bird_tilt_appropriately() {
  if (bird.velocity_y < 0) bird.angle = -25;
  else if (bird.angle < 90) bird.angle += 3;
}

function show_the_pipes() {
  pipes.forEach(pipe => pipe.Do_Frame_Things());
}

function check_for_end_game() {
  if (invincible > 0) return;
  
  for (const pipe of pipes) {
    if (ImagesTouching(bird, pipe)) {
      if (activePowerups.shield > 0) {
        activePowerups.shield = 0;
        createParticles(bird.x + 15, bird.y + 15, '#00FFFF', 20);
        shakeAmount = 5;
        return;
      }
      
      lives--;
      if (lives > 0) {
        invincible = 60;
        bird.y = myCanvas.height / 2;
        bird.velocity_y = 0;
        createParticles(bird.x + 15, bird.y + 15, '#FF0000', 20);
        shakeAmount = 10;
      } else {
        if (game_mode !== 'over') {
          hitSound.play();
          vibrateDevice();
          shakeAmount = 15;
          createParticles(bird.x + 15, bird.y + 15, '#FF0000', 30);
          setTimeout(() => gameOverSound.play(), 300);
          endGame();
        }
      }
      return;
    }
  }
}

function check_score() {
  const pointMultiplier = activePowerups.doublePoints > 0 ? 2 : 1;
  
  pipes.forEach(pipe => {
    if (pipe.x + pipe.MyImg.width < bird.x && !pipe.scored) {
      const pipeIndex = pipes.indexOf(pipe);
      if (pipeIndex !== -1) {
        pipes[pipeIndex].scored = true;
        if (pipeIndex + 1 < pipes.length && Math.abs(pipes[pipeIndex].x - pipes[pipeIndex + 1].x) < 10) {
          pipes[pipeIndex + 1].scored = true;
        } else if (pipeIndex - 1 >= 0 && Math.abs(pipes[pipeIndex].x - pipes[pipeIndex - 1].x) < 10) {
          pipes[pipeIndex - 1].scored = true;
        }
      }
      
      const points = 10 * pointMultiplier;
      score += points;
      stats.totalPipes++;
      stats.totalDistance += 10;
      lastPipePassed = pipe;
      scoreSound.currentTime = 0;
      scoreSound.play();
      createParticles(pipe.x, pipe.y + 100, '#FFD700', 8);
      check_level_up();
      
      // Combo system
      comboCount++;
      comboTimer = 120;
      updateAchievements();
    }
  });
  
  // Check coin collection
  incentives.forEach(incentive => {
    if (ImagesTouching(bird, incentive) && incentive.visible) {
      const points = 5 * pointMultiplier;
      score += points;
      stats.totalCoins++;
      incentive.visible = false;
      scoreSound.currentTime = 0;
      scoreSound.play();
      createParticles(incentive.x, incentive.y, '#FFD700', 15);
      
      comboCount++;
      comboTimer = 120;
      updateAchievements();
    }
  });
  
  // Check power-up collection
  powerups.forEach(powerup => {
    if (powerup.visible) {
      const dx = bird.x - powerup.x;
      const dy = bird.y - powerup.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 30) {
        powerup.visible = false;
        activatePowerup(powerup.type);
        stats.totalPowerups++;
        createParticles(powerup.x, powerup.y, POWERUP_TYPES[powerup.type].color, 20);
        updateAchievements();
      }
    }
  });
  
  // Update combo timer
  if (comboTimer > 0) {
    comboTimer--;
  } else {
    comboCount = 0;
  }
}

function activatePowerup(type) {
  const duration = POWERUP_TYPES[type].duration;
  
  switch(type) {
    case 'SHIELD':
      activePowerups.shield = duration;
      break;
    case 'SLOW_MOTION':
      activePowerups.slowMotion = duration;
      break;
    case 'MAGNET':
      activePowerups.magnet = duration;
      break;
    case 'DOUBLE_POINTS':
      activePowerups.doublePoints = duration;
      break;
  }
}

function updatePowerups() {
  for (let key in activePowerups) {
    if (activePowerups[key] > 0) {
      activePowerups[key]--;
    }
  }
}

function check_level_up() {
  const nextLevel = LEVELS.find(l => l.level === currentLevel + 1);
  if (nextLevel && score >= nextLevel.scoreThreshold) {
    currentLevel = nextLevel.level;
    pipe_speed = BASE_PIPE_SPEED * nextLevel.speedMultiplier;
    currentGapSize = nextLevel.gapSize;
    levelUpAnimation = 120;
    
    pipes.forEach(pipe => pipe.velocity_x = pipe_speed);
    incentives.forEach(incentive => incentive.velocity_x = pipe_speed);
    powerups.forEach(powerup => powerup.velocity_x = pipe_speed);
    
    createParticles(myCanvas.width / 2, myCanvas.height / 2, '#FFD700', 30);
    scoreSound.currentTime = 0;
    scoreSound.play();
    updateAchievements();
  }
}

function reset_game() {
  bird.y = myCanvas.height / 2;
  bird.angle = 0;
  bird.velocity_y = 0;
  pipes = [];
  incentives = [];
  powerups = [];
  score = 0;
  lastPipePassed = null;
  currentLevel = 1;
  pipe_speed = BASE_PIPE_SPEED;
  currentGapSize = 140;
  levelUpAnimation = 0;
  lives = maxLives;
  invincible = 0;
  comboCount = 0;
  comboTimer = 0;
  activePowerups = { shield: 0, slowMotion: 0, magnet: 0, doublePoints: 0 };
  add_all_my_pipes();
}

function add_all_my_pipes() {
  let x = 500;
  for (let i = 0; i < 30; i++) {
    const gapY = Math.random() * (myCanvas.height - 250) + 80;
    add_pipe(x, gapY, currentGapSize);
    x += 250 + Math.random() * 100;
  }
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

function getBackgroundGradient() {
  gameTime += 0.001;
  const timeOfDay = (Math.sin(gameTime) + 1) / 2;
  
  const gradient = ctx.createLinearGradient(0, 0, 0, myCanvas.height);
  
  if (timeOfDay < 0.3) {
    // Night
    gradient.addColorStop(0, '#0a1128');
    gradient.addColorStop(1, '#1a2332');
  } else if (timeOfDay < 0.5) {
    // Dawn
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.5, '#feca57');
    gradient.addColorStop(1, '#48dbfb');
  } else if (timeOfDay < 0.7) {
    // Day
    gradient.addColorStop(0, '#70c5ce');
    gradient.addColorStop(1, '#a8e6cf');
  } else {
    // Dusk
    gradient.addColorStop(0, '#ff6348');
    gradient.addColorStop(0.5, '#ff9ff3');
    gradient.addColorStop(1, '#54a0ff');
  }
  
  return gradient;
}

function drawBackground() {
  ctx.fillStyle = getBackgroundGradient();
  ctx.fillRect(0, 0, myCanvas.width, myCanvas.height);
  
  // Draw stars at night
  const timeOfDay = (Math.sin(gameTime) + 1) / 2;
  if (timeOfDay < 0.4) {
    stars.forEach(star => {
      star.update();
      star.draw();
    });
  }
  
  // Draw clouds
  clouds.forEach(cloud => {
    cloud.update();
    cloud.draw();
  });
}

function display_intro_instructions() {
  ctx.font = '30px Montserrat';
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;
  ctx.textAlign = 'center';
  ctx.strokeText('Flappy Bird Enhanced', myCanvas.width / 2, myCanvas.height / 4);
  ctx.fillText('Flappy Bird Enhanced', myCanvas.width / 2, myCanvas.height / 4);
  
  ctx.font = '20px Montserrat';
  ctx.strokeText('Tap or Click to Start!', myCanvas.width / 2, myCanvas.height / 2);
  ctx.fillText('Tap or Click to Start!', myCanvas.width / 2, myCanvas.height / 2);
  
  ctx.font = '16px Montserrat';
  ctx.strokeText('Press P to Pause', myCanvas.width / 2, myCanvas.height / 2 + 40);
  ctx.fillText('Press P to Pause', myCanvas.width / 2, myCanvas.height / 2 + 40);
  
  // Show high score
  if (highScore > 0) {
    ctx.font = '18px Montserrat';
    ctx.strokeText(`High Score: ${highScore}`, myCanvas.width / 2, myCanvas.height - 100);
    ctx.fillText(`High Score: ${highScore}`, myCanvas.width / 2, myCanvas.height - 100);
  }
  
  // Show daily challenge
  ctx.font = '14px Montserrat';
  ctx.fillStyle = '#FFD700';
  ctx.strokeText(`Daily Challenge: Score ${dailyChallenge.target}`, myCanvas.width / 2, myCanvas.height - 60);
  ctx.fillText(`Daily Challenge: Score ${dailyChallenge.target}`, myCanvas.width / 2, myCanvas.height - 60);
}

function display_game_over() {
  highScore = Math.max(score, highScore);
  
  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, myCanvas.width, myCanvas.height);
  
  ctx.font = '35px Montserrat';
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;
  ctx.textAlign = 'center';
  
  ctx.strokeText('Game Over!', myCanvas.width / 2, 80);
  ctx.fillText('Game Over!', myCanvas.width / 2, 80);
  
  ctx.font = '22px Montserrat';
  ctx.strokeText(`Score: ${score}`, myCanvas.width / 2, 130);
  ctx.fillText(`Score: ${score}`, myCanvas.width / 2, 130);
  
  ctx.strokeText(`Level: ${currentLevel}`, myCanvas.width / 2, 160);
  ctx.fillText(`Level: ${currentLevel}`, myCanvas.width / 2, 160);
  
  ctx.fillStyle = '#FFD700';
  ctx.strokeText(`High Score: ${highScore}`, myCanvas.width / 2, 190);
  ctx.fillText(`High Score: ${highScore}`, myCanvas.width / 2, 190);
  
  // Stats
  ctx.font = '16px Montserrat';
  ctx.fillStyle = 'white';
  ctx.strokeText(`Coins: ${stats.totalCoins}`, myCanvas.width / 2, 230);
  ctx.fillText(`Coins: ${stats.totalCoins}`, myCanvas.width / 2, 230);
  
  ctx.strokeText(`Pipes Passed: ${stats.totalPipes}`, myCanvas.width / 2, 255);
  ctx.fillText(`Pipes Passed: ${stats.totalPipes}`, myCanvas.width / 2, 255);
  
  // Daily challenge status
  if (score >= dailyChallenge.target && !dailyChallenge.completed) {
    dailyChallenge.completed = true;
    ctx.fillStyle = '#00FF00';
    ctx.strokeText('Daily Challenge Complete! 🎉', myCanvas.width / 2, 290);
    ctx.fillText('Daily Challenge Complete! 🎉', myCanvas.width / 2, 290);
  }
  
  ctx.font = '18px Montserrat';
  ctx.fillStyle = 'white';
  ctx.strokeText('Tap to Play Again', myCanvas.width / 2, 340);
  ctx.fillText('Tap to Play Again', myCanvas.width / 2, 340);
  
  // Show leaderboard
  displayMiniLeaderboard();
}

function displayMiniLeaderboard() {
  if (leaderboard.length === 0) return;
  
  ctx.font = '14px Montserrat';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'left';
  
  ctx.strokeText('Top Scores:', 20, 380);
  ctx.fillText('Top Scores:', 20, 380);
  
  const topThree = leaderboard.slice(0, 3);
  topThree.forEach((entry, i) => {
    const y = 405 + i * 20;
    ctx.strokeText(`${i + 1}. ${entry.score} pts (Lvl ${entry.level})`, 20, y);
    ctx.fillText(`${i + 1}. ${entry.score} pts (Lvl ${entry.level})`, 20, y);
  });
}

function display_level_info() {
  const levelInfo = LEVELS.find(l => l.level === currentLevel);
  
  ctx.font = '16px Montserrat';
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.textAlign = 'left';
  
  ctx.strokeText(`Level ${currentLevel}: ${levelInfo.name}`, 10, 25);
  ctx.fillText(`Level ${currentLevel}: ${levelInfo.name}`, 10, 25);
  
  ctx.strokeText(`Score: ${score}`, 10, 48);
  ctx.fillText(`Score: ${score}`, 10, 48);
  
  // Lives
  ctx.textAlign = 'right';
  ctx.strokeText(`Lives: ${'❤️'.repeat(lives)}`, myCanvas.width - 10, 25);
  ctx.fillText(`Lives: ${'❤️'.repeat(lives)}`, myCanvas.width - 10, 25);
  
  // Combo
  if (comboCount > 1) {
    ctx.textAlign = 'center';
    ctx.font = '20px Montserrat';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FF6347';
    ctx.strokeText(`${comboCount}x COMBO!`, myCanvas.width / 2, 70);
    ctx.fillText(`${comboCount}x COMBO!`, myCanvas.width / 2, 70);
  }
  
  // Active power-ups
  displayActivePowerups();
  
  // Level up animation
  if (levelUpAnimation > 0) {
    levelUpAnimation--;
    const alpha = Math.min(levelUpAnimation / 60, 1);
    const scale = 1 + (60 - levelUpAnimation) / 60;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(myCanvas.width / 2, myCanvas.height / 2);
    ctx.scale(scale, scale);
    ctx.font = '40px Montserrat';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FF6347';
    ctx.lineWidth = 4;
    ctx.strokeText('LEVEL UP!', 0, 0);
    ctx.fillText('LEVEL UP!', 0, 0);
    ctx.restore();
  }
}

function displayActivePowerups() {
  let yOffset = 75;
  ctx.textAlign = 'left';
  ctx.font = '12px Montserrat';
  
  for (let key in activePowerups) {
    if (activePowerups[key] > 0) {
      const timeLeft = Math.ceil(activePowerups[key] / FPS);
      let name = key.replace(/([A-Z])/g, ' $1').trim();
      
      ctx.fillStyle = POWERUP_TYPES[key.toUpperCase()].color;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.strokeText(`${name}: ${timeLeft}s`, 10, yOffset);
      ctx.fillText(`${name}: ${timeLeft}s`, 10, yOffset);
      yOffset += 18;
    }
  }
}

function displayPauseMenu() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, myCanvas.width, myCanvas.height);
  
  ctx.font = '35px Montserrat';
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;
  ctx.textAlign = 'center';
  
  ctx.strokeText('PAUSED', myCanvas.width / 2, myCanvas.height / 2 - 50);
  ctx.fillText('PAUSED', myCanvas.width / 2, myCanvas.height / 2 - 50);
  
  ctx.font = '20px Montserrat';
  ctx.strokeText('Press P or ESC to Resume', myCanvas.width / 2, myCanvas.height / 2 + 20);
  ctx.fillText('Press P or ESC to Resume', myCanvas.width / 2, myCanvas.height / 2 + 20);
  
  // Show current stats
  ctx.font = '16px Montserrat';
  ctx.strokeText(`Current Score: ${score}`, myCanvas.width / 2, myCanvas.height / 2 + 60);
  ctx.fillText(`Current Score: ${score}`, myCanvas.width / 2, myCanvas.height / 2 + 60);
  
  ctx.strokeText(`Level: ${currentLevel}`, myCanvas.width / 2, myCanvas.height / 2 + 85);
  ctx.fillText(`Level: ${currentLevel}`, myCanvas.width / 2, myCanvas.height / 2 + 85);
}

function display_bar_running_along_bottom() {
  if (bottom_bar_offset < -23) bottom_bar_offset = 0;
  ctx.drawImage(bottom_bar, bottom_bar_offset, myCanvas.height - bottom_bar.height);
}

function updateParticles() {
  particles = particles.filter(p => {
    const alive = p.update();
    if (alive) p.draw();
    return alive;
  });
}

function drawBirdTrail() {
  if (game_mode === 'running' && Math.random() < 0.3) {
    particles.push(new Particle(
      bird.x + 10,
      bird.y + 15,
      'rgba(255, 255, 255, 0.5)',
      3,
      0,
      0
    ));
  }
}

// ============================================
// MAIN GAME LOOP
// ============================================

function Do_a_Frame() {
  // Apply camera shake
  ctx.save();
  if (shakeAmount > 0) {
    const shakeX = (Math.random() - 0.5) * shakeAmount;
    const shakeY = (Math.random() - 0.5) * shakeAmount;
    ctx.translate(shakeX, shakeY);
    shakeAmount *= 0.9;
    if (shakeAmount < 0.5) shakeAmount = 0;
  }
  
  // Draw background
  drawBackground();
  
  // Draw game elements
  display_bar_running_along_bottom();
  
  switch (game_mode) {
    case 'prestart':
      bird.Do_Frame_Things();
      display_intro_instructions();
      break;
      
    case 'running':
      if (isPaused) {
        // Draw everything frozen
        show_the_pipes();
        show_incentives();
        show_powerups();
        bird.Do_Frame_Things();
        updateParticles();
        displayPauseMenu();
      } else {
        time_game_last_running = new Date();
        
        // Update game speed based on slow motion
        const speedFactor = activePowerups.slowMotion > 0 ? 0.5 : 1;
        bottom_bar_offset += pipe_speed * speedFactor;
        
        // Update and draw game objects
        show_the_pipes();
        show_incentives();
        show_powerups();
        drawBirdTrail();
        make_bird_tilt_appropriately();
        make_bird_slow_and_fall();
        check_for_end_game();
        check_score();
        updatePowerups();
        updateParticles();
        
        if (invincible > 0) {
          invincible--;
          // Flashing effect
          if (Math.floor(invincible / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
          }
        }
        
        bird.Do_Frame_Things();
        ctx.globalAlpha = 1;
        
        display_level_info();
        
        // Add new pipes
        const lastPipe = pipes[pipes.length - 1];
        if (lastPipe && lastPipe.x < myCanvas.width + 500) {
          const gapY = Math.random() * (myCanvas.height - 250) + 80;
          add_pipe(lastPipe.x + 300, gapY, currentGapSize);
        }
        
        // Clean up off-screen objects
        pipes = pipes.filter(pipe => pipe.x > -100);
        incentives = incentives.filter(incentive => incentive.x > -100);
        powerups = powerups.filter(powerup => powerup.x > -100);
      }
      break;
      
    case 'over':
      show_the_pipes();
      show_incentives();
      show_powerups();
      make_bird_slow_and_fall();
      bird.Do_Frame_Things();
      updateParticles();
      display_game_over();
      break;
  }
  
  ctx.restore();
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('dblclick', function(e) {
  e.preventDefault();
}, { passive: false });

addEventListener('touchstart', Got_Player_Input, { passive: false });
addEventListener('mousedown', Got_Player_Input);
addEventListener('keydown', Got_Player_Input);

// Start Game Loop
setInterval(Do_a_Frame, 1000 / FPS);

// Load saved achievements
const savedAchievements = JSON.parse(localStorage.getItem('achievements'));
if (savedAchievements) {
  savedAchievements.forEach((saved, i) => {
    if (ACHIEVEMENTS[i]) {
      ACHIEVEMENTS[i].unlocked = saved.unlocked;
      ACHIEVEMENTS[i].progress = saved.progress || 0;
    }
  });
}

console.log('🎮 Flappy Bird Enhanced - Loaded!');
console.log('Features: Particles, Power-ups, Achievements, Combos, Lives, Day/Night Cycle');
console.log('Press P to pause during gameplay');
