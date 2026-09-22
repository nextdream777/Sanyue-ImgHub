<template>
  <div class="atlas-manage-page">
    <el-header>
      <div class="header-content admin-header-content">
        <DashboardTabs activeTab="atlasManage" />
        <div class="header-action">
          <el-tooltip :disabled="disableTooltip" content="退出登录" placement="bottom">
            <font-awesome-icon icon="sign-out-alt" class="header-icon" @click="handleLogout" />
          </el-tooltip>
        </div>
      </div>
    </el-header>

    <main class="manage-main-content">
      <div class="page-title-bar">
        <div class="title-left">
          <h1 class="page-title">图志编排与标签治理</h1>
          <p class="page-subtitle">管理自定义光影图志分类策展，规范治理全系统空间标签与目录</p>
        </div>
      </div>

      <!-- 双页签切换 -->
      <el-tabs v-model="activeTab" class="manage-tabs">
        <!-- 页签 1: 图志编排 -->
        <el-tab-pane label="图志编排 (Atlases)" name="atlases">
          <div class="tab-toolbar">
            <div class="toolbar-left">
              <el-button type="primary" class="btn-create" @click="openCreateAtlasDialog">
                <font-awesome-icon icon="plus" class="btn-icon" />
                <span>新建图志</span>
              </el-button>
            </div>
            <div class="toolbar-right">
              <el-input
                v-model="atlasSearchQuery"
                placeholder="搜索图志名称..."
                prefix-icon="Search"
                clearable
                class="search-input"
              />
            </div>
          </div>

          <!-- 图志卡片 Grid -->
          <div class="atlas-grid" v-loading="loadingAtlases">
            <!-- 系统主图志 (置顶锁定) -->
            <div class="atlas-card system-atlas-card">
              <div class="card-cover">
                <div class="cover-gradient"></div>
                <div class="system-badge">
                  <font-awesome-icon icon="shield-alt" />
                  <span>系统主图志</span>
                </div>
                <div class="cover-info">
                  <h3 class="card-title">全量足迹图志</h3>
                  <p class="card-desc">自动归集全库所有携带有效 GPS 地理坐标的照片与视频</p>
                </div>
              </div>
              <div class="card-body">
                <div class="rule-pills">
                  <span class="rule-tag">全量地理照片</span>
                  <span class="rule-tag">自动实时同步</span>
                </div>
                <div class="card-footer">
                  <span class="stat-text">系统内置 · 不可删除</span>
                  <el-button type="primary" link @click="viewInAtlas('all')">
                    <font-awesome-icon icon="map-marked-alt" class="btn-icon" />
                    <span>在图卷中查看</span>
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 用户自定义图志卡片 -->
            <div
              v-for="atlas in filteredAtlases"
              :key="atlas.id"
              class="atlas-card"
            >
              <div class="card-cover">
                <img
                  v-if="atlas.cover_url"
                  :src="atlas.cover_url"
                  alt="cover"
                  class="cover-img"
                  loading="lazy"
                />
                <div v-else class="cover-placeholder">
                  <font-awesome-icon icon="image" class="placeholder-icon" />
                </div>
                <div class="cover-gradient"></div>
                <div class="system-badge" v-if="atlas.isPublic || atlas.is_public" style="background: rgba(16, 185, 129, 0.85); left: auto; right: 12px;">
                  <font-awesome-icon icon="globe" />
                  <span>公开图志</span>
                </div>
                <div class="system-badge" v-else style="background: rgba(100, 116, 139, 0.85); left: auto; right: 12px;">
                  <font-awesome-icon icon="lock" />
                  <span>私密图志</span>
                </div>
                <div class="cover-info">
                  <h3 class="card-title" :title="atlas.name">{{ atlas.name }}</h3>
                  <p class="card-desc" :title="atlas.description">{{ atlas.description || '暂无图志描述' }}</p>
                </div>
              </div>

              <div class="card-body">
                <!-- 关联规则信息 -->
                <div class="rule-section">
                  <div class="rule-row" v-if="(atlas.rules?.directories && atlas.rules.directories.length) || (atlas.queryRules?.directories && atlas.queryRules.directories.length)">
                    <span class="rule-label">关联目录:</span>
                    <div class="rule-tags-wrap">
                      <span
                        v-for="dir in (atlas.rules?.directories || atlas.queryRules?.directories)"
                        :key="dir"
                        class="rule-pill dir-pill"
                      >
                        {{ dir }}
                      </span>
                    </div>
                  </div>
                  <div class="rule-row" v-if="(atlas.rules?.tags && atlas.rules.tags.length) || (atlas.queryRules?.tags && atlas.queryRules.tags.length)">
                    <span class="rule-label">关联标签:</span>
                    <div class="rule-tags-wrap">
                      <span
                        v-for="tag in (atlas.rules?.tags || atlas.queryRules?.tags)"
                        :key="tag"
                        class="rule-pill tag-pill"
                      >
                        #{{ tag }}
                      </span>
                    </div>
                  </div>
                  <div class="rule-row" v-if="!atlas.rules?.directories?.length && !atlas.rules?.tags?.length && !atlas.queryRules?.directories?.length && !atlas.queryRules?.tags?.length">
                    <span class="rule-label">规则:</span>
                    <span class="rule-text-muted">手动策展收录</span>
                  </div>
                </div>

                <div class="card-footer">
                  <div class="card-actions">
                    <el-button link type="primary" @click="viewInAtlas(atlas.id)">
                      <font-awesome-icon icon="map-marked-alt" class="btn-icon" />
                      <span>在图卷中查看</span>
                    </el-button>
                    <el-button link type="default" @click="openEditAtlasDialog(atlas)">
                      <font-awesome-icon icon="edit" class="btn-icon" />
                      <span>编辑</span>
                    </el-button>
                    <el-button link type="danger" @click="confirmDeleteAtlas(atlas)">
                      <font-awesome-icon icon="trash-alt" class="btn-icon" />
                      <span>删除</span>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 页签 2: 全局标签治理 -->
        <el-tab-pane label="标签治理 (Tag Governance)" name="tags">
          <div class="tab-toolbar">
            <div class="toolbar-left">
              <el-button type="primary" class="btn-create" @click="openCreateTagDialog">
                <font-awesome-icon icon="plus" class="btn-icon" />
                <span>新建标签</span>
              </el-button>
              <el-button type="danger" plain @click="confirmCleanDeadTags" :loading="cleaningTags">
                <font-awesome-icon icon="trash-alt" class="btn-icon" />
                <span>清理无引用死标签</span>
              </el-button>
            </div>
            <div class="toolbar-right">
              <el-input
                v-model="tagSearchQuery"
                placeholder="搜索标签名称..."
                prefix-icon="Search"
                clearable
                class="search-input"
              />
            </div>
          </div>

          <!-- 标签数据表格 -->
          <el-table
            :data="filteredTags"
            v-loading="loadingTags"
            class="tag-table"
            style="width: 100%"
          >
            <el-table-column prop="name" label="标签名称" min-width="180">
              <template #default="{ row }">
                <div class="tag-name-cell">
                  <font-awesome-icon icon="tag" class="tag-cell-icon" />
                  <span class="tag-name-text">{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="totalCount" label="关联照片总数" width="160" sortable align="center">
              <template #default="{ row }">
                <span class="count-badge">{{ row.totalCount }} 张</span>
              </template>
            </el-table-column>

            <el-table-column prop="geotaggedCount" label="带坐标照片" min-width="200" sortable>
              <template #default="{ row }">
                <div class="geo-stat-wrap">
                  <span class="geo-count-text">{{ row.geotaggedCount }} / {{ row.totalCount }}</span>
                  <el-progress
                    :percentage="row.totalCount > 0 ? Math.round((row.geotaggedCount / row.totalCount) * 100) : 0"
                    :stroke-width="6"
                    :show-text="false"
                    class="geo-progress"
                  />
                  <span class="geo-pct-text">
                    {{ row.totalCount > 0 ? Math.round((row.geotaggedCount / row.totalCount) * 100) : 0 }}%
                  </span>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="220" align="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openMergeTagDialog(row)">
                  <font-awesome-icon icon="sync-alt" class="btn-icon" />
                  <span>重命名/合并</span>
                </el-button>
                <el-button link type="danger" size="small" @click="confirmDeleteTag(row)">
                  <font-awesome-icon icon="trash-alt" class="btn-icon" />
                  <span>删除</span>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </main>

    <!-- 图志创建/编辑弹窗 -->
    <el-dialog
      v-model="showAtlasDialog"
      :title="editingAtlasId ? '编辑图志' : '新建光影图志'"
      width="640px"
      :close-on-click-modal="false"
      class="atlas-form-dialog"
    >
      <el-form :model="atlasForm" label-position="top" class="atlas-dialog-form">
        <el-form-item label="图志名称" required>
          <el-input v-model="atlasForm.name" placeholder="例如：2023 西湖漫步 / 城市天际线" />
        </el-form-item>

        <el-form-item label="策展手记 / 描述">
          <el-input
            v-model="atlasForm.description"
            type="textarea"
            :rows="2"
            placeholder="写下关于本图志的整体策展主题或心情记录..."
          />
        </el-form-item>

        <el-form-item label="关联目录 (自动收录该目录下所有带坐标照片)">
          <el-select
            v-model="atlasForm.directories"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入目录路径，如 /travel/hangzhou"
            style="width: 100%"
          >
            <el-option
              v-for="dir in availableDirectories"
              :key="dir"
              :label="dir"
              :value="dir"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="关联标签 (自动收录带有这些标签的带坐标照片)">
          <el-select
            v-model="atlasForm.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入标签，如 建筑, 风光"
            style="width: 100%"
          >
            <el-option
              v-for="tag in tags"
              :key="tag.name"
              :label="`#${tag.name} (${tag.totalCount || 0}张)`"
              :value="tag.name"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="封面图片 URL (可选，留空将自动采用第一张可用照片)">
          <el-input v-model="atlasForm.cover_url" placeholder="https://... 或 /file/..." />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="14">
            <el-form-item label="公开状态">
              <el-switch
                v-model="atlasForm.is_public"
                active-text="公开 (任何人通过链接免密查看)"
                inactive-text="私密 (需登录)"
              />
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="显示排序">
              <el-input-number v-model="atlasForm.sort_order" :min="0" :max="999" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <div class="dialog-actions">
          <el-button @click="showAtlasDialog = false">取消</el-button>
          <el-button type="primary" :loading="savingAtlas" @click="saveAtlas">
            确认保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 标签合并/重命名弹窗 -->
    <el-dialog
      v-model="showMergeTagDialog"
      title="标签重命名与合并"
      width="460px"
      class="merge-tag-dialog"
    >
      <div class="merge-dialog-content">
        <p class="merge-tip">
          将现有标签 <strong>#{{ currentMergeSourceTag }}</strong> 的所有照片变更为目标标签。若目标标签已存在，则自动执行合并归集。
        </p>
        <div class="form-item">
          <label class="form-label">目标标签名称</label>
          <el-input v-model="targetTagName" placeholder="输入新标签名，例如：杭州" />
        </div>
      </div>
      <template #footer>
        <div class="dialog-actions">
          <el-button @click="showMergeTagDialog = false">取消</el-button>
          <el-button type="primary" :loading="savingMergeTag" @click="submitMergeTag">
            确认合并
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 新建标签弹窗 -->
    <el-dialog
      v-model="showCreateTagDialog"
      title="新建全局标签"
      width="440px"
      class="create-tag-dialog"
    >
      <div class="create-tag-content" style="padding: 10px 0;">
        <div class="form-item">
          <label class="form-label" style="display: block; margin-bottom: 8px; font-weight: 600;">标签名称</label>
          <el-input
            v-model="newTagName"
            placeholder="例如：杭州、日落、建筑"
            @keyup.enter="submitCreateTag"
          />
        </div>
      </div>
      <template #footer>
        <div class="dialog-actions">
          <el-button @click="showCreateTagDialog = false">取消</el-button>
          <el-button type="primary" @click="submitCreateTag">
            确认新建
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import DashboardTabs from '@/components/DashboardTabs.vue';
import axios from '@/utils/axios';
import { ElMessageBox, ElMessage } from 'element-plus';

export default {
  name: 'AtlasManage',
  components: {
    DashboardTabs
  },
  data() {
    return {
      activeTab: 'atlases',

      // 图志列表
      atlases: [],
      loadingAtlases: false,
      atlasSearchQuery: '',

      // 标签列表
      tags: [],
      loadingTags: false,
      tagSearchQuery: '',
      cleaningTags: false,

      // 目录列表
      availableDirectories: [],

      // 图志编辑表单
      showAtlasDialog: false,
      savingAtlas: false,
      editingAtlasId: null,
      atlasForm: {
        name: '',
        description: '',
        directories: [],
        tags: [],
        cover_url: '',
        is_public: false,
        sort_order: 0
      },

      // 标签合并弹窗
      showMergeTagDialog: false,
      savingMergeTag: false,
      currentMergeSourceTag: '',
      targetTagName: '',

      // 新建标签弹窗
      showCreateTagDialog: false,
      newTagName: ''
    };
  },
  computed: {
    disableTooltip() {
      return window.innerWidth < 768;
    },
    filteredAtlases() {
      if (!this.atlasSearchQuery) return this.atlases;
      const q = this.atlasSearchQuery.toLowerCase();
      return this.atlases.filter(
        (a) =>
          (a.name && a.name.toLowerCase().includes(q)) ||
          (a.description && a.description.toLowerCase().includes(q))
      );
    },
    filteredTags() {
      if (!this.tagSearchQuery) return this.tags;
      const q = this.tagSearchQuery.toLowerCase();
      return this.tags.filter((t) => t.name && t.name.toLowerCase().includes(q));
    }
  },
  async mounted() {
    await this.fetchDirectories();
    await this.fetchAtlases();
    await this.fetchTags();
  },
  methods: {
    handleLogout() {
      axios.post('/api/auth/logout', { authType: 'admin' }, { withCredentials: true }).finally(() => {
        this.$store.commit('setAdminLoggedIn', false);
        this.$router.push('/adminLogin');
      });
    },

    // 1. 目录树获取
    async fetchDirectories() {
      try {
        const res = await axios.get('/api/directoryTree', { withAuthCode: true });
        if (res.data?.tree) {
          const paths = [];
          const traverse = (node, currentPath) => {
            if (node.name && node.name !== 'root') {
              currentPath = currentPath ? `${currentPath}/${node.name}` : `/${node.name}`;
              paths.push(currentPath);
            }
            if (node.children && node.children.length) {
              node.children.forEach((child) => traverse(child, currentPath));
            }
          };
          traverse(res.data.tree, '');
          this.availableDirectories = Array.from(new Set(paths)).sort();
        }
      } catch (err) {
        console.warn('获取目录树失败:', err);
      }
    },

    // 2. 图志管理
    async fetchAtlases() {
      this.loadingAtlases = true;
      try {
        const res = await axios.get('/api/manage/atlas', { withAuthCode: true });
        const list = res.data?.data || res.data?.atlases || [];
        this.atlases = list.map((a) => ({
          ...a,
          cover_url: a.coverUrl || a.cover_url || (a.coverFileId ? `/file/${a.coverFileId}` : ''),
          rules: a.queryRules || a.query_rules || a.rules || {},
          queryRules: a.queryRules || a.query_rules || a.rules || {},
          is_public: Boolean(a.isPublic ?? a.is_public),
          isPublic: Boolean(a.isPublic ?? a.is_public),
          sort_order: a.sortOrder ?? a.sort_order ?? 0,
          sortOrder: a.sortOrder ?? a.sort_order ?? 0
        }));
      } catch (err) {
        console.error('获取图志列表失败:', err);
        ElMessage.error('获取图志列表失败');
      } finally {
        this.loadingAtlases = false;
      }
    },

    viewInAtlas(atlasId) {
      if (atlasId && atlasId !== 'all') {
        this.$router.push(`/atlas/${atlasId}`);
      } else {
        this.$router.push('/atlas');
      }
    },

    openCreateAtlasDialog() {
      this.editingAtlasId = null;
      this.atlasForm = {
        name: '',
        description: '',
        directories: [],
        tags: [],
        cover_url: '',
        is_public: false,
        sort_order: 0
      };
      this.showAtlasDialog = true;
    },

    openEditAtlasDialog(atlas) {
      this.editingAtlasId = atlas.id;
      const rules = atlas.queryRules || atlas.query_rules || atlas.rules || {};
      this.atlasForm = {
        name: atlas.name || '',
        description: atlas.description || '',
        directories: rules.directories ? [...rules.directories] : [],
        tags: rules.tags ? [...rules.tags] : [],
        cover_url: atlas.cover_url || atlas.coverUrl || '',
        is_public: Boolean(atlas.isPublic ?? atlas.is_public),
        sort_order: atlas.sortOrder ?? atlas.sort_order ?? 0
      };
      this.showAtlasDialog = true;
    },

    async saveAtlas() {
      if (!this.atlasForm.name.trim()) {
        ElMessage.warning('请输入图志名称');
        return;
      }

      this.savingAtlas = true;
      try {
        await axios.post(
          '/api/manage/atlas',
          {
            id: this.editingAtlasId || undefined,
            name: this.atlasForm.name.trim(),
            description: this.atlasForm.description.trim(),
            queryRules: {
              directories: this.atlasForm.directories,
              tags: this.atlasForm.tags
            },
            query_rules: {
              directories: this.atlasForm.directories,
              tags: this.atlasForm.tags
            },
            rules: {
              directories: this.atlasForm.directories,
              tags: this.atlasForm.tags
            },
            cover_url: this.atlasForm.cover_url.trim(),
            coverUrl: this.atlasForm.cover_url.trim(),
            is_public: this.atlasForm.is_public,
            isPublic: this.atlasForm.is_public,
            sort_order: this.atlasForm.sort_order,
            sortOrder: this.atlasForm.sort_order
          },
          { withAuthCode: true }
        );

        ElMessage.success(this.editingAtlasId ? '图志更新成功' : '图志创建成功');
        this.showAtlasDialog = false;
        await this.fetchAtlases();
      } catch (err) {
        console.error('保存图志失败:', err);
        ElMessage.error(err.response?.data?.message || '保存图志失败');
      } finally {
        this.savingAtlas = false;
      }
    },

    async confirmDeleteAtlas(atlas) {
      try {
        await ElMessageBox.confirm(
          `确定要删除图志「${atlas.name}」吗？此操作仅删除图志分类关系，不会删除底层的任何原始照片。`,
          '删除确认',
          {
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        await axios.delete(`/api/manage/atlas/${atlas.id}`, { withAuthCode: true });
        ElMessage.success('图志删除成功');
        await this.fetchAtlases();
      } catch (err) {
        if (err !== 'cancel') {
          console.error('删除图志失败:', err);
          ElMessage.error('删除图志失败');
        }
      }
    },

    // 3. 标签治理
    async fetchTags() {
      this.loadingTags = true;
      try {
        const res = await axios.get('/api/manage/tags/governance', { withAuthCode: true });
        const raw = res.data?.data || res.data?.tags || [];
        this.tags = raw.map((t) => ({
          name: t.tag || t.name,
          totalCount: t.count ?? t.totalCount ?? 0,
          geotaggedCount: t.geotaggedCount ?? 0,
          lastUsed: t.lastUsed
        }));
      } catch (err) {
        console.error('获取标签列表失败:', err);
        ElMessage.error('获取标签治理列表失败');
      } finally {
        this.loadingTags = false;
      }
    },

    openCreateTagDialog() {
      this.newTagName = '';
      this.showCreateTagDialog = true;
    },

    submitCreateTag() {
      const tag = this.newTagName.trim();
      if (!tag) {
        ElMessage.warning('请输入标签名称');
        return;
      }
      const exists = this.tags.some((t) => t.name.toLowerCase() === tag.toLowerCase());
      if (exists) {
        ElMessage.info('该标签已存在');
        this.showCreateTagDialog = false;
        return;
      }
      this.tags.unshift({
        name: tag,
        totalCount: 0,
        geotaggedCount: 0,
        lastUsed: Date.now()
      });
      ElMessage.success(`标签「#${tag}」已新建并加入标签池`);
      this.showCreateTagDialog = false;
    },

    openMergeTagDialog(tagRow) {
      this.currentMergeSourceTag = tagRow.name;
      this.targetTagName = '';
      this.showMergeTagDialog = true;
    },

    async submitMergeTag() {
      if (!this.targetTagName.trim()) {
        ElMessage.warning('请输入目标标签名称');
        return;
      }
      if (this.targetTagName.trim() === this.currentMergeSourceTag) {
        ElMessage.warning('目标标签名不能与原标签名一致');
        return;
      }

      this.savingMergeTag = true;
      try {
        await axios.post(
          '/api/manage/tags/governance',
          {
            action: 'merge',
            sourceTag: this.currentMergeSourceTag,
            targetTag: this.targetTagName.trim()
          },
          { withAuthCode: true }
        );

        ElMessage.success('标签合并/重命名成功');
        this.showMergeTagDialog = false;
        await this.fetchTags();
      } catch (err) {
        console.error('合并标签失败:', err);
        ElMessage.error(err.response?.data?.message || '合并标签失败');
      } finally {
        this.savingMergeTag = false;
      }
    },

    async confirmDeleteTag(tagRow) {
      try {
        await ElMessageBox.confirm(
          `确定要移除所有照片上的标签「#${tagRow.name}」吗？此操作不可撤销。`,
          '删除标签确认',
          {
            confirmButtonText: '确定移除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        await axios.post(
          '/api/manage/tags/governance',
          {
            action: 'delete',
            tag: tagRow.name
          },
          { withAuthCode: true }
        );

        ElMessage.success('标签移除成功');
        await this.fetchTags();
      } catch (err) {
        if (err !== 'cancel') {
          console.error('删除标签失败:', err);
          ElMessage.error('删除标签失败');
        }
      }
    },

    async confirmCleanDeadTags() {
      try {
        await ElMessageBox.confirm(
          '将扫描并清理全系统中所有引用次数为 0 的孤立废弃标签，是否继续？',
          '清理死标签',
          {
            confirmButtonText: '立即清理',
            cancelButtonText: '取消',
            type: 'info'
          }
        );

        this.cleaningTags = true;
        await axios.post(
          '/api/manage/tags/governance',
          { action: 'clean_dead' },
          { withAuthCode: true }
        );

        ElMessage.success('已清理全部 0 引用标签');
        await this.fetchTags();
      } catch (err) {
        if (err !== 'cancel') {
          console.error('清理死标签失败:', err);
          ElMessage.error('清理死标签失败');
        }
      } finally {
        this.cleaningTags = false;
      }
    }
  }
};
</script>

<style scoped src="@/styles/admin-common.css"></style>
<style scoped>
.atlas-manage-page {
  background: var(--admin-container-bg-color);
  min-height: 100vh;
  color: var(--admin-container-color);
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  user-select: none;
}

.manage-main-content {
  margin-top: 60px;
  padding: 24px 32px;
  max-width: 1300px;
  margin-left: auto;
  margin-right: auto;
}

.page-title-bar {
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px 0;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

/* 顶部工具栏 */
.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.btn-icon {
  margin-right: 6px;
}

.search-input {
  width: 260px;
}

/* 图志卡片网格 */
.atlas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.atlas-card {
  border-radius: 18px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(16px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.atlas-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.08);
}

.card-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  background: #0f172a;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.atlas-card:hover .cover-img {
  transform: scale(1.05);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e293b, #0f172a);
}

.placeholder-icon {
  font-size: 32px;
  color: rgba(255, 255, 255, 0.2);
}

.cover-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.15) 60%, transparent 100%);
  pointer-events: none;
}

.cover-info {
  position: absolute;
  bottom: 12px;
  left: 14px;
  right: 14px;
  pointer-events: none;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.85);
  backdrop-filter: blur(8px);
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
}

.card-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: space-between;
  gap: 12px;
}

.rule-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rule-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.rule-label {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.rule-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.rule-pill {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.dir-pill {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}

.tag-pill {
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
}

.rule-text-muted {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.stat-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* 标签表格 */
.tag-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-cell-icon {
  color: #2563eb;
  font-size: 13px;
}

.tag-name-text {
  font-weight: 600;
  font-size: 13px;
}

.count-badge {
  font-weight: 600;
  font-size: 13px;
}

.geo-stat-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.geo-count-text {
  font-size: 12px;
  min-width: 60px;
}

.geo-progress {
  flex: 1;
}

.geo-pct-text {
  font-size: 12px;
  font-weight: 600;
  min-width: 38px;
}

/* 弹窗表单 */
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.merge-tip {
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .manage-main-content {
    padding: 16px;
  }
  .atlas-grid {
    grid-template-columns: 1fr;
  }
  .tab-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .search-input {
    width: 100%;
  }
}
</style>
