<template>
  <div class="photo-atlas-container">
    <!-- 全屏图卷地图容器 -->
    <div id="atlas-map" class="map-viewport"></div>

    <!-- 典藏入场动效遮罩层 (三种意境：拟物双轴 / 镜头下沉 / 水墨晕染) -->
    <AtlasEntryOverlay
      ref="entryOverlay"
      :effect="entryEffect"
      @unfold-complete="onEntryUnfoldComplete"
    />

    <!-- 顶部悬浮控制栏 (Top Floating Island) -->
    <header class="top-nav-island">
      <div class="glass-bar">
        <!-- 左侧：返回与图志选择器 -->
        <div class="nav-left">
          <button class="nav-btn-icon" @click="goToDashboard" title="返回管理后台">
            <font-awesome-icon icon="arrow-left" />
          </button>
          <div class="brand-title">
            <span class="brand-text">光影图志</span>
          </div>

          <!-- 图志选择器：仅管理员可见切换下拉框；访客模式展示静态图志徽章 -->
          <el-select
            v-if="isAdmin"
            v-model="selectedAtlasId"
            @change="onAtlasChange"
            class="atlas-selector"
            placeholder="选择图志"
            size="small"
          >
            <el-option
              label="全图卷 (全部足迹)"
              value="all"
            >
              <span class="atlas-opt-name">全图卷 (全部足迹)</span>
              <el-tag size="small" type="info" class="atlas-opt-tag">系统全量</el-tag>
            </el-option>
            <el-option
              v-for="item in atlasList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            >
              <span class="atlas-opt-name">{{ item.name }}</span>
              <el-tag size="small" type="primary" class="atlas-opt-tag">图志</el-tag>
            </el-option>
          </el-select>
          <div v-else class="visitor-atlas-badge">
            <span class="atlas-badge-text">{{ currentAtlasName }}</span>
          </div>
        </div>

        <!-- 中间：动态标签过滤器 (纯文字胶囊，去 Emoji) -->
        <div class="nav-center-tags" v-if="availableTags.length > 0">
          <button
            class="tag-pill"
            :class="{ active: selectedTag === 'all' }"
            @click="filterByTag('all')"
          >
            全部
          </button>
          <button
            v-for="tag in availableTags"
            :key="tag.name"
            class="tag-pill"
            :class="{ active: selectedTag === tag.name }"
            @click="filterByTag(tag.name)"
          >
            {{ tag.name }}
            <span class="tag-count" v-if="tag.count">{{ tag.count }}</span>
          </button>
        </div>

        <!-- 右侧：指标统计与快捷操作 -->
        <div class="nav-right">
          <!-- 入场动效切换器 (三种意境自如切换) -->
          <el-dropdown trigger="click" @command="handleEffectChange" class="effect-dropdown">
            <button class="effect-switcher-btn" :title="'当前入场意境: ' + currentEffectLabel">
              <span class="effect-icon">{{ currentEffectIcon }}</span>
              <span class="effect-label desktop-only">{{ currentEffectLabel }}</span>
              <font-awesome-icon icon="chevron-down" class="effect-arrow" />
            </button>
            <template #dropdown>
              <el-dropdown-menu class="atlas-effect-menu">
                <el-dropdown-item command="scroll" :class="{ 'is-active': entryEffect === 'scroll' }">
                  <span class="item-icon">📜</span>
                  <span class="item-name">拟物双轴 · 金碧千里江山</span>
                </el-dropdown-item>
                <el-dropdown-item command="cinematic" :class="{ 'is-active': entryEffect === 'cinematic' }">
                  <span class="item-icon">🎬</span>
                  <span class="item-name">镜头下沉 · 纪实羊皮纸</span>
                </el-dropdown-item>
                <el-dropdown-item command="ink" :class="{ 'is-active': entryEffect === 'ink' }">
                  <span class="item-icon">🖌️</span>
                  <span class="item-name">水墨晕染 · 徽派青绿墨韵</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- 底图图层切换 (高德模式下可用: 矢量 / 卫星 / 混合) -->
          <button
            v-if="engineMode === 'amap'"
            class="nav-btn-icon layer-switcher-btn"
            @click="toggleMapLayer"
            :title="'当前底图: ' + currentLayerLabel + ' (点击切换)'"
          >
            <span>{{ currentLayerIcon }}</span>
          </button>

          <!-- 重播入场动效按钮 -->
          <button class="nav-btn-icon replay-btn" @click="replayEntryAnimation" title="重播长卷入场动效">
            <font-awesome-icon icon="redo" />
          </button>

          <div class="metric-pill desktop-only">
            <font-awesome-icon icon="map-marker-alt" class="metric-icon" />
            <span>{{ metricText }}</span>
          </div>

          <!-- 打卡选点按钮 (管理员可见) -->
          <button v-if="isAdmin" class="action-btn-primary" @click="openNewPinModal">
            <font-awesome-icon icon="plus" />
            <span>打卡选点</span>
          </button>

          <!-- 管理图志按钮 (管理员可见) -->
          <button v-if="isAdmin" class="action-btn-secondary" @click="goToAtlasManage" title="图志与标签治理">
            <font-awesome-icon icon="atlas" />
            <span class="desktop-only">图志管理</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 右侧滑出故事手记抽屉 (Story Drawer) -->
    <aside
      class="story-drawer"
      :class="{ 'is-open': isDrawerOpen }"
    >
      <div class="drawer-header">
        <div class="drawer-header-left">
          <div class="drawer-meta-row">
            <span class="drawer-date-badge">{{ currentCluster.date || '未知日期' }}</span>
            <span class="drawer-category-badge" v-if="currentCluster.tags && currentCluster.tags.length">
              {{ currentCluster.tags.join(' / ') }}
            </span>
          </div>
          <h2 class="drawer-title" :title="currentCluster.location || '未知地点'">
            {{ currentCluster.location || '未命名地点' }}
          </h2>
        </div>
        <button class="drawer-close-btn" @click="closeDrawer">
          <font-awesome-icon icon="times" />
        </button>
      </div>

      <div class="drawer-body">
        <!-- 照片网格 -->
        <div class="gallery-grid">
          <div
            v-for="(photo, index) in currentCluster.photos"
            :key="photo.id || index"
            class="gallery-item"
            @click="selectActivePhoto(photo)"
            :class="{ active: activePhoto && activePhoto.id === photo.id }"
          >
            <img :src="photo.url" :alt="photo.name || '照片'" loading="lazy" />
          </div>
        </div>

        <!-- 故事与手记 -->
        <div class="story-section">
          <h3 class="section-title">旅行手记与光影故事</h3>
          <p class="story-content" v-if="currentCluster.story">
            {{ currentCluster.story }}
          </p>
          <p class="story-content empty" v-else>
            暂无图文故事，可点击下方“编辑打卡与故事”进行补充。
          </p>
        </div>

        <!-- 元数据信息框 -->
        <div class="metadata-box">
          <div class="meta-row">
            <span class="meta-label">空间坐标</span>
            <span class="meta-val font-mono">{{ currentCluster.coordText || '--' }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">收录照片</span>
            <span class="meta-val">{{ (currentCluster.photos && currentCluster.photos.length) || 0 }} 张</span>
          </div>
          <div class="meta-row" v-if="activePhoto && activePhoto.camera">
            <span class="meta-label">拍摄设备</span>
            <span class="meta-val">{{ activePhoto.camera }}</span>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <a
          v-if="activePhoto && activePhoto.url"
          :href="activePhoto.url"
          target="_blank"
          class="footer-link"
        >
          <font-awesome-icon icon="external-link-alt" />
          <span>查看原图</span>
        </a>
        <button class="btn-dark" @click="openEditModalForCurrent">
          <font-awesome-icon icon="edit" />
          <span>编辑打卡与故事</span>
        </button>
      </div>
    </aside>

    <!-- 地图打卡选点与故事编辑弹窗 (Edit Dialog) -->
    <el-dialog
      v-model="showEditDialog"
      title="地图打卡选点与故事编辑"
      width="680px"
      :close-on-click-modal="false"
      class="atlas-edit-dialog"
    >
      <div class="edit-dialog-content">
        <!-- 目标照片 ID 或选择器 -->
        <div class="form-item">
          <label class="form-label">目标照片 ID (File ID)</label>
          <el-input
            v-model="editForm.id"
            placeholder="输入照片 ID，或从下方已加载照片中选取"
            size="default"
          />
        </div>

        <!-- 交互式微型落点地图 -->
        <div class="form-item">
          <label class="form-label">交互落点拾取器（点击地图任意位置即可落钉）</label>
          <div class="picker-map-wrapper">
            <div id="picker-map" class="picker-map"></div>
            <div class="picker-tip">
              提示：在地图上点击落点，将自动填充 WGS-84 经纬度
            </div>
          </div>
        </div>

        <!-- 地点名称与坐标 -->
        <div class="form-row-2">
          <div class="form-item">
            <label class="form-label">地点名称（支持自定义输入）</label>
            <el-input
              v-model="editForm.location_name"
              placeholder="例如：浙江省·杭州市·西湖苏堤"
            />
          </div>
          <div class="form-item">
            <div class="form-label-row">
              <label class="form-label">经纬度坐标 (WGS-84)</label>
              <el-button link type="danger" size="small" @click="clearEditCoords">清除坐标</el-button>
            </div>
            <el-input
              v-model="editForm.coordsText"
              readonly
              placeholder="点击地图拾取坐标"
              class="font-mono"
            />
          </div>
        </div>

        <!-- 故事手记 -->
        <div class="form-item">
          <label class="form-label">图文故事 / 旅行手记（支持长篇随笔）</label>
          <el-input
            v-model="editForm.story_description"
            type="textarea"
            :rows="3"
            placeholder="写下关于这张照片的旅行回忆、光影瞬间或心情故事..."
          />
        </div>
      </div>

      <template #footer>
        <div class="dialog-actions">
          <el-button @click="showEditDialog = false">取消</el-button>
          <el-button type="primary" :loading="savingEdit" @click="saveEditForm">
            保存打卡信息
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import axios from '@/utils/axios';
import { wgs84ToGcj02, gcj02ToWgs84 } from '@/utils/coordTransform';
import AtlasEntryOverlay from '@/components/atlas/AtlasEntryOverlay.vue';

export default {
  name: 'PhotoAtlas',
  components: {
    AtlasEntryOverlay
  },
  data() {
    return {
      // 入场动效模式: 'scroll' (拟物双轴) | 'cinematic' (镜头下沉) | 'ink' (水墨晕染)
      entryEffect: localStorage.getItem('atlas_entry_effect') || 'scroll',

      // 引擎模式: 'amap' 或 'leaflet'
      engineMode: 'leaflet',
      mapInstance: null,
      pickerMapInstance: null,
      pickerMarker: null,
      markerLayerGroup: null,
      amapMarkers: [],

      // 权限与当前图志
      isAdmin: false,
      currentAtlas: null,

      // 图志与过滤
      selectedAtlasId: 'all',
      atlasList: [],
      selectedTag: 'all',
      availableTags: [],

      // 原始足迹数据与聚合点
      rawFootprintData: [],
      clusterList: [],

      // 抽屉状态
      isDrawerOpen: false,
      currentCluster: {
        location: '',
        date: '',
        tags: [],
        story: '',
        coordText: '',
        photos: []
      },
      activePhoto: null,

      // 编辑弹窗
      showEditDialog: false,
      savingEdit: false,
      editForm: {
        id: '',
        location_name: '',
        latitude: null,
        longitude: null,
        coordsText: '',
        story_description: ''
      },

      // 系统地图配置
      mapConfig: {
        amap_enable: false,
        amap_api_key: '',
        amap_security_code: '',
        amap_style: 'whitesmoke',
        amap_show_poi: false,
        amap_view_mode: false,
        amap_layer_type: 'vector',
        amap_control_bar: false
      },
      currentLayerType: 'vector', // 'vector' | 'satellite' | 'satellite_road'
      satelliteLayer: null,
      roadNetLayer: null
    };
  },
  computed: {
    metricText() {
      const pinCount = this.clusterList.length;
      const photoCount = this.clusterList.reduce(
        (sum, c) => sum + (c.photos ? c.photos.length : 0),
        0
      );
      return `${pinCount} 处足迹 · ${photoCount} 张照片`;
    },
    currentAtlasName() {
      if (this.currentAtlas) return this.currentAtlas.name;
      if (this.selectedAtlasId === 'all') return '全图卷 (全部足迹)';
      const found = this.atlasList.find((a) => a.id === this.selectedAtlasId);
      return found ? found.name : '光影图志';
    },
    currentEffectLabel() {
      const map = {
        scroll: '拟物双轴',
        cinematic: '镜头下沉',
        ink: '水墨晕染'
      };
      return map[this.entryEffect] || '拟物双轴';
    },
    currentEffectIcon() {
      const map = {
        scroll: '📜',
        cinematic: '🎬',
        ink: '🖌️'
      };
      return map[this.entryEffect] || '📜';
    },
    currentLayerLabel() {
      const map = {
        vector: '矢量底图',
        satellite: '实景卫星',
        satellite_road: '卫星路网'
      };
      return map[this.currentLayerType] || '矢量底图';
    },
    currentLayerIcon() {
      const map = {
        vector: '🗺️',
        satellite: '🛰️',
        satellite_road: '🌐'
      };
      return map[this.currentLayerType] || '🗺️';
    }
  },
  watch: {
    async '$route.params.id'(newId) {
      this.selectedAtlasId = newId || 'all';
      const allowed = await this.checkAuthAndRoute();
      if (allowed) {
        await this.loadFootprintData();
      }
    }
  },
  async mounted() {
    const allowed = await this.checkAuthAndRoute();
    if (!allowed) return;

    await this.fetchSysMapConfig();
    await this.fetchAtlases();
    await this.fetchTags();
    await this.initMapEngine();
    this.applyThemeForEffect(this.entryEffect);
    await this.loadFootprintData();
  },
  beforeUnmount() {
    this.destroyMapInstances();
  },
  methods: {
    // 入场动效切换与重播
    handleEffectChange(effect) {
      this.entryEffect = effect;
      localStorage.setItem('atlas_entry_effect', effect);
      this.applyThemeForEffect(effect);
      this.replayEntryAnimation();
    },
    replayEntryAnimation() {
      this.$nextTick(() => {
        this.$refs.entryOverlay?.play();
      });
    },
    onEntryUnfoldComplete() {
      // 动画完全展开时的回调钩子
    },
    applyThemeForEffect(effect) {
      const mapEl = document.getElementById('atlas-map');
      if (this.engineMode === 'amap' && this.mapInstance) {
        if (this.currentLayerType === 'vector') {
          if (effect === 'scroll') {
            this.mapInstance.setMapStyle('amap://styles/dark');
            if (this.mapInstance.setPitch) this.mapInstance.setPitch(15);
            if (mapEl) mapEl.style.filter = 'none';
          } else if (effect === 'cinematic') {
            const rawStyle = this.mapConfig.amap_style || 'whitesmoke';
            const style = rawStyle.startsWith('amap://styles/') ? rawStyle : `amap://styles/${rawStyle}`;
            this.mapInstance.setMapStyle(style);
            if (this.mapInstance.setPitch) this.mapInstance.setPitch(38);
            if (mapEl) mapEl.style.filter = 'sepia(22%) contrast(105%) brightness(98%)';
          } else if (effect === 'ink') {
            this.mapInstance.setMapStyle('amap://styles/whitesmoke');
            if (this.mapInstance.setPitch) this.mapInstance.setPitch(0);
            if (mapEl) mapEl.style.filter = 'grayscale(35%) sepia(20%) contrast(108%)';
          }
        }
      }
    },

    goToDashboard() {
      this.$router.push('/dashboard');
    },
    goToAtlasManage() {
      this.$router.push('/atlasManage');
    },

    // 0. 路由权限与公开/私密鉴权校验
    async checkAuthAndRoute() {
      // 检查管理员身份（通过 sessionCheck 接口校验真实 Cookie 会话）
      try {
        const authRes = await axios.get('/api/auth/sessionCheck', { withCredentials: true });
        const data = authRes.data || {};
        if (!data.adminRequired || (data.valid && data.authType === 'admin')) {
          this.isAdmin = true;
          this.$store.commit('setAdminLoggedIn', true);
        } else {
          this.isAdmin = false;
          this.$store.commit('setAdminLoggedIn', false);
        }
      } catch (e) {
        this.isAdmin = Boolean(this.$store.state.adminLoggedIn);
      }

      // 获取动态路由参数 /atlas/:id
      const routeId = this.$route.params.id || this.$route.query.id;
      this.selectedAtlasId = routeId || 'all';

      // 规则 A: 全量系统图志（全图卷）仅允许管理员查看
      if (this.selectedAtlasId === 'all') {
        if (!this.isAdmin) {
          this.$message.warning('全图卷为系统全量视图，请先登录管理员账号');
          this.$router.push('/adminLogin?redirect=' + encodeURIComponent(this.$route.fullPath));
          return false;
        }
        return true;
      }

      // 规则 B: 具体图志按公开状态拦截
      try {
        const res = await axios.get(`/api/manage/atlas/${this.selectedAtlasId}`);
        this.currentAtlas = res.data?.data;
        if (!this.currentAtlas?.isPublic && !this.isAdmin) {
          this.$message.warning('该图志为私密图志，请先登录管理员账号');
          this.$router.push('/adminLogin?redirect=' + encodeURIComponent(this.$route.fullPath));
          return false;
        }
        return true;
      } catch (err) {
        if (!this.isAdmin) {
          this.$message.warning('该图志不存在或已设为私密，请先登录');
          this.$router.push('/adminLogin?redirect=' + encodeURIComponent(this.$route.fullPath));
          return false;
        }
        return true;
      }
    },

    // 切换图志 (管理员操作)
    onAtlasChange(newId) {
      this.selectedAtlasId = newId;
      if (newId === 'all') {
        this.$router.push('/atlas');
      } else {
        this.$router.push(`/atlas/${newId}`);
      }
      this.loadFootprintData();
    },

    // 1. 获取系统地图设置
    async fetchSysMapConfig() {
      try {
        const res = await axios.get('/api/manage/sysConfig/page', { withAuthCode: true });
        const configs = res.data?.config || [];
        configs.forEach((item) => {
          if (item.id === 'amap_enable') this.mapConfig.amap_enable = Boolean(item.value);
          if (item.id === 'amap_api_key') this.mapConfig.amap_api_key = String(item.value || '').trim();
          if (item.id === 'amap_security_code') this.mapConfig.amap_security_code = String(item.value || '').trim();
          if (item.id === 'amap_style') this.mapConfig.amap_style = String(item.value || 'whitesmoke');
          if (item.id === 'amap_show_poi') this.mapConfig.amap_show_poi = Boolean(item.value);
          if (item.id === 'amap_view_mode') this.mapConfig.amap_view_mode = Boolean(item.value);
          if (item.id === 'amap_layer_type') this.mapConfig.amap_layer_type = String(item.value || 'vector');
          if (item.id === 'amap_control_bar') this.mapConfig.amap_control_bar = Boolean(item.value);
        });
        this.currentLayerType = this.mapConfig.amap_layer_type || 'vector';

        if (this.mapConfig.amap_enable && this.mapConfig.amap_api_key) {
          this.engineMode = 'amap';
        } else {
          this.engineMode = 'leaflet';
        }
      } catch (err) {
        console.warn('获取地图配置失败，采用 Leaflet 默认底图:', err);
        this.engineMode = 'leaflet';
      }
    },

    // 2. 获取图志列表
    async fetchAtlases() {
      try {
        const res = await axios.get('/api/manage/atlas', { withAuthCode: true });
        this.atlasList = res.data?.data || res.data?.atlases || [];
      } catch (err) {
        console.error('获取图志列表失败:', err);
      }
    },

    // 3. 获取标签治理列表
    async fetchTags() {
      try {
        const res = await axios.get('/api/manage/tags/governance', { withAuthCode: true });
        const raw = res.data?.data || res.data?.tags || [];
        this.availableTags = raw.filter((t) => (t.geotaggedCount ?? 0) > 0).slice(0, 10).map((t) => ({
          name: t.tag || t.name,
          count: t.count ?? t.totalCount ?? 0
        }));
      } catch (err) {
        console.warn('获取系统标签失败:', err);
      }
    },

    // 4. 动态加载 Leaflet / 高德 2.0 并初始化地图
    async initMapEngine() {
      if (this.engineMode === 'amap') {
        await this.loadAmapScript();
        this.initAmapInstance();
      } else {
        await this.loadLeafletScript();
        this.initLeafletInstance();
      }
    },

    loadLeafletScript() {
      return new Promise((resolve) => {
        if (window.L) return resolve(window.L);

        // 注入 Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // 注入 Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve(window.L);
        document.head.appendChild(script);
      });
    },

    loadAmapScript() {
      return new Promise((resolve, reject) => {
        if (window.AMap) return resolve(window.AMap);

        if (this.mapConfig.amap_security_code) {
          window._AMapSecurityConfig = {
            securityJsCode: this.mapConfig.amap_security_code
          };
        }

        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(this.mapConfig.amap_api_key)}`;
        script.onload = () => resolve(window.AMap);
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
      });
    },

    initLeafletInstance() {
      const L = window.L;
      if (!L) return;

      this.mapInstance = L.map('atlas-map', {
        zoomControl: false,
        attributionControl: false
      }).setView([35.0, 105.0], 4);

      // 高德浅色栅格瓦片 (style=7 无偏移纠偏)
      L.tileLayer(
        'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
        {
          subdomains: ['1', '2', '3', '4'],
          maxZoom: 18,
          minZoom: 3
        }
      ).addTo(this.mapInstance);

      this.markerLayerGroup = L.layerGroup().addTo(this.mapInstance);
    },

    initAmapInstance() {
      const AMap = window.AMap;
      if (!AMap) return;

      const rawStyle = this.mapConfig.amap_style || 'whitesmoke';
      const mapStyle = rawStyle.startsWith('amap://styles/') ? rawStyle : `amap://styles/${rawStyle}`;
      const is3D = Boolean(this.mapConfig.amap_view_mode);

      this.mapInstance = new AMap.Map('atlas-map', {
        zoom: 4,
        center: [105.0, 35.0],
        viewMode: is3D ? '3D' : '2D',
        pitch: is3D ? 35 : 0,
        skyColor: '#1e2430',
        pitchEnable: is3D,
        rotateEnable: is3D,
        mapStyle: mapStyle
      });

      // 初始化卫星图层和路网图层实例
      this.satelliteLayer = new AMap.TileLayer.Satellite();
      this.roadNetLayer = new AMap.TileLayer.RoadNet();

      // 应用默认图层
      if (this.currentLayerType && this.currentLayerType !== 'vector') {
        this.applyAmapLayers(this.currentLayerType);
      }

      // 如果关闭了 POI，则仅保留基础底图要素
      if (!this.mapConfig.amap_show_poi) {
        this.mapInstance.setFeatures(['bg', 'road', 'building']);
      }

      // 如果开启了 3D 罗盘控件
      if (this.mapConfig.amap_control_bar) {
        AMap.plugin(['AMap.ControlBar'], () => {
          const controlBar = new AMap.ControlBar({
            position: { right: '24px', bottom: '110px' },
            showZoomBar: false
          });
          this.mapInstance.addControl(controlBar);
        });
      }
    },

    applyAmapLayers(layerType) {
      if (!this.mapInstance || !window.AMap) return;
      this.currentLayerType = layerType;
      const AMap = window.AMap;
      if (layerType === 'satellite') {
        this.mapInstance.setLayers([this.satelliteLayer]);
      } else if (layerType === 'satellite_road') {
        this.mapInstance.setLayers([this.satelliteLayer, this.roadNetLayer]);
      } else {
        // 矢量底图：使用默认底图图层
        this.mapInstance.setLayers([AMap.createDefaultLayer()]);
      }
    },

    toggleMapLayer() {
      if (this.engineMode !== 'amap') return;
      const order = ['vector', 'satellite', 'satellite_road'];
      const currentIndex = order.indexOf(this.currentLayerType);
      const nextType = order[(currentIndex + 1) % order.length];
      this.applyAmapLayers(nextType);
      const labelMap = {
        vector: '矢量底图',
        satellite: '实景卫星',
        satellite_road: '卫星+路网'
      };
      this.$message.info(`已切换至: ${labelMap[nextType]}`);
    },

    // 5. 拉取足迹数据并渲染散点/聚合
    async loadFootprintData() {
      try {
        let url = '/api/manage/footprint';
        if (this.selectedAtlasId && this.selectedAtlasId !== 'all') {
          url += `?atlasId=${encodeURIComponent(this.selectedAtlasId)}`;
        }
        const res = await axios.get(url, { withAuthCode: true });
        const items = res.data?.footprints || [];

        // 强门禁：严格过滤掉经纬度为空的无效照片
        this.rawFootprintData = items.filter(
          (item) => item.latitude !== null && item.longitude !== null && !isNaN(item.latitude) && !isNaN(item.longitude)
        );

        this.processClusters();
        this.renderMapMarkers();
      } catch (err) {
        console.error('拉取足迹数据失败:', err);
        this.$message.error('加载光影图志足迹失败');
      }
    },

    // 6. 空间散点聚合 (依据约 100m 空间近似度聚合)
    processClusters() {
      let filtered = this.rawFootprintData;

      // 标签过滤
      if (this.selectedTag !== 'all') {
        filtered = filtered.filter((item) => {
          let tags = [];
          if (Array.isArray(item.tags)) tags = item.tags;
          else if (typeof item.tags === 'string') {
            try { tags = JSON.parse(item.tags); } catch { tags = [item.tags]; }
          }
          return tags.includes(this.selectedTag);
        });
      }

      const clusterMap = new Map();

      filtered.forEach((item) => {
        // 保留 3 位小数聚合 (约 110 米)
        const key = `${item.latitude.toFixed(3)}_${item.longitude.toFixed(3)}`;
        if (!clusterMap.has(key)) {
          clusterMap.set(key, {
            key,
            lat: item.latitude,
            lng: item.longitude,
            location: item.location_name || '',
            date: item.date || (item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''),
            tags: [],
            story: item.story_description || '',
            coordText: `${item.latitude.toFixed(4)}° N, ${item.longitude.toFixed(4)}° E`,
            photos: []
          });
        }

        const cluster = clusterMap.get(key);
        cluster.photos.push({
          id: item.id,
          url: item.url || `${window.location.origin}/file/${item.id}`,
          name: item.name || item.id,
          date: item.date || cluster.date,
          location: item.location_name || cluster.location,
          story: item.story_description || cluster.story,
          tags: item.tags || []
        });

        // 合并标签与故事
        if (item.location_name && !cluster.location) cluster.location = item.location_name;
        if (item.story_description && !cluster.story) cluster.story = item.story_description;
      });

      this.clusterList = Array.from(clusterMap.values());
    },

    // 7. 在地图上绘制标记 (Leaflet 或 高德 2.0)
    renderMapMarkers() {
      if (this.engineMode === 'amap') {
        this.renderAmapMarkers();
      } else {
        this.renderLeafletMarkers();
      }
    },

    renderLeafletMarkers() {
      const L = window.L;
      if (!L || !this.mapInstance || !this.markerLayerGroup) return;

      this.markerLayerGroup.clearLayers();
      const bounds = [];

      this.clusterList.forEach((cluster) => {
        // WGS-84 转 GCJ-02
        const [gcjLat, gcjLng] = wgs84ToGcj02(cluster.lat, cluster.lng);
        bounds.push([gcjLat, gcjLng]);

        const firstPhoto = cluster.photos[0];
        const count = cluster.photos.length;

        const pinHtml = `
          <div class="atlas-pin-container ${count > 1 ? 'is-cluster' : ''}">
            <div class="pin-thumb-wrapper">
              <img src="${firstPhoto.url}" class="pin-thumb-img" alt="footprint" />
              ${count > 1 ? `<span class="pin-badge">+${count}</span>` : ''}
            </div>
            <div class="pin-pulse"></div>
          </div>
        `;

        const icon = L.divIcon({
          className: 'atlas-pin-wrapper',
          html: pinHtml,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const marker = L.marker([gcjLat, gcjLng], { icon });
        marker.on('click', () => {
          this.openClusterDrawer(cluster);
        });

        this.markerLayerGroup.addLayer(marker);
      });

      if (bounds.length > 0) {
        this.mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    },

    renderAmapMarkers() {
      const AMap = window.AMap;
      if (!AMap || !this.mapInstance) return;

      if (this.amapMarkers && this.amapMarkers.length) {
        this.mapInstance.remove(this.amapMarkers);
        this.amapMarkers = [];
      }

      const newMarkers = [];

      this.clusterList.forEach((cluster) => {
        const [gcjLat, gcjLng] = wgs84ToGcj02(cluster.lat, cluster.lng);
        const firstPhoto = cluster.photos[0];
        const count = cluster.photos.length;

        const pinDiv = document.createElement('div');
        pinDiv.className = 'atlas-pin-wrapper';
        pinDiv.innerHTML = `
          <div class="atlas-pin-container ${count > 1 ? 'is-cluster' : ''}">
            <div class="pin-thumb-wrapper">
              <img src="${firstPhoto.url}" class="pin-thumb-img" alt="footprint" />
              ${count > 1 ? `<span class="pin-badge">+${count}</span>` : ''}
            </div>
            <div class="pin-pulse"></div>
          </div>
        `;

        pinDiv.addEventListener('click', () => {
          this.openClusterDrawer(cluster);
        });

        const marker = new AMap.Marker({
          position: [gcjLng, gcjLat],
          content: pinDiv,
          offset: new AMap.Pixel(-20, -20)
        });

        newMarkers.push(marker);
      });

      this.mapInstance.add(newMarkers);
      this.amapMarkers = newMarkers;

      if (newMarkers.length > 0) {
        this.mapInstance.setFitView(newMarkers, false, [50, 50, 50, 50], 14);
      }
    },

    // 8. 抽屉交互
    openClusterDrawer(cluster) {
      this.currentCluster = cluster;
      this.activePhoto = cluster.photos && cluster.photos.length ? cluster.photos[0] : null;
      this.isDrawerOpen = true;
    },
    closeDrawer() {
      this.isDrawerOpen = false;
    },
    selectActivePhoto(photo) {
      this.activePhoto = photo;
    },

    // 9. 顶部筛选
    onAtlasChange() {
      this.loadFootprintData();
    },
    filterByTag(tagName) {
      this.selectedTag = tagName;
      this.processClusters();
      this.renderMapMarkers();
    },

    // 10. 编辑弹窗与微型选点地图
    openNewPinModal() {
      this.editForm = {
        id: '',
        location_name: '',
        latitude: null,
        longitude: null,
        coordsText: '',
        story_description: ''
      };
      this.showEditDialog = true;
      this.$nextTick(() => {
        this.initPickerMiniMap();
      });
    },

    openEditModalForCurrent() {
      if (!this.activePhoto) return;
      this.editForm = {
        id: this.activePhoto.id,
        location_name: this.currentCluster.location || '',
        latitude: this.currentCluster.lat,
        longitude: this.currentCluster.lng,
        coordsText: `${this.currentCluster.lat.toFixed(6)}, ${this.currentCluster.lng.toFixed(6)}`,
        story_description: this.activePhoto.story || this.currentCluster.story || ''
      };
      this.showEditDialog = true;
      this.$nextTick(() => {
        this.initPickerMiniMap([this.currentCluster.lat, this.currentCluster.lng]);
      });
    },

    initPickerMiniMap(initialCoords = null) {
      const L = window.L;
      if (!L) return;

      const container = document.getElementById('picker-map');
      if (!container) return;

      if (this.pickerMapInstance) {
        this.pickerMapInstance.remove();
        this.pickerMapInstance = null;
      }

      let center = [30.25, 120.15]; // 默认杭州西湖
      if (initialCoords && initialCoords[0] && initialCoords[1]) {
        center = wgs84ToGcj02(initialCoords[0], initialCoords[1]);
      }

      this.pickerMapInstance = L.map('picker-map', {
        zoomControl: false,
        attributionControl: false
      }).setView(center, 12);

      L.tileLayer(
        'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
        { subdomains: ['1', '2', '3', '4'], maxZoom: 18 }
      ).addTo(this.pickerMapInstance);

      if (initialCoords && initialCoords[0] && initialCoords[1]) {
        this.pickerMarker = L.marker(center).addTo(this.pickerMapInstance);
      }

      // 点击地图拾取坐标
      this.pickerMapInstance.on('click', (e) => {
        const gcjLat = e.latlng.lat;
        const gcjLng = e.latlng.lng;
        const [wgsLat, wgsLng] = gcj02ToWgs84(gcjLat, gcjLng);

        this.editForm.latitude = parseFloat(wgsLat.toFixed(6));
        this.editForm.longitude = parseFloat(wgsLng.toFixed(6));
        this.editForm.coordsText = `${this.editForm.latitude}, ${this.editForm.longitude}`;

        if (!this.pickerMarker) {
          this.pickerMarker = L.marker([gcjLat, gcjLng]).addTo(this.pickerMapInstance);
        } else {
          this.pickerMarker.setLatLng([gcjLat, gcjLng]);
        }
      });
    },

    clearEditCoords() {
      this.editForm.latitude = null;
      this.editForm.longitude = null;
      this.editForm.coordsText = '';
      if (this.pickerMarker && this.pickerMapInstance) {
        this.pickerMapInstance.removeLayer(this.pickerMarker);
        this.pickerMarker = null;
      }
    },

    async saveEditForm() {
      if (!this.editForm.id) {
        this.$message.warning('请输入或指定照片 ID');
        return;
      }

      this.savingEdit = true;
      try {
        await axios.post('/api/manage/footprint', {
          id: this.editForm.id,
          latitude: this.editForm.latitude,
          longitude: this.editForm.longitude,
          location_name: this.editForm.location_name,
          story_description: this.editForm.story_description
        }, { withAuthCode: true });

        this.$message.success('打卡故事保存成功');
        this.showEditDialog = false;
        await this.loadFootprintData();
      } catch (err) {
        console.error('保存打卡信息失败:', err);
        this.$message.error(err.response?.data?.message || '保存打卡信息失败');
      } finally {
        this.savingEdit = false;
      }
    },

    destroyMapInstances() {
      if (this.mapInstance) {
        if (this.engineMode === 'leaflet' && typeof this.mapInstance.remove === 'function') {
          this.mapInstance.remove();
        } else if (this.engineMode === 'amap' && typeof this.mapInstance.destroy === 'function') {
          this.mapInstance.destroy();
        }
        this.mapInstance = null;
      }
      if (this.pickerMapInstance && typeof this.pickerMapInstance.remove === 'function') {
        this.pickerMapInstance.remove();
        this.pickerMapInstance = null;
      }
    }
  }
};
</script>

<style scoped>
.photo-atlas-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  user-select: none;
}

.map-viewport {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

/* 顶部悬浮控制栏 */
.top-nav-island {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  width: 94%;
  max-width: 1100px;
}

.glass-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 18px;
  box-shadow: 0 10px 30px -4px rgba(15, 23, 42, 0.08);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.nav-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn-icon:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.brand-title {
  display: flex;
  align-items: center;
}

.brand-text {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.atlas-selector {
  width: 160px;
}

.atlas-opt-name {
  float: left;
  font-size: 13px;
}

.atlas-opt-tag {
  float: right;
  margin-top: 5px;
}

/* 标签过滤器 */
.nav-center-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 4px;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  background: #f1f5f9;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.tag-pill:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.tag-pill.active {
  background: #0f172a;
  color: #ffffff;
}

.tag-count {
  font-size: 11px;
  opacity: 0.75;
}

/* 右侧按钮群 */
.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.effect-dropdown {
  display: flex;
  align-items: center;
}

.effect-switcher-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 10px;
  color: #856116;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.effect-switcher-btn:hover {
  background: rgba(212, 175, 55, 0.22);
  border-color: #d4af37;
  color: #5d4615;
}

.effect-icon {
  font-size: 13px;
}

.effect-arrow {
  font-size: 10px;
  margin-left: 2px;
  color: #856116;
  transition: transform 0.2s ease;
}

.replay-btn {
  color: #856116;
  background: rgba(212, 175, 55, 0.1);
  border-color: rgba(212, 175, 55, 0.3);
}

.replay-btn:hover {
  background: rgba(212, 175, 55, 0.25);
  color: #5d4615;
  transform: rotate(180deg);
}

:deep(.atlas-effect-menu) {
  border-radius: 12px;
  padding: 6px;
}

:deep(.atlas-effect-menu .el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

:deep(.atlas-effect-menu .el-dropdown-menu__item.is-active) {
  background: rgba(212, 175, 55, 0.15);
  color: #856116;
  font-weight: 700;
}

.metric-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.metric-icon {
  color: #2563eb;
}

.action-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease;
}

.action-btn-primary:hover {
  background: #1d4ed8;
}

.action-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.action-btn-secondary:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

/* 侧边滑出故事手记抽屉 */
.story-drawer {
  position: absolute;
  top: 86px;
  right: 20px;
  bottom: 20px;
  width: 400px;
  max-width: calc(100vw - 40px);
  z-index: 30;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  box-shadow: 0 20px 40px -8px rgba(15, 23, 42, 0.15);
  display: flex;
  flex-direction: column;
  padding: 20px;
  transform: translateX(120%);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out;
}

.story-drawer.is-open {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
}

.drawer-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.drawer-date-badge {
  padding: 2px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
}

.drawer-category-badge {
  font-size: 12px;
  font-weight: 500;
  color: #2563eb;
}

.drawer-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.drawer-close-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
}

.drawer-close-btn:hover {
  color: #0f172a;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-item.active {
  border-color: #2563eb;
}

.story-section .section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin: 0 0 8px 0;
}

.story-content {
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
  margin: 0;
  white-space: pre-line;
}

.story-content.empty {
  color: #94a3b8;
  font-style: italic;
}

.metadata-box {
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-label {
  color: #64748b;
}

.meta-val {
  color: #0f172a;
  font-weight: 500;
}

.drawer-footer {
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  text-decoration: none;
}

.footer-link:hover {
  color: #2563eb;
}

.btn-dark {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-dark:hover {
  background: #1e293b;
}

/* 地图选点打卡弹窗 */
.edit-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.form-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.picker-map-wrapper {
  position: relative;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.picker-map {
  width: 100%;
  height: 100%;
}

.picker-tip {
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 400;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-radius: 6px;
  font-size: 11px;
  color: #334155;
  border: 1px solid #f1f5f9;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 地图 Pin 样式 (深色高质感微缩图钉与脉冲动效) */
:deep(.atlas-pin-wrapper) {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

:deep(.atlas-pin-container) {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.pin-thumb-wrapper) {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  background: #0f172a;
  z-index: 2;
  transition: transform 0.2s ease;
}

:deep(.atlas-pin-container:hover .pin-thumb-wrapper) {
  transform: scale(1.18);
  border-color: #2563eb;
}

:deep(.pin-thumb-img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:deep(.pin-badge) {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #2563eb;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 8px;
  border: 1.5px solid #ffffff;
  z-index: 3;
}

:deep(.pin-pulse) {
  position: absolute;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.35);
  z-index: 1;
  animation: pinPulse 2.4s infinite ease-out;
}

@keyframes pinPulse {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0; }
}

.visitor-atlas-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.2);
  border: 1px solid rgba(37, 99, 235, 0.4);
  backdrop-filter: blur(8px);
}

.atlas-badge-text {
  font-size: 13px;
  font-weight: 600;
  color: #93c5fd;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
  .top-nav-island {
    top: 10px;
    width: 96%;
  }
  .glass-bar {
    padding: 6px 10px;
    gap: 8px;
  }
  .atlas-selector {
    width: 120px;
  }
  .story-drawer {
    top: 76px;
    right: 10px;
    bottom: 10px;
    width: calc(100vw - 20px);
    max-width: none;
    border-radius: 18px;
    padding: 16px;
  }
  .form-row-2 {
    grid-template-columns: 1fr;
  }
}
</style>
