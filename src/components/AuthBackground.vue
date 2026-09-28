<template>
  <div class="auth-bg" aria-hidden="true">
    <!-- 柔和光晕 -->
    <div class="glow glow-a"></div>
    <div class="glow glow-b"></div>
    <div class="glow glow-c"></div>

    <!-- 极淡的医疗科技点阵纹理 -->
    <div class="bg-grid"></div>

    <!-- 抽象健康数据曲线（心电） -->
    <svg class="deco deco-ecg" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMid slice">
      <path d="M0 180H300l16-24 18 48 16-24H520l16-20 18 40 16-20H740l16-24 18 48 16-24H960l16-20 18 40 16-20H1180l16-24 18 48 16-24H1440" />
    </svg>

    <!-- 抽象人体 / 守护轮廓 -->
    <svg class="deco deco-human deco-human--left" viewBox="0 0 200 220">
      <circle cx="100" cy="56" r="27" />
      <path d="M52 184C52 132 73 112 100 112s48 20 48 72" />
    </svg>
    <svg class="deco deco-human deco-human--right" viewBox="0 0 200 220">
      <circle cx="100" cy="58" r="22" />
      <path d="M58 182C58 136 76 118 100 118s42 18 42 64" />
    </svg>

    <!-- 极淡医疗十字 -->
    <svg class="deco deco-cross deco-cross--a" viewBox="0 0 24 24">
      <path d="M12 4v16M4 12h16" />
    </svg>
    <svg class="deco deco-cross deco-cross--b" viewBox="0 0 24 24">
      <path d="M12 4v16M4 12h16" />
    </svg>
    <svg class="deco deco-cross deco-cross--c" viewBox="0 0 24 24">
      <path d="M12 4v16M4 12h16" />
    </svg>

    <!-- 数据节点 -->
    <svg class="deco deco-nodes" viewBox="0 0 320 160">
      <polyline points="20,120 90,120 90,70 160,70 160,100 230,100 230,50 300,50" />
      <circle cx="20" cy="120" r="3.6" />
      <circle cx="90" cy="70" r="3.6" />
      <circle cx="160" cy="100" r="3.6" />
      <circle cx="230" cy="50" r="3.6" />
      <circle cx="300" cy="50" r="3.6" />
    </svg>
  </div>
</template>

<style scoped>
.auth-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
}

.glow-a {
  width: 620px;
  height: 620px;
  top: -220px;
  left: -140px;
  background: radial-gradient(circle, rgba(96, 158, 222, 0.28), transparent 65%);
}

.glow-b {
  width: 560px;
  height: 560px;
  bottom: -240px;
  right: -120px;
  background: radial-gradient(circle, rgba(104, 198, 209, 0.24), transparent 65%);
}

.glow-c {
  width: 420px;
  height: 420px;
  top: 8%;
  right: 10%;
  background: radial-gradient(circle, rgba(122, 168, 232, 0.18), transparent 62%);
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(84, 126, 175, 0.1) 1px, transparent 1px);
  background-size: 26px 26px;
  -webkit-mask-image: radial-gradient(ellipse 75% 70% at 50% 45%, #000 30%, transparent 100%);
  mask-image: radial-gradient(ellipse 75% 70% at 50% 45%, #000 30%, transparent 100%);
}

.deco {
  position: absolute;
}

.deco-ecg {
  left: 0;
  bottom: -40px;
  width: 100%;
  height: 300px;
}

.deco-ecg path {
  fill: none;
  stroke: rgba(78, 143, 216, 0.16);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.deco-human {
  width: 300px;
  height: 330px;
}

.deco-human circle,
.deco-human path {
  fill: none;
  stroke: rgba(78, 143, 216, 0.13);
  stroke-width: 3;
  stroke-linecap: round;
}

.deco-human--left {
  left: 4%;
  top: 50%;
  transform: translateY(-52%);
}

.deco-human--right {
  right: 6%;
  bottom: 14%;
  width: 220px;
  height: 242px;
  opacity: 0.8;
}

.deco-cross {
  width: 40px;
  height: 40px;
}

.deco-cross path {
  fill: none;
  stroke: rgba(78, 143, 216, 0.14);
  stroke-width: 1.6;
  stroke-linecap: round;
}

.deco-cross--a { top: 16%; left: 24%; }
.deco-cross--b { top: 60%; right: 16%; }
.deco-cross--c { bottom: 20%; left: 14%; }

.deco-nodes {
  width: 280px;
  height: 140px;
  top: 18%;
  right: 14%;
}

.deco-nodes polyline {
  fill: none;
  stroke: rgba(78, 143, 216, 0.16);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.deco-nodes circle {
  fill: rgba(78, 143, 216, 0.2);
  stroke: none;
}
</style>
