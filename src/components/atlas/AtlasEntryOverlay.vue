<template>
  <div
    v-if="isVisible"
    class="atlas-entry-overlay"
    :class="[`effect-${currentEffect}`, { 'is-unfolded': isUnfolded, 'is-unfastened': isUnfastened }]"
  >
    <!-- ================================================================= -->
    <!-- 效果一：'scroll' 拟物双轴徐徐展开                                    -->
    <!-- ================================================================= -->
    <div v-if="currentEffect === 'scroll'" class="scroll-wrapper">
      <!-- 泥金微粒 Canvas 动画层 (解扣时释放65颗微粒) -->
      <canvas ref="goldCanvasRef" class="gold-particle-canvas"></canvas>

      <!-- 左画轴与半幅卷面 -->
      <div class="scroll-wing left-wing" :class="{ 'is-rolling': isUnfolding }">
        <!-- 左半幅仿古宣纸绢帛卷面 -->
        <div class="scroll-paper left-paper">
          <div class="paper-texture"></div>
          <div class="paper-inner-content">
            <div class="paper-watermark">
              <span class="watermark-char">山</span>
              <span class="watermark-char">河</span>
              <span class="watermark-char">行</span>
              <span class="watermark-char">迹</span>
            </div>
            <div class="paper-couplet left-couplet">
              <span>行万里路 · 览千秋华夏盛景</span>
            </div>
          </div>
          <div class="paper-edge-shadow right-shadow"></div>
        </div>

        <!-- 左轴杆（三段式：覆莲轴首 + 紫檀轴身 + 覆莲轴首） -->
        <div class="scroll-roller left-roller">
          <!-- 顶端白玉覆莲轴首 -->
          <div class="finial finial-top">
            <img
              src="/static/atlas/roller_finial_v2.webp"
              alt="轴首"
              class="finial-img"
              draggable="false"
            />
          </div>
          <!-- 轴身（54px宽，小叶紫檀木纹无缝水平旋转 + 柱状光影） -->
          <div class="roller-shaft">
            <div class="shaft-texture shaft-wood-left" :style="{ backgroundImage: 'url(/static/atlas/sandalwood_seamless_v2.webp)' }"></div>
            <div class="shaft-cylinder-highlight"></div>
            <div class="shaft-inner-shadow"></div>
          </div>
          <!-- 底端白玉覆莲轴首（rotate 180deg） -->
          <div class="finial finial-bottom">
            <img
              src="/static/atlas/roller_finial_v2.webp"
              alt="轴首"
              class="finial-img rotated"
              draggable="false"
            />
          </div>
        </div>
      </div>

      <!-- 右画轴与半幅卷面 -->
      <div class="scroll-wing right-wing" :class="{ 'is-rolling': isUnfolding }">
        <!-- 右半幅仿古宣纸绢帛卷面 -->
        <div class="scroll-paper right-paper">
          <div class="paper-texture"></div>
          <div class="paper-inner-content">
            <div class="paper-watermark">
              <span class="watermark-char">光</span>
              <span class="watermark-char">影</span>
              <span class="watermark-char">图</span>
              <span class="watermark-char">志</span>
            </div>
            <div class="paper-couplet right-couplet">
              <span>聚寸景间 · 纳四海天地大观</span>
            </div>
          </div>
          <div class="paper-edge-shadow left-shadow"></div>
        </div>

        <!-- 右轴杆（三段式：覆莲轴首 + 紫檀轴身 + 覆莲轴首） -->
        <div class="scroll-roller right-roller">
          <!-- 顶端白玉覆莲轴首 -->
          <div class="finial finial-top">
            <img
              src="/static/atlas/roller_finial_v2.webp"
              alt="轴首"
              class="finial-img"
              draggable="false"
            />
          </div>
          <!-- 轴身（54px宽，小叶紫檀木纹无缝水平旋转 + 柱状光影） -->
          <div class="roller-shaft">
            <div class="shaft-texture shaft-wood-right" :style="{ backgroundImage: 'url(/static/atlas/sandalwood_seamless_v2.webp)' }"></div>
            <div class="shaft-cylinder-highlight"></div>
            <div class="shaft-inner-shadow"></div>
          </div>
          <!-- 底端白玉覆莲轴首（rotate 180deg） -->
          <div class="finial finial-bottom">
            <img
              src="/static/atlas/roller_finial_v2.webp"
              alt="轴首"
              class="finial-img rotated"
              draggable="false"
            />
          </div>
        </div>
      </div>

      <!-- 中央封签组件：朱印、丝带、流苏、和田白玉螭龙佩 -->
      <div
        class="central-fastener"
        :class="{ 'fastener-released': isUnfastened }"
        @click.stop="handleSealClick"
      >
        <!-- 封卷丝带（横贯双轴，解扣时断开） -->
        <div class="silk-ribbon">
          <div class="ribbon-half ribbon-left"></div>
          <div class="ribbon-half ribbon-right"></div>
        </div>

        <!-- 朱砂火漆印章「啟卷」（top: 135px） -->
        <div class="seal-wax-node" title="点击朱印 · 啟卷">
          <img
            src="/static/atlas/seal_wax_v2.webp"
            alt="朱砂火漆印章「啟卷」"
            class="seal-wax-img"
            draggable="false"
          />
          <div class="seal-glow-ring"></div>
        </div>

        <!-- 朱红精纺流苏（top: 185px，从玉佩后方自然垂下） -->
        <div class="silk-tassel-node">
          <img
            src="/static/atlas/silk_tassel_v2.webp"
            alt="朱红精纺流苏"
            class="silk-tassel-img"
            draggable="false"
          />
        </div>

        <!-- 和田白玉螭龙佩（top: 250px，z-index: 8，压在流苏结扣处） -->
        <div class="jade-dragon-node">
          <img
            src="/static/atlas/jade_dragon_v2.webp"
            alt="和田白玉螭龙佩"
            class="jade-dragon-img"
            draggable="false"
          />
        </div>

        <!-- 启卷提示文字 -->
        <div class="fastener-hint" v-if="!isUnfastened">
          <span class="hint-text">点击朱印 · 啟卷</span>
        </div>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- 效果二：'cinematic' 电影级镜头下沉                                  -->
    <!-- ================================================================= -->
    <div
      v-else-if="currentEffect === 'cinematic'"
      class="cinematic-wrapper"
      :class="{ 'cinematic-sinking': cinematicActive, 'cinematic-fadeout': cinematicFadeOut }"
    >
      <!-- 宣纸纤维背景与云雾层（渐变 multiply） -->
      <div class="cinematic-backdrop">
        <div class="xuan-fiber-layer"></div>
        <div class="mist-layer mist-1"></div>
        <div class="mist-layer mist-2"></div>
        <div class="radial-vignette"></div>
      </div>

      <!-- 古典书法标题与副标 -->
      <div class="cinematic-content">
        <div class="traditional-seal-mark">
          <span class="seal-text">華夏</span>
        </div>
        <h1 class="cinematic-title">光影图志 · 华夏行迹</h1>
        <div class="title-divider">
          <span class="divider-line"></span>
          <span class="divider-diamond">✦</span>
          <span class="divider-line"></span>
        </div>
        <p class="cinematic-subtitle">山河辽阔 · 俯仰皆景</p>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- 效果三：'ink' 东方水墨晕染穿透                                      -->
    <!-- ================================================================= -->
    <div
      v-else-if="currentEffect === 'ink'"
      class="ink-wrapper"
      :class="{ 'ink-fading': inkFadeOut }"
    >
      <!-- 水墨物理扩散 Canvas (利用 destination-out 镂空) -->
      <canvas ref="inkCanvasRef" class="ink-diffusion-canvas"></canvas>

      <!-- 水墨入场标题与副标 -->
      <div class="ink-content" :class="{ 'ink-content-fade': inkContentFade }">
        <div class="ink-seal-badge">墨韻</div>
        <h1 class="ink-title">山河入墨 · 光影成卷</h1>
        <div class="ink-divider"></div>
        <p class="ink-subtitle">墨韵初醒 · 境自天成</p>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

export default defineComponent({
  name: 'AtlasEntryOverlay',
  props: {
    /** 入场动画效果：'scroll' (双轴展开) | 'cinematic' (镜头沉降) | 'ink' (水墨晕染) */
    effect: {
      type: String,
      default: 'scroll',
      validator: (val) => ['scroll', 'cinematic', 'ink'].includes(val)
    },
    /** 是否自动播放入场动画 */
    autoPlay: {
      type: Boolean,
      default: true
    }
  },
  emits: ['unfold-complete', 'update:effect'],
  setup(props, { emit }) {
    // 基础显示与状态
    const isVisible = ref(true);
    const currentEffect = ref(props.effect);

    // 'scroll' 拟物双轴状态
    const isUnfastened = ref(false); // 是否已解扣
    const isUnfolding = ref(false);  // 双轴是否在向两侧滑移
    const isUnfolded = ref(false);   // 是否完全展开完成
    const goldCanvasRef = ref(null);
    let goldAnimFrameId = null;
    let goldParticles = [];

    // 'cinematic' 电影镜头状态
    const cinematicActive = ref(false);
    const cinematicFadeOut = ref(false);
    let cinematicTimer = null;

    // 'ink' 东方水墨状态
    const inkCanvasRef = ref(null);
    const inkFadeOut = ref(false);
    const inkContentFade = ref(false);
    let inkAnimFrameId = null;
    let inkTimer = null;

    // 定时器合集以便安全清理
    const activeTimeouts = [];
    const registerTimeout = (fn, delay) => {
      const id = setTimeout(() => {
        const idx = activeTimeouts.indexOf(id);
        if (idx !== -1) activeTimeouts.splice(idx, 1);
        fn();
      }, delay);
      activeTimeouts.push(id);
      return id;
    };

    const clearAllTimers = () => {
      activeTimeouts.forEach((id) => clearTimeout(id));
      activeTimeouts.length = 0;
      if (goldAnimFrameId) cancelAnimationFrame(goldAnimFrameId);
      if (inkAnimFrameId) cancelAnimationFrame(inkAnimFrameId);
      if (cinematicTimer) clearTimeout(cinematicTimer);
      if (inkTimer) clearTimeout(inkTimer);
    };

    // =========================================================================
    // 1. 'scroll' 特效：解扣、泥金微粒与双轴展开
    // =========================================================================
    
    // 初始化并生成 65 颗金色泥金微粒
    const initGoldParticles = (originX, originY) => {
      goldParticles = [];
      const particleCount = 65;
      const goldPalette = [
        '#ffd700', // 经典纯金
        '#f5c542', // 赤金
        '#ffeaa7', // 亮金
        '#dfb76c', // 泥金古色
        '#ffffff', // 极小闪亮点
        '#e6b800'  // 沉淀金
      ];

      for (let i = 0; i < particleCount; i++) {
        // 初始速度呈辐射扇面发散
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5.5 + 1.2;
        const size = Math.random() * 2.8 + 1.2;

        goldParticles.push({
          x: originX + (Math.random() - 0.5) * 30,
          y: originY + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed * (Math.random() * 0.8 + 0.6),
          vy: Math.sin(angle) * speed * (Math.random() * 0.8 + 0.6) - 1.8, // 初始微向冲上
          size,
          alpha: 1,
          decay: Math.random() * 0.012 + 0.008,
          gravity: 0.08,
          friction: 0.982,
          color: goldPalette[Math.floor(Math.random() * goldPalette.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 12,
          shimmerPhase: Math.random() * Math.PI * 2
        });
      }
    };

    // 绘制并更新泥金微粒物理模拟
    const runGoldParticleLoop = () => {
      const canvas = goldCanvasRef.value;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let activeCount = 0;

        for (let i = 0; i < goldParticles.length; i++) {
          const p = goldParticles[i];
          if (p.alpha <= 0) continue;
          activeCount++;

          // 物理更新
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= p.friction;
          p.vy += p.gravity;
          p.rotation += p.rotSpeed;
          p.shimmerPhase += 0.15;
          p.alpha -= p.decay;

          // 微粒闪烁计算
          const currentAlpha = Math.max(0, p.alpha * (0.7 + 0.3 * Math.sin(p.shimmerPhase)));

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = currentAlpha;
          ctx.fillStyle = p.color;
          ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
          ctx.shadowBlur = 6;

          // 泥金箔片形态（小菱形或长方片）
          ctx.beginPath();
          ctx.moveTo(-p.size, 0);
          ctx.lineTo(0, -p.size * 1.3);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(0, p.size * 1.3);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }

        if (activeCount > 0) {
          goldAnimFrameId = requestAnimationFrame(render);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };

      goldAnimFrameId = requestAnimationFrame(render);
    };

    // 手动/自动触发解扣
    const unfasten = () => {
      if (isUnfastened.value || currentEffect.value !== 'scroll') return;
      isUnfastened.value = true;

      // 准备 Canvas 尺寸并释放泥金微粒
      nextTick(() => {
        const canvas = goldCanvasRef.value;
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          // 朱印中心点坐标 (水平居中，top: 135px + 半径48px)
          const sealCenterY = 135 + 48;
          const sealCenterX = window.innerWidth / 2;
          initGoldParticles(sealCenterX, sealCenterY);
          runGoldParticleLoop();
        }
      });

      // 260ms 后玉佩滑脱、丝带崩解，双轴正式徐徐向两侧展开
      registerTimeout(() => {
        isUnfolding.value = true;
        isUnfolded.value = true;
      }, 260);

      // 1600ms 后双轴完全滑出视野，入场动画结束
      registerTimeout(() => {
        isVisible.value = false;
        emit('unfold-complete');
      }, 1650);
    };

    const handleSealClick = () => {
      unfasten();
    };

    // =========================================================================
    // 2. 'cinematic' 特效：电影级镜头下沉与2.4s平滑淡出
    // =========================================================================
    const playCinematic = () => {
      cinematicActive.value = false;
      cinematicFadeOut.value = false;

      nextTick(() => {
        cinematicActive.value = true;

        // 1800ms 后开始渐隐
        registerTimeout(() => {
          cinematicFadeOut.value = true;
        }, 1800);

        // 2400ms 镜头下沉与淡出完成
        registerTimeout(() => {
          isVisible.value = false;
          emit('unfold-complete');
        }, 2400);
      });
    };

    // =========================================================================
    // 3. 'ink' 特效：东方水墨物理湍流扩散与 destination-out 镂空
    // =========================================================================
    const playInk = () => {
      inkFadeOut.value = false;
      inkContentFade.value = false;

      nextTick(() => {
        const canvas = inkCanvasRef.value;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = (canvas.width = window.innerWidth);
        const h = (canvas.height = window.innerHeight);

        // 初始填充深色墨韵基底
        ctx.fillStyle = '#0f1214';
        ctx.fillRect(0, 0, w, h);

        // 墨滴湍流物理扩散模型
        const centerX = w / 2;
        const centerY = h / 2;
        const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY) * 1.15;
        let currentRadius = 0;
        const spreadSpeed = maxRadius / 80; // 约 1.5s 扩满

        // 墨滴边缘湍流噪声点
        const pointsCount = 48;
        const angles = [];
        const offsets = [];
        for (let i = 0; i < pointsCount; i++) {
          angles.push((i / pointsCount) * Math.PI * 2);
          offsets.push(Math.random() * 0.4 + 0.8);
        }

        const renderInk = () => {
          currentRadius += spreadSpeed;

          ctx.save();
          // 关键核心：利用 destination-out 将已有像素镂空，露出下层地图界面
          ctx.globalCompositeOperation = 'destination-out';

          ctx.beginPath();
          for (let i = 0; i < pointsCount; i++) {
            const angle = angles[i];
            const noise = offsets[i] + Math.sin(currentRadius * 0.05 + i) * 0.15;
            const r = currentRadius * noise;
            const px = centerX + Math.cos(angle) * r;
            const py = centerY + Math.sin(angle) * r;

            if (i === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.filter = 'blur(16px)';
          ctx.fill();
          ctx.restore();

          if (currentRadius < maxRadius) {
            inkAnimFrameId = requestAnimationFrame(renderInk);
          }
        };

        inkAnimFrameId = requestAnimationFrame(renderInk);

        // 1400ms 后标题文字渐隐
        registerTimeout(() => {
          inkContentFade.value = true;
        }, 1400);

        // 2200ms 后整体淡出
        registerTimeout(() => {
          inkFadeOut.value = true;
        }, 2200);

        // 2600ms 完成水墨穿透
        registerTimeout(() => {
          isVisible.value = false;
          emit('unfold-complete');
        }, 2600);
      });
    };

    // =========================================================================
    // 4. 统一播放调度与对外 API 暴露
    // =========================================================================
    const play = () => {
      clearAllTimers();
      isVisible.value = true;
      isUnfastened.value = false;
      isUnfolding.value = false;
      isUnfolded.value = false;

      if (currentEffect.value === 'scroll') {
        if (props.autoPlay) {
          // 拟物卷轴在停留 900ms 让用户领略封签细节后自动解扣
          registerTimeout(() => {
            unfasten();
          }, 900);
        }
      } else if (currentEffect.value === 'cinematic') {
        playCinematic();
      } else if (currentEffect.value === 'ink') {
        playInk();
      }
    };

    watch(
      () => props.effect,
      (newVal) => {
        if (newVal !== currentEffect.value) {
          currentEffect.value = newVal;
          emit('update:effect', newVal);
          play();
        }
      }
    );

    onMounted(() => {
      play();
    });

    onBeforeUnmount(() => {
      clearAllTimers();
    });

    return {
      isVisible,
      currentEffect,
      isUnfastened,
      isUnfolding,
      isUnfolded,
      goldCanvasRef,
      cinematicActive,
      cinematicFadeOut,
      inkCanvasRef,
      inkFadeOut,
      inkContentFade,
      handleSealClick,
      unfasten,
      play
    };
  }
});
</script>

<style scoped>
/* ========================================================================= */
/* 基础层级与全屏硬件加速容器                                                   */
/* ========================================================================= */
.atlas-entry-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  overflow: hidden;
  pointer-events: auto;
  user-select: none;
  background: transparent;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  perspective: 1000px;
}

/* ========================================================================= */
/* 效果一：'scroll' 拟物双轴徐徐展开                                           */
/* ========================================================================= */
.scroll-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 泥金微粒全屏画布 */
.gold-particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 70;
}

/* 左右画轴扇区基类 (GPU translate3d 加速) */
.scroll-wing {
  position: absolute;
  top: 0;
  width: 50vw;
  height: 100vh;
  will-change: transform;
  transition: transform 1.38s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 30;
}

.left-wing {
  left: 0;
  transform: translate3d(0, 0, 0);
}

.right-wing {
  left: 50vw;
  transform: translate3d(0, 0, 0);
}

/* 解扣后向两侧徐徐展开 */
.is-unfolded .left-wing {
  transform: translate3d(-100%, 0, 0);
}

.is-unfolded .right-wing {
  transform: translate3d(100%, 0, 0);
}

/* 卷面（宋锦绫绢包边与温润仿古宣纸纹理） */
.scroll-paper {
  position: absolute;
  top: 0;
  bottom: 0;
  overflow: hidden;
  background-color: #f7f3e8;
  box-shadow: inset 0 0 100px rgba(120, 80, 40, 0.18);
}

.left-paper {
  left: 0;
  right: 27px; /* 紧贴左轴杆中心 */
  border-right: 1px solid rgba(80, 40, 10, 0.2);
}

.right-paper {
  left: 27px; /* 紧贴右轴杆中心 */
  right: 0;
  border-left: 1px solid rgba(80, 40, 10, 0.2);
}

/* 宣纸纤维肌理 */
.paper-texture {
  position: absolute;
  inset: 0;
  opacity: 0.65;
  background-image:
    radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.8) 0%, rgba(240, 230, 210, 0.3) 100%),
    repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0, 0, 0, 0.015) 3px, rgba(0, 0, 0, 0.015) 6px);
  pointer-events: none;
}

/* 卷内古典暗纹与对联水印 */
.paper-inner-content {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.paper-watermark {
  display: flex;
  flex-direction: column;
  gap: 36px;
  opacity: 0.07;
  font-family: "STSong", "Songti SC", "Noto Serif SC", serif;
  font-size: 88px;
  font-weight: bold;
  color: #3b2a1a;
  letter-spacing: 12px;
}

.paper-couplet {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
  font-family: "STSong", "Songti SC", "Noto Serif SC", serif;
  font-size: 19px;
  letter-spacing: 10px;
  color: #6d5b45;
  opacity: 0.35;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
}

.left-couplet {
  right: 70px;
}

.right-couplet {
  left: 70px;
}

/* 卷轴边缘投影增强三维厚度感 */
.paper-edge-shadow {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 32px;
  pointer-events: none;
}

.right-shadow {
  right: 0;
  background: linear-gradient(to left, rgba(0, 0, 0, 0.28), transparent);
}

.left-shadow {
  left: 0;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.28), transparent);
}

/* ------------------------------------------------------------------------- */
/* 双轴轴杆（三段式结构：轴首 + 54px小叶紫檀轴身 + 轴首）                      */
/* ------------------------------------------------------------------------- */
.scroll-roller {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 54px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 40;
  filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.55));
}

.left-roller {
  right: 0;
}

.right-roller {
  left: 0;
}

/* 白玉覆莲轴首 (width: 64px, height: 56px, margin-left: -1px 光学微调) */
.finial {
  position: relative;
  width: 64px;
  height: 56px;
  margin-left: -1px;
  flex-shrink: 0;
  z-index: 45;
}

.finial-top {
  margin-top: 2px;
}

.finial-bottom {
  margin-bottom: 2px;
}

.finial-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.finial-img.rotated {
  transform: rotate(180deg);
}

/* 轴身主体（54px宽，小叶紫檀木纹，左右对称 inset 4px box-shadow 与居中圆柱高光） */
.roller-shaft {
  position: relative;
  width: 54px;
  flex: 1;
  overflow: hidden;
}

/* 360° 水平循环旋转小叶紫檀木纹 (160px 无缝循环) */
.shaft-texture {
  position: absolute;
  inset: 0;
  background-repeat: repeat;
  background-size: 160px auto;
  will-change: background-position;
}

.is-rolling .shaft-wood-left {
  animation: rollLeftWood 0.38s linear infinite;
}

.is-rolling .shaft-wood-right {
  animation: rollRightWood 0.38s linear infinite;
}

@keyframes rollLeftWood {
  0% {
    background-position-x: 0;
  }
  100% {
    background-position-x: -160px;
  }
}

@keyframes rollRightWood {
  0% {
    background-position-x: 0;
  }
  100% {
    background-position-x: 160px;
  }
}

/* 左右对称 box-shadow（inset 4px / inset -4px）增强圆柱立体感 */
.shaft-inner-shadow {
  position: absolute;
  inset: 0;
  box-shadow:
    inset 4px 0 8px rgba(0, 0, 0, 0.8),
    inset -4px 0 8px rgba(0, 0, 0, 0.8);
  pointer-events: none;
}

/* 居中圆柱高光 (拟真圆柱反光) */
.shaft-cylinder-highlight {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.55) 0%,
    rgba(255, 255, 255, 0.08) 28%,
    rgba(255, 255, 255, 0.38) 50%,
    rgba(255, 255, 255, 0.08) 72%,
    rgba(0, 0, 0, 0.55) 100%
  );
  pointer-events: none;
}

/* ------------------------------------------------------------------------- */
/* 中央封签：朱印(135px)、流苏(185px)、白玉佩(250px, z:8)、丝带                 */
/* ------------------------------------------------------------------------- */
.central-fastener {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 180px;
  height: 100vh;
  z-index: 60;
  cursor: pointer;
  pointer-events: auto;
}

/* 横向封卷丝带 */
.silk-ribbon {
  position: absolute;
  top: 175px;
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  height: 16px;
  display: flex;
  pointer-events: none;
}

.ribbon-half {
  flex: 1;
  height: 100%;
  background: linear-gradient(180deg, #c0392b 0%, #962d22 100%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease;
}

.ribbon-left {
  transform-origin: left center;
}

.ribbon-right {
  transform-origin: right center;
}

.fastener-released .ribbon-left {
  transform: scaleX(0);
  opacity: 0;
}

.fastener-released .ribbon-right {
  transform: scaleX(0);
  opacity: 0;
}

/* 朱砂火漆印章「啟卷」（top: 135px） */
.seal-wax-node {
  position: absolute;
  top: 135px;
  left: 50%;
  transform: translateX(-50%);
  width: 98px;
  height: 98px;
  z-index: 10;
  transition: transform 0.65s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s ease;
  filter: drop-shadow(0 6px 14px rgba(150, 30, 20, 0.55));
}

.seal-wax-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.25s ease;
}

.central-fastener:hover .seal-wax-img {
  transform: scale(1.05);
}

.seal-glow-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 215, 0, 0.45);
  opacity: 0;
  animation: sealPulse 2.2s infinite ease-in-out;
  pointer-events: none;
}

@keyframes sealPulse {
  0%, 100% {
    transform: scale(0.95);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.65;
  }
}

/* 朱红精纺流苏（top: 185px，红缨自然垂下） */
.silk-tassel-node {
  position: absolute;
  top: 185px;
  left: 50%;
  transform: translateX(-50%);
  width: 46px;
  z-index: 6;
  pointer-events: none;
  transition: transform 0.85s cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 0.75s ease;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
}

.silk-tassel-img {
  width: 100%;
  height: auto;
  display: block;
}

/* 和田白玉螭龙佩（top: 250px，z-index: 8，压在流苏结扣处） */
.jade-dragon-node {
  position: absolute;
  top: 250px;
  left: 50%;
  transform: translateX(-50%);
  width: 68px;
  z-index: 8;
  pointer-events: none;
  transition: transform 0.8s cubic-bezier(0.55, 0.055, 0.675, 0.19), opacity 0.68s ease;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.45));
}

.jade-dragon-img {
  width: 100%;
  height: auto;
  display: block;
}

/* 解扣动效：印章碎散淡出、玉佩滑脱下坠、流苏飘落 */
.fastener-released .seal-wax-node {
  transform: translateX(-50%) translate3d(0, 45px, 0) scale(1.18);
  opacity: 0;
}

.fastener-released .jade-dragon-node {
  transform: translateX(-50%) translate3d(0, 140px, 0) rotate(-18deg);
  opacity: 0;
}

.fastener-released .silk-tassel-node {
  transform: translateX(-50%) translate3d(0, 180px, 0) rotate(12deg);
  opacity: 0;
}

/* 提示文字 */
.fastener-hint {
  position: absolute;
  top: 395px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  pointer-events: none;
}

.hint-text {
  font-family: "STSong", "Songti SC", "Noto Serif SC", serif;
  font-size: 13px;
  letter-spacing: 3px;
  color: #8c6f48;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  animation: hintBreathe 2s infinite ease-in-out;
}

@keyframes hintBreathe {
  0%, 100% {
    opacity: 0.6;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

/* ========================================================================= */
/* 效果二：'cinematic' 电影级镜头下沉                                          */
/* ========================================================================= */
.cinematic-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: scale(1.08) translate3d(0, -25px, 0);
  transition: transform 2.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.65s ease;
  will-change: transform, opacity;
}

.cinematic-sinking {
  transform: scale(1) translate3d(0, 0, 0);
}

.cinematic-fadeout {
  opacity: 0;
}

/* 宣纸纤维与云雾层 */
.cinematic-backdrop {
  position: absolute;
  inset: 0;
  background-color: #ede5d5;
}

.xuan-fiber-layer {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(ellipse at center, rgba(255, 255, 255, 0.85) 0%, rgba(235, 222, 202, 0.6) 100%),
    repeating-linear-gradient(45deg, rgba(120, 80, 40, 0.02) 0px, rgba(120, 80, 40, 0.02) 2px, transparent 2px, transparent 6px);
}

.mist-layer {
  position: absolute;
  inset: -50%;
  mix-blend-mode: multiply;
  opacity: 0.45;
  background: radial-gradient(circle at 50% 50%, rgba(180, 160, 140, 0.4) 0%, transparent 65%);
}

.mist-1 {
  animation: mistDrift1 22s linear infinite;
}

.mist-2 {
  animation: mistDrift2 30s linear infinite reverse;
}

@keyframes mistDrift1 {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(4%, 3%, 0) scale(1.08); }
  100% { transform: translate3d(0, 0, 0) scale(1); }
}

@keyframes mistDrift2 {
  0% { transform: translate3d(0, 0, 0) scale(1.05); }
  50% { transform: translate3d(-3%, -4%, 0) scale(1); }
  100% { transform: translate3d(0, 0, 0) scale(1.05); }
}

.radial-vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 160px rgba(70, 45, 25, 0.35);
}

/* 标题排版 */
.cinematic-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.traditional-seal-mark {
  width: 42px;
  height: 42px;
  border-radius: 4px;
  background-color: #b73229;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(183, 50, 41, 0.45);
}

.seal-text {
  font-family: "STSong", "Songti SC", "Noto Serif SC", serif;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  letter-spacing: 2px;
}

.cinematic-title {
  font-family: "STSong", "Songti SC", "Noto Serif SC", serif;
  font-size: 46px;
  font-weight: 700;
  color: #24201c;
  letter-spacing: 12px;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.title-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 22px 0 18px;
  width: 260px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, #8f7960, transparent);
}

.divider-diamond {
  color: #a48c6f;
  font-size: 12px;
}

.cinematic-subtitle {
  font-family: "STSong", "Songti SC", "Noto Serif SC", serif;
  font-size: 20px;
  letter-spacing: 8px;
  color: #635747;
  margin: 0;
}

/* ========================================================================= */
/* 效果三：'ink' 东方水墨晕染穿透                                              */
/* ========================================================================= */
.ink-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  transition: opacity 0.55s ease;
}

.ink-fading {
  opacity: 0;
}

.ink-diffusion-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ink-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  z-index: 10;
  pointer-events: none;
  transition: opacity 0.8s ease, transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.ink-content-fade {
  opacity: 0;
  transform: translate(-50%, -50%) scale(1.06);
}

.ink-seal-badge {
  display: inline-block;
  padding: 3px 12px;
  border: 1px solid rgba(255, 215, 0, 0.6);
  color: #e5c07b;
  font-family: "STSong", "Songti SC", serif;
  font-size: 13px;
  letter-spacing: 4px;
  margin-bottom: 20px;
  border-radius: 2px;
}

.ink-title {
  font-family: "STSong", "Songti SC", "Noto Serif SC", serif;
  font-size: 42px;
  font-weight: 700;
  color: #f1f2f6;
  letter-spacing: 10px;
  margin: 0;
  text-shadow: 0 4px 18px rgba(0, 0, 0, 0.85);
}

.ink-divider {
  width: 120px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #c5a059, transparent);
  margin: 18px 0;
}

.ink-subtitle {
  font-family: "STSong", "Songti SC", "Noto Serif SC", serif;
  font-size: 18px;
  letter-spacing: 6px;
  color: #b0b8c0;
  margin: 0;
}

/* ========================================================================= */
/* 移动端与不同视口自适应适配                                                   */
/* ========================================================================= */
@media (max-width: 768px) {
  .cinematic-title {
    font-size: 30px;
    letter-spacing: 6px;
  }
  .cinematic-subtitle {
    font-size: 16px;
    letter-spacing: 4px;
  }
  .ink-title {
    font-size: 28px;
    letter-spacing: 6px;
  }
  .ink-subtitle {
    font-size: 15px;
    letter-spacing: 3px;
  }
  .paper-couplet {
    display: none;
  }
  .paper-watermark {
    font-size: 60px;
    gap: 20px;
  }
}
</style>
