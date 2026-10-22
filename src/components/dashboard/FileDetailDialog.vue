<template>
    <el-dialog 
        v-model="visible" 
        :title="$t('fileDetail.title')" 
        :width="dialogWidth"
        class="file-detail-dialog-pro"
        destroy-on-close
    >
        <div class="detail-workspace-grid">
            
            <!-- 左栏：媒体视窗与快捷外链分发 (42% 黄金展示区) -->
            <div class="workspace-left-col">
                <!-- 沉浸式多媒体视窗 -->
                <div class="media-display-card">
                    <video 
                        v-if="isVideo" 
                        :src="fileLink" 
                        autoplay 
                        muted 
                        loop 
                        class="display-media-item video-item" 
                        @click="handleVideoClick"
                    ></video>
                    <audio 
                        v-else-if="isAudio" 
                        :src="fileLink" 
                        controls 
                        autoplay 
                        class="display-media-item audio-item"
                    ></audio>
                    <el-image 
                        v-else-if="isImage" 
                        :src="fileLink" 
                        :preview-src-list="[fileLink]"
                        :preview-teleported="true"
                        fit="contain" 
                        lazy 
                        class="display-media-item image-item"
                    >
                        <template #placeholder>
                            <div class="media-skeleton-box"></div>
                        </template>
                        <template #error>
                            <div class="media-error-box" @click="openImageLink">
                                <font-awesome-icon icon="image" class="error-icon" />
                            </div>
                        </template>
                    </el-image>
                    <div v-else class="display-media-item generic-item">
                        <font-awesome-icon icon="file" class="generic-file-icon" />
                    </div>

                    <!-- 悬浮长宽比与尺寸标牌 (左上角) -->
                    <div v-if="imageDimensions" class="floating-dim-badge">
                        <span>{{ file?.metadata?.Width }} × {{ file?.metadata?.Height }}</span>
                        <span v-if="orientationIcon" class="dim-dot">·</span>
                        <span v-if="orientationIcon">{{ orientationIcon }}</span>
                    </div>

                    <!-- 悬浮查看原图按钮 (右上角) -->
                    <button 
                        v-if="fileLink" 
                        type="button" 
                        class="floating-expand-btn" 
                        :title="$t('fileDetail.openOriginal')" 
                        @click.stop="openImageLink"
                    >
                        <font-awesome-icon icon="external-link-alt" />
                    </button>
                </div>

                <!-- 紧凑型外链快速分享卡 -->
                <div class="quick-share-box">
                    <div class="share-box-header">
                        <span class="share-box-title">
                            <font-awesome-icon icon="link" class="share-icon" />
                            {{ $t('fileDetail.shareLinks') }}
                        </span>
                        <el-select v-model="activeTab" size="small" class="format-dropdown">
                            <el-option
                                v-for="fmt in availableUrlFormats"
                                :key="fmt.key"
                                :label="fmt.label"
                                :value="fmt.key"
                            />
                        </el-select>
                    </div>
                    <div class="share-box-input-group">
                        <el-input 
                            v-model="currentUrlValue" 
                            readonly 
                            size="small" 
                            class="share-text-input" 
                            @click="handleUrlClick"
                        >
                            <template #append>
                                <el-button size="small" class="share-copy-btn" @click="copyCurrentUrl">
                                    <font-awesome-icon icon="copy" />
                                </el-button>
                            </template>
                        </el-input>
                    </div>
                </div>

                <!-- 底部高频主操作栏 (下载原图与外链新开) -->
                <div class="left-action-row">
                    <el-button type="primary" plain class="left-bar-btn" @click="$emit('download')">
                        <font-awesome-icon icon="download" class="action-btn-icon" />
                        {{ $t('fileDetail.download') }}
                    </el-button>
                    <el-button type="primary" class="left-bar-btn" @click="openImageLink">
                        <font-awesome-icon icon="external-link-alt" class="action-btn-icon" />
                        {{ $t('fileDetail.openOriginal') }}
                    </el-button>
                </div>
            </div>

            <!-- 右栏：结构化信息分类面板 (58% 内容展示区) -->
            <div class="workspace-right-col">
                
                <!-- 头部工具栏：文件名与核心操作 -->
                <div class="right-col-header">
                    <div class="header-name-block">
                        <el-input
                            v-if="isEditing"
                            v-model="editForm.FileName"
                            size="small"
                            class="name-edit-input"
                            :placeholder="$t('fileDetail.fileNamePlaceholder')"
                        />
                        <h3 v-else class="file-name-heading" :title="file?.metadata?.FileName || file?.name">
                            {{ file?.metadata?.FileName || file?.name }}
                        </h3>
                        <div class="file-subtitle-badges">
                            <span class="badge-mini font-mono">{{ fileSizeDisplay }}</span>
                            <span class="badge-mini font-mono">{{ file?.metadata?.FileType || $t('fileDetail.unknown') }}</span>
                            <el-tag size="small" :type="accessTagType" class="badge-status-tag">{{ accessType }}</el-tag>
                        </div>
                    </div>

                    <!-- 操作按钮组 -->
                    <div class="header-controls">
                        <!-- 非编辑态：编辑按钮 + 更多折叠菜单 -->
                        <template v-if="!isEditing">
                            <el-button size="small" class="pill-ctrl-btn edit-pill-btn" @click="startEdit">
                                <font-awesome-icon icon="edit" class="ctrl-icon text-amber" />
                                {{ $t('fileDetail.edit') }}
                            </el-button>
                            <el-dropdown trigger="click" @command="handleMoreCommand">
                                <el-button size="small" class="pill-ctrl-btn more-pill-btn">
                                    {{ $t('fileDetail.more') }}
                                    <font-awesome-icon icon="angle-down" class="dropdown-arrow-icon" />
                                </el-button>
                                <template #dropdown>
                                    <el-dropdown-menu class="detail-more-menu">
                                        <el-dropdown-item command="rename">
                                            <font-awesome-icon icon="i-cursor" class="menu-item-icon" />
                                            {{ $t('fileDetail.rename') }}
                                        </el-dropdown-item>
                                        <el-dropdown-item command="tags">
                                            <font-awesome-icon icon="tags" class="menu-item-icon" />
                                            {{ $t('fileDetail.tags') }}
                                        </el-dropdown-item>
                                        <el-dropdown-item command="white" divided>
                                            <font-awesome-icon icon="shield-alt" class="menu-item-icon text-emerald" />
                                            {{ $t('fileDetail.whitelist') }}
                                        </el-dropdown-item>
                                        <el-dropdown-item command="block">
                                            <font-awesome-icon icon="ban" class="menu-item-icon text-amber" />
                                            {{ $t('fileDetail.blacklist') }}
                                        </el-dropdown-item>
                                        <el-dropdown-item command="delete" divided class="danger-menu-item">
                                            <font-awesome-icon icon="trash-alt" class="menu-item-icon text-danger" />
                                            {{ $t('fileDetail.deleteBtn') }}
                                        </el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </template>

                        <!-- 编辑态：保存与取消 -->
                        <template v-else>
                            <el-button type="success" size="small" :loading="editSaving" class="save-ctrl-btn" @click="saveMetadata">
                                <font-awesome-icon icon="save" class="ctrl-icon" v-if="!editSaving" />
                                {{ $t('fileDetail.save') }}
                            </el-button>
                            <el-button size="small" class="cancel-ctrl-btn" @click="cancelEdit">
                                {{ $t('fileDetail.cancel') }}
                            </el-button>
                        </template>
                    </div>
                </div>

                <!-- 结构化信息卡片滚动容器 -->
                <div class="cards-scroll-body">
                    
                    <!-- 卡片 1: 📷 摄影硬件与曝光规格 -->
                    <div class="panel-card photo-spec-card">
                        <div class="card-title-bar">
                            <span class="card-title-text">
                                <font-awesome-icon icon="camera" class="title-icon text-cyan" />
                                {{ $t('fileDetail.photoSpecs') }}
                            </span>
                            <span v-if="exifTimeDisplay" class="title-right-badge font-mono">{{ exifTimeDisplay }}</span>
                        </div>

                        <!-- 设备与镜头规格 -->
                        <div class="hardware-grid">
                            <div class="hardware-cell">
                                <span class="cell-label">{{ $t('fileDetail.camera') }}</span>
                                <span class="cell-val" :title="cameraDisplay">{{ cameraDisplay || '-' }}</span>
                            </div>
                            <div class="hardware-cell">
                                <span class="cell-label">{{ $t('fileDetail.lens') }}</span>
                                <span class="cell-val" :title="lensDisplay">{{ lensDisplay || '-' }}</span>
                            </div>
                        </div>

                        <!-- 曝光三要素专业摄影胶囊 -->
                        <div class="exposure-capsules-row">
                            <span v-if="exposureParts.fNumber" class="exposure-capsule font-mono">{{ exposureParts.fNumber }}</span>
                            <span v-if="exposureParts.exposureTime" class="exposure-capsule font-mono">{{ exposureParts.exposureTime }}</span>
                            <span v-if="exposureParts.iso" class="exposure-capsule font-mono">{{ exposureParts.iso }}</span>
                            <span v-if="exposureParts.focalLength" class="exposure-capsule font-mono">{{ exposureParts.focalLength }}</span>
                            <span v-if="exposureBiasDisplay" class="exposure-capsule capsule-bias font-mono">{{ exposureBiasDisplay }}</span>
                            <span v-if="!hasAnyExposure" class="capsule-empty">-</span>
                        </div>
                    </div>

                    <!-- 卡片 2: 📍 地理足迹与空间坐标 -->
                    <div class="panel-card location-spec-card">
                        <div class="card-title-bar">
                            <span class="card-title-text">
                                <font-awesome-icon icon="map-marker-alt" class="title-icon text-emerald" />
                                {{ $t('fileDetail.locationAddress') }}
                            </span>
                            <span v-if="altitudeDisplay" class="title-right-badge badge-altitude font-mono">{{ altitudeDisplay }}</span>
                        </div>

                        <!-- 编辑态 -->
                        <div v-if="isEditing" class="location-edit-box">
                            <el-input
                                v-model="editForm.location_name"
                                size="small"
                                class="loc-input"
                                :placeholder="$t('fileDetail.locationPlaceholder')"
                            />
                            <div class="coords-edit-group">
                                <el-input v-model="editForm.latitude" size="small" placeholder="纬度 (如: 30.2589)" />
                                <el-input v-model="editForm.longitude" size="small" placeholder="经度 (如: 120.1421)" />
                            </div>
                        </div>

                        <!-- 查看态 -->
                        <div v-else class="location-view-box">
                            <p class="location-main-text">
                                <span v-if="resolvedLocationName || fileLocationName">{{ resolvedLocationName || fileLocationName }}</span>
                                <span v-else-if="resolvingGeo" class="text-resolving">正在解析地址...</span>
                                <span v-else class="text-muted">{{ $t('fileDetail.noLocation') }}</span>
                            </p>
                            <div v-if="hasCoordinates" class="location-coords-line">
                                <code class="coords-badge font-mono">{{ coordinatesDisplay }}</code>
                            </div>
                        </div>
                    </div>

                    <!-- 卡片 3: 🏷️ 分类标签体系 -->
                    <div class="panel-card tags-spec-card">
                        <div class="card-title-bar">
                            <span class="card-title-text">
                                <font-awesome-icon icon="tags" class="title-icon text-purple" />
                                {{ $t('fileDetail.fileTags') }}
                            </span>
                            <button type="button" class="tag-manage-action-btn" @click="$emit('tagManagement')">
                                {{ $t('fileDetail.manageTags') }}
                            </button>
                        </div>
                        <div class="tags-capsules-wrap">
                            <template v-if="file?.metadata?.Tags && file?.metadata?.Tags.length > 0">
                                <el-tag 
                                    v-for="tag in file?.metadata?.Tags" 
                                    :key="tag" 
                                    size="small" 
                                    class="meta-color-pill"
                                >{{ tag }}</el-tag>
                            </template>
                            <span v-else class="text-muted text-xs">{{ $t('fileDetail.noTags') }}</span>
                        </div>
                    </div>

                    <!-- 卡片 4: 🛡️ 存储与底层审计信息 (紧凑四宫格) -->
                    <div class="panel-card audit-spec-card">
                        <div class="card-title-bar audit-title-bar">
                            <span class="card-title-text text-muted">
                                <font-awesome-icon icon="shield-alt" class="title-icon" />
                                {{ $t('fileDetail.storageAndAudit') }}
                            </span>
                            <span class="text-xs text-muted font-mono">{{ uploadTime }}</span>
                        </div>
                        <div class="audit-grid">
                            <div class="audit-cell">
                                <span class="audit-label">{{ $t('fileDetail.channelTypeAndName') }}</span>
                                <span class="audit-val">
                                    <el-tag size="small" type="info" class="channel-pill">{{ file?.metadata?.Channel || '-' }}</el-tag>
                                    <span class="channel-name-txt truncate">{{ file?.metadata?.ChannelName || '-' }}</span>
                                </span>
                            </div>
                            <div class="audit-cell">
                                <span class="audit-label">{{ $t('fileDetail.uploadIP') }}</span>
                                <span class="audit-val font-mono">{{ file?.metadata?.UploadIP || '-' }}</span>
                            </div>
                            <div class="audit-cell">
                                <span class="audit-label">{{ $t('fileDetail.uploadAddressLabel') }}</span>
                                <span class="audit-val truncate" :title="file?.metadata?.UploadAddress">{{ file?.metadata?.UploadAddress || '-' }}</span>
                            </div>
                            <div class="audit-cell">
                                <span class="audit-label">{{ $t('fileDetail.accessStatusAndReview') }}</span>
                                <span class="audit-val">
                                    <span :class="accessTagType === 'danger' ? 'text-danger' : 'text-emerald'">{{ accessType }}</span>
                                    <span v-if="file?.metadata?.Label" class="audit-label-hint">({{ file?.metadata?.Label }})</span>
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>

        <!-- 重命名二级弹窗 (保持完整独立逻辑) -->
        <el-dialog
            v-model="showRenameDialog"
            :title="$t('fileDetail.renameTitle')"
            :width="dialogWidth"
            append-to-body
        >
            <el-form @submit.prevent="submitRename">
                <el-form-item :label="$t('fileDetail.renameLabel')" :error="renameValidation.error">
                    <el-input
                        v-model="renameForm.newFileId"
                        :placeholder="$t('fileDetail.renamePlaceholder')"
                        @input="validateRenameInput"
                        clearable
                    ></el-input>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="closeRenameDialog()">{{ $t('fileDetail.renameCancel') }}</el-button>
                <el-button type="primary" @click="submitRename()" :loading="renameSaving" :disabled="!renameValidation.valid">{{ $t('fileDetail.renameConfirm') }}</el-button>
            </template>
        </el-dialog>
    </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus';
import fetchWithAuth from '@/utils/fetchWithAuth';
import { validateFileId } from '@/utils/fileIdValidator';
import { isImageFile, isVideoFile, isAudioFile } from '@/utils/mimeTypes';
import { reverseGeocode, formatLocationAddress } from '@/utils/reverseGeocode';

export default {
    name: 'FileDetailDialog',
    props: {
        modelValue: { type: Boolean, default: false },
        file: { type: Object, default: null },
        fileLink: { type: String, default: '' },
        urls: { type: Object, default: () => ({ originUrl: '', mdUrl: '', htmlUrl: '', bbUrl: '', tgId: '', S3Location: '', S3CdnFileUrl: '' }) }
    },
    emits: ['update:modelValue', 'download', 'tagManagement', 'block', 'white', 'delete', 'metadataUpdated', 'fileRenamed'],
    watch: {
        visible(val) {
            if (!val) {
                // 关闭弹窗时退出编辑状态
                this.isEditing = false;
                this.editSaving = false;
            }
        },
        file: {
            handler(newFile) {
                const raw = newFile?.metadata?.LocationName || newFile?.metadata?.location_name || '';
                this.resolvedLocationName = formatLocationAddress(raw);
                if (newFile && this.hasCoordinates && !this.resolvedLocationName) {
                    this.resolveReverseGeocode();
                }
            },
            immediate: true
        }
    },
    data() {
        return {
            activeTab: 'originUrl',
            isEditing: false,
            editForm: {
                FileName: '',
                FileType: '',
                latitude: '',
                longitude: '',
                location_name: ''
            },
            resolvedLocationName: '',
            resolvingGeo: false,
            editSaving: false,
            showRenameDialog: false,
            renameForm: {
                newFileId: ''
            },
            renameValidation: {
                valid: true,
                error: ''
            },
            renameSaving: false
        }
    },
    computed: {
        visible: {
            get() { return this.modelValue; },
            set(val) { this.$emit('update:modelValue', val); }
        },
        dialogWidth() {
            return window.innerWidth < 860 ? '95%' : '960px';
        },
        availableUrlFormats() {
            const list = [
                { key: 'originUrl', label: this.$t('fileDetail.originUrl') || '原始链接' },
                { key: 'mdUrl', label: 'Markdown' },
                { key: 'htmlUrl', label: 'HTML 嵌入' },
                { key: 'bbUrl', label: 'BBCode' }
            ];
            if (this.file?.metadata?.TgFileId) {
                list.push({ key: 'tgId', label: 'TG File ID' });
            }
            if (this.file?.metadata?.S3Location) {
                list.push({ key: 'S3Location', label: 'S3 路径' });
            }
            if (this.file?.metadata?.S3CdnFileUrl) {
                list.push({ key: 'S3CdnFileUrl', label: 'S3 CDN' });
            }
            return list;
        },
        currentUrlValue() {
            return this.urls[this.activeTab] || '';
        },
        fileLocationName() {
            const raw = this.file?.metadata?.LocationName || this.file?.metadata?.location_name || '';
            return formatLocationAddress(raw);
        },
        cameraDisplay() {
            return this.file?.metadata?.Camera || this.file?.metadata?.camera || '';
        },
        lensDisplay() {
            return this.file?.metadata?.LensModel || this.file?.metadata?.lensModel || '';
        },
        exposureParts() {
            const meta = this.file?.metadata || {};
            return {
                fNumber: meta.FNumber || meta.fNumber ? String(meta.FNumber || meta.fNumber) : '',
                exposureTime: meta.ExposureTime || meta.exposureTime ? String(meta.ExposureTime || meta.exposureTime) : '',
                iso: meta.ISO || meta.iso ? String(meta.ISO || meta.iso) : '',
                focalLength: meta.FocalLength || meta.focalLength ? String(meta.FocalLength || meta.focalLength) : '',
                exposureBias: meta.ExposureBias || meta.exposureBias ? String(meta.ExposureBias || meta.exposureBias) : ''
            };
        },
        hasAnyExposure() {
            const p = this.exposureParts;
            return Boolean(p.fNumber || p.exposureTime || p.iso || p.focalLength || p.exposureBias);
        },
        exposureBiasDisplay() {
            return this.exposureParts.exposureBias;
        },
        altitudeDisplay() {
            const alt = this.file?.metadata?.Altitude ?? this.file?.metadata?.altitude;
            if (alt !== undefined && alt !== null && alt !== '') {
                return `${alt} m`;
            }
            return '';
        },
        exifTimeDisplay() {
            return this.file?.metadata?.ExifTime || this.file?.metadata?.exifTime || this.file?.metadata?.dateTime || '';
        },
        hasCoordinates() {
            const lat = this.file?.metadata?.Latitude ?? this.file?.metadata?.latitude;
            const lng = this.file?.metadata?.Longitude ?? this.file?.metadata?.longitude;
            return lat !== undefined && lat !== null && lat !== '' &&
                   lng !== undefined && lng !== null && lng !== '';
        },
        coordinatesDisplay() {
            if (!this.hasCoordinates) return '';
            const rawLat = this.file?.metadata?.Latitude ?? this.file?.metadata?.latitude;
            const rawLng = this.file?.metadata?.Longitude ?? this.file?.metadata?.longitude;
            const lat = parseFloat(rawLat);
            const lng = parseFloat(rawLng);
            if (!isNaN(lat) && !isNaN(lng)) {
                const latStr = lat >= 0 ? `${lat.toFixed(5)}° N` : `${Math.abs(lat).toFixed(5)}° S`;
                const lngStr = lng >= 0 ? `${lng.toFixed(5)}° E` : `${Math.abs(lng).toFixed(5)}° W`;
                return `${latStr}, ${lngStr}`;
            }
            return `${rawLat}, ${rawLng}`;
        },
        isVideo() {
            return isVideoFile(this.file);
        },
        isAudio() {
            return isAudioFile(this.file);
        },
        isImage() {
            return isImageFile(this.file);
        },
        uploadTime() {
            if (this.file?.metadata?.TimeStamp) {
                return new Date(this.file.metadata.TimeStamp).toLocaleString();
            }
            return this.$t('fileDetail.unknown');
        },
        accessType() {
            const listType = this.file?.metadata?.ListType;
            const label = this.file?.metadata?.Label;
            if (listType === 'White') return this.$t('fileDetail.accessNormalWhitelist');
            if (listType === 'Block') return this.$t('fileDetail.accessBlockedBlacklist');
            if (label === 'adult') return this.$t('fileDetail.accessBlockedReview');
            return this.$t('fileDetail.accessNormal');
        },
        accessTagType() {
            const listType = this.file?.metadata?.ListType;
            const label = this.file?.metadata?.Label;
            if (listType === 'White') return 'success';
            if (listType === 'Block') return 'danger';
            if (label === 'adult') return 'danger';
            return 'success';
        },
        imageDimensions() {
            const width = this.file?.metadata?.Width;
            const height = this.file?.metadata?.Height;
            if (width && height) return true;
            return null;
        },
        orientationIcon() {
            const width = this.file?.metadata?.Width;
            const height = this.file?.metadata?.Height;
            if (!width || !height) return '';
            const ratio = width / height;
            if (ratio > 1.1) return this.$t('fileDetail.orientationLandscape');
            if (ratio < 0.9) return this.$t('fileDetail.orientationPortrait');
            return this.$t('fileDetail.orientationSquare');
        },
        fileSizeDisplay() {
            const sizeBytes = this.file?.metadata?.FileSizeBytes;
            const sizeMB = this.file?.metadata?.FileSize;
            if (sizeBytes) {
                if (sizeBytes < 1024) {
                    return `${sizeBytes} B`;
                } else if (sizeBytes < 1024 * 1024) {
                    return `${(sizeBytes / 1024).toFixed(2)} KB`;
                } else {
                    return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
                }
            } else if (sizeMB) {
                return `${sizeMB} MB`;
            }
            return this.$t('fileDetail.unknown');
        }
    },
    methods: {
        handleVideoClick(e) {
            const video = e.target;
            if (video.paused) video.play();
            else video.pause();
        },
        copyCurrentUrl() {
            const text = this.currentUrlValue;
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                ElMessage.success(this.$t('fileDetail.linkCopied'));
            });
        },
        handleUrlClick(e) {
            const input = e.target;
            if (input && typeof input.select === 'function') {
                input.select();
            }
            this.copyCurrentUrl();
        },
        openImageLink() {
            if (this.fileLink) {
                window.open(this.fileLink, '_blank');
            }
        },
        handleMoreCommand(command) {
            if (command === 'rename') {
                this.openRenameDialog();
            } else if (command === 'tags') {
                this.$emit('tagManagement');
            } else if (command === 'white') {
                this.$emit('white');
            } else if (command === 'block') {
                this.$emit('block');
            } else if (command === 'delete') {
                this.$emit('delete');
            }
        },
        startEdit() {
            this.editForm.FileName = this.file?.metadata?.FileName || '';
            this.editForm.FileType = this.file?.metadata?.FileType || '';
            const latVal = this.file?.metadata?.Latitude ?? this.file?.metadata?.latitude;
            const lngVal = this.file?.metadata?.Longitude ?? this.file?.metadata?.longitude;
            this.editForm.latitude = latVal !== undefined && latVal !== null ? latVal : '';
            this.editForm.longitude = lngVal !== undefined && lngVal !== null ? lngVal : '';
            this.editForm.location_name = this.file?.metadata?.LocationName || this.file?.metadata?.location_name || '';
            this.isEditing = true;
        },
        cancelEdit() {
            this.isEditing = false;
            this.editForm.FileName = this.file?.metadata?.FileName || '';
            this.editForm.FileType = this.file?.metadata?.FileType || '';
            this.editForm.latitude = '';
            this.editForm.longitude = '';
            this.editForm.location_name = '';
            this.editSaving = false;
        },
        async saveMetadata() {
            this.editSaving = true;
            try {
                const fileId = this.file.name;
                const patchRes = await fetchWithAuth(`/api/manage/metadata/${fileId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ FileName: this.editForm.FileName, FileType: this.editForm.FileType })
                });
                if (!patchRes.ok) {
                    const error = await patchRes.json().catch(() => ({}));
                    throw new Error(error.message || this.$t('fileDetail.metadataSaveFailed'));
                }
                const data = await patchRes.json();

                // 若编辑了地理信息则保存到 geo 接口
                if (this.editForm.latitude !== undefined || this.editForm.longitude !== undefined || this.editForm.location_name !== undefined) {
                    const geoRes = await fetchWithAuth('/api/manage/metadata/geo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: fileId,
                            latitude: this.editForm.latitude ? Number(this.editForm.latitude) : null,
                            longitude: this.editForm.longitude ? Number(this.editForm.longitude) : null,
                            location_name: this.editForm.location_name || null
                        })
                    });
                    if (geoRes.ok) {
                        const geoData = await geoRes.json();
                        if (data.metadata) {
                            const newLat = geoData.data?.latitude ?? null;
                            const newLng = geoData.data?.longitude ?? null;
                            const newLoc = geoData.data?.location_name ?? null;
                            data.metadata.Latitude = newLat;
                            data.metadata.latitude = newLat;
                            data.metadata.Longitude = newLng;
                            data.metadata.longitude = newLng;
                            data.metadata.LocationName = newLoc;
                            data.metadata.location_name = newLoc;
                        }
                    }
                }

                ElMessage.success(this.$t('fileDetail.metadataSaved'));
                this.isEditing = false;
                this.$emit('metadataUpdated', fileId, data.metadata);
            } catch (error) {
                console.error('Error saving metadata:', error);
                ElMessage.error(error.message || this.$t('fileDetail.metadataSaveFailed'));
            } finally {
                this.editSaving = false;
            }
        },
        async resolveReverseGeocode() {
            if (!this.hasCoordinates || this.resolvingGeo) return;
            const rawLat = this.file?.metadata?.Latitude ?? this.file?.metadata?.latitude;
            const rawLng = this.file?.metadata?.Longitude ?? this.file?.metadata?.longitude;
            const lat = parseFloat(rawLat);
            const lng = parseFloat(rawLng);
            if (isNaN(lat) || isNaN(lng)) return;

            this.resolvingGeo = true;
            try {
                const name = await reverseGeocode(lat, lng);
                const formatted = formatLocationAddress(name);
                if (formatted) {
                    this.resolvedLocationName = formatted;
                    this.persistResolvedLocation(formatted);
                }
            } catch (err) {
                console.warn('Reverse geocode failed:', err);
            } finally {
                this.resolvingGeo = false;
            }
        },
        async persistResolvedLocation(locationName) {
            if (!this.file?.name || !locationName) return;
            const rawLat = this.file?.metadata?.Latitude ?? this.file?.metadata?.latitude;
            const rawLng = this.file?.metadata?.Longitude ?? this.file?.metadata?.longitude;
            try {
                await fetchWithAuth('/api/manage/metadata/geo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: this.file.name,
                        latitude: rawLat,
                        longitude: rawLng,
                        location_name: locationName
                    })
                });
                if (this.file.metadata) {
                    this.file.metadata.LocationName = locationName;
                    this.file.metadata.location_name = locationName;
                }
            } catch (e) {}
        },
        openRenameDialog() {
            this.renameForm.newFileId = this.file?.name || '';
            this.renameValidation = { valid: true, error: '' };
            this.showRenameDialog = true;
        },
        closeRenameDialog() {
            this.showRenameDialog = false;
            this.renameForm.newFileId = '';
            this.renameValidation = { valid: true, error: '' };
        },
        validateRenameInput() {
            const result = validateFileId(this.renameForm.newFileId, this.file?.name || '');
            this.renameValidation = {
                valid: result.valid,
                error: result.error || ''
            };
        },
        async submitRename() {
            if (this.renameSaving) return;

            this.validateRenameInput();
            if (!this.renameValidation.valid) {
                return;
            }

            this.renameSaving = true;
            try {
                const oldFileId = this.file.name;
                const response = await fetchWithAuth(`/api/manage/rename/${oldFileId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ newFileId: this.renameForm.newFileId })
                });

                if (response.ok) {
                    const data = await response.json();
                    ElMessage.success(this.$t('fileDetail.renameSuccess'));
                    this.showRenameDialog = false;
                    this.$emit('fileRenamed', oldFileId, this.renameForm.newFileId, data.metadata);
                } else if (response.status === 409) {
                    this.renameValidation = {
                        valid: false,
                        error: this.$t('fileDetail.renameConflict')
                    };
                } else {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.message || this.$t('fileDetail.renameFailed'));
                }
            } catch (error) {
                console.error('Error renaming file:', error);
                ElMessage.error(error.message || this.$t('fileDetail.renameFailed'));
            } finally {
                this.renameSaving = false;
            }
        }
    }
}
</script>

<style scoped>
.file-detail-dialog-pro :deep(.el-dialog__body) {
    padding: 16px 20px 20px !important;
}

/* 双栏工作台网格容器 */
.detail-workspace-grid {
    display: grid;
    grid-template-columns: 42% 58%;
    gap: 0;
    min-height: 520px;
    align-items: stretch;
}

/* 左侧栏：媒体视窗与快捷外链 */
.workspace-left-col {
    padding-right: 20px;
    border-right: 1px solid var(--el-border-color-lighter);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
}

/* 媒体展示容器 */
.media-display-card {
    position: relative;
    width: 100%;
    min-height: 240px;
    max-height: 320px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.display-media-item {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
    display: block;
}

.video-item {
    cursor: pointer;
    border-radius: 8px;
}

.audio-item {
    width: 90%;
    border-radius: 8px;
}

.image-item {
    cursor: pointer;
    border-radius: 8px;
}

.image-item :deep(img) {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
}

.generic-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.generic-file-icon {
    font-size: 64px;
    color: var(--el-text-color-secondary);
}

.media-skeleton-box {
    width: 100%;
    height: 260px;
    background: var(--el-fill-color);
}

.media-error-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 260px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
}

.error-icon {
    font-size: 48px;
}

/* 浮动标牌与按钮 */
.floating-dim-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: #f1f5f9;
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    gap: 4px;
    pointer-events: none;
    z-index: 2;
}

.dim-dot {
    opacity: 0.5;
}

.floating-expand-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: #f1f5f9;
    border: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 2;
}

.floating-expand-btn:hover {
    background: rgba(59, 130, 246, 0.85);
    border-color: rgba(59, 130, 246, 0.5);
    color: #ffffff;
}

/* 紧凑外链卡 */
.quick-share-box {
    background: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    padding: 10px 12px;
}

.share-box-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.share-box-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-regular);
    display: flex;
    align-items: center;
    gap: 6px;
}

.share-icon {
    color: var(--el-color-primary);
}

.format-dropdown {
    width: 130px;
}

.share-text-input :deep(.el-input__inner) {
    font-family: monospace;
    font-size: 12px;
}

.left-action-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 2px;
}

.left-bar-btn {
    margin: 0 !important;
    font-size: 12px;
    border-radius: 8px;
    height: 34px;
}

.action-btn-icon {
    margin-right: 5px;
}

/* 右侧栏：结构化信息面板 */
.workspace-right-col {
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.right-col-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.header-name-block {
    flex: 1;
    min-width: 0;
}

.file-name-heading {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    line-height: 1.35;
    word-break: break-all;
}

.name-edit-input {
    width: 100%;
}

.file-subtitle-badges {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    flex-wrap: wrap;
}

.badge-mini {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    padding: 1px 6px;
    border-radius: 4px;
}

.badge-status-tag {
    height: 20px;
    padding: 0 6px;
    font-size: 11px;
}

.header-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}

.pill-ctrl-btn {
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12px;
}

.ctrl-icon {
    margin-right: 4px;
}

.dropdown-arrow-icon {
    font-size: 10px;
    margin-left: 4px;
    opacity: 0.7;
}

.save-ctrl-btn,
.cancel-ctrl-btn {
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12px;
}

/* 卡片滚动区域 */
.cards-scroll-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 14px;
    overflow-y: auto;
    max-height: 480px;
    padding-right: 4px;
}

.panel-card {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    padding: 12px 14px;
    transition: all 0.2s ease;
}

.panel-card:hover {
    border-color: var(--el-border-color);
}

.card-title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.card-title-text {
    font-size: 12px;
    font-weight: 700;
    color: var(--el-text-color-regular);
    display: flex;
    align-items: center;
    gap: 6px;
    letter-spacing: 0.3px;
}

.title-icon {
    font-size: 13px;
}

.title-right-badge {
    font-size: 11px;
    color: var(--el-text-color-secondary);
}

/* 硬件网格 */
.hardware-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
}

.hardware-cell {
    background: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 6px 10px;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.cell-label {
    font-size: 10px;
    color: var(--el-text-color-secondary);
    margin-bottom: 2px;
}

.cell-val {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 曝光胶囊条 */
.exposure-capsules-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
}

.exposure-capsule {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 5px;
    background: rgba(59, 130, 246, 0.12);
    color: var(--el-color-primary);
    border: 1px solid rgba(59, 130, 246, 0.22);
}

.capsule-bias {
    background: rgba(245, 158, 11, 0.12);
    color: #d97706;
    border-color: rgba(245, 158, 11, 0.22);
}

.capsule-empty {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

/* 地理足迹卡片 */
.badge-altitude {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.25);
    padding: 1px 6px;
    border-radius: 4px;
}

.location-main-text {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    line-height: 1.4;
    word-break: break-all;
}

.location-coords-line {
    margin-top: 6px;
}

.coords-badge {
    font-size: 11px;
    background: var(--el-fill-color-blank);
    color: var(--el-text-color-secondary);
    border: 1px solid var(--el-border-color-lighter);
    padding: 2px 6px;
    border-radius: 4px;
}

.location-edit-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.coords-edit-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

/* 标签卡片 */
.tag-manage-action-btn {
    background: transparent;
    border: none;
    font-size: 11px;
    color: var(--el-color-primary);
    cursor: pointer;
    padding: 0;
}

.tag-manage-action-btn:hover {
    text-decoration: underline;
}

.tags-capsules-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.meta-color-pill {
    border-radius: 12px;
    padding: 0 8px;
    font-size: 11px;
}

/* 审计与底层存储卡片 (四宫格) */
.audit-title-bar {
    margin-bottom: 6px;
}

.audit-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
}

.audit-cell {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.audit-label {
    font-size: 10px;
    color: var(--el-text-color-secondary);
    margin-bottom: 2px;
}

.audit-val {
    font-size: 11px;
    color: var(--el-text-color-regular);
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
}

.channel-pill {
    height: 18px;
    padding: 0 4px;
    font-size: 10px;
}

.channel-name-txt {
    font-weight: 500;
}

.audit-label-hint {
    color: var(--el-text-color-secondary);
    font-size: 10px;
}

/* 颜色工具 */
.text-cyan { color: #06b6d4; }
.text-emerald { color: #10b981; }
.text-amber { color: #f59e0b; }
.text-purple { color: #a855f7; }
.text-danger { color: #ef4444; }
.text-resolving { color: var(--el-color-primary); font-size: 12px; }
.text-muted { color: var(--el-text-color-secondary); }

/* 下拉菜单 */
.detail-more-menu :deep(.el-dropdown-menu__item) {
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.menu-item-icon {
    width: 14px;
    font-size: 12px;
}

.danger-menu-item {
    color: #ef4444 !important;
}

/* 移动端与较窄视口自适应 */
@media (max-width: 860px) {
    .detail-workspace-grid {
        grid-template-columns: 1fr;
        min-height: auto;
    }

    .workspace-left-col {
        padding-right: 0;
        border-right: none;
        border-bottom: 1px solid var(--el-border-color-lighter);
        padding-bottom: 16px;
    }

    .workspace-right-col {
        padding-left: 0;
        padding-top: 14px;
    }

    .cards-scroll-body {
        max-height: none;
        overflow-y: visible;
    }
}
</style>
