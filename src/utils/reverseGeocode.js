/**
 * 轻量纯前端坐标逆地理编码转换工具 (Zero-blocking Reverse Geocoding)
 * 支持同一拍摄地点批量聚类缓存、国内高德自动纠偏与全球 OSM 双轨引擎降级
 */
import { wgs84ToGcj02, outOfChina } from './coordTransform';

// 内存高频缓存：Key 为 "lat.toFixed(4)_lng.toFixed(4)"（约 11 米网格范围）
const geoCache = new Map();
const pendingRequests = new Map();

/**
 * 智能格式化地名与地理地址
 * 规则：
 * 1. 过滤掉邮编（如 264000、100006 等）
 * 2. 中国境内：移除“中国/China”，以“xx省·xx市·xx区 xxx”中国传统从宏观到微观阅读习惯展示
 *    处理设备或 Nominatim 倒序地址：海上快艇码头, 烟台滨海广场, 民生社区, 东山街道, 芝罘区, 烟台市, 山东省, 264000, 中国
 *    转化为：山东省·烟台市·芝罘区 东山街道·民生社区·烟台滨海广场·海上快艇码头
 * 3. 非中国地区：必须包含国家名称，格式如：[国家名称] · [州/省/直辖区] · [城市/区域]
 */
export function formatLocationAddress(input, data = null) {
    if (!input && !data) return '';

    // 1. 如果有 Nominatim 结构化 address 对象
    if (data && data.address) {
        const a = data.address;
        const country = a.country || '';
        const countryCode = (a.country_code || '').toLowerCase();
        const isChina = country === '中国' || countryCode === 'cn' || country === 'China' || country === '中华人民共和国';

        const province = a.province || a.state || '';
        const city = a.city || a.city_district || a.county || a.town || '';
        const district = a.suburb || a.district || '';

        const detailList = [
            a.road || a.street || a.pedestrian,
            a.neighbourhood || a.suburb_district,
            a.tourism || a.amenity || a.historic || a.leisure || a.building || a.attraction || a.name
        ].filter(Boolean);
        const details = Array.from(new Set(detailList));

        if (!isChina) {
            // 非中国地区：显示国家名称 + 主要行政区/城市
            const parts = [country];
            if (province && province !== country) parts.push(province);
            if (city && city !== province) parts.push(city);
            if (district && district !== city) parts.push(district);
            if (details.length && !parts.includes(details[0])) parts.push(details[0]);
            return parts.filter(Boolean).join(' · ');
        } else {
            // 中国地区：xx省·xx市·xx区 xxx
            const adminParts = [];
            if (province) adminParts.push(province);
            if (city && city !== province) adminParts.push(city);
            if (district && district !== city) adminParts.push(district);

            const adminStr = adminParts.join('·');
            const detailStr = details.filter(d => !adminParts.includes(d)).join('·');
            if (adminStr && detailStr) {
                return `${adminStr} ${detailStr}`;
            }
            return adminStr || detailStr || data.display_name || '';
        }
    }

    // 2. 字符串处理
    if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!trimmed) return '';

        // 如果包含逗号分割（常见于西式反向地址与 Nominatim display_name）
        if (trimmed.includes(',')) {
            let tokens = trimmed.split(',').map(s => s.trim()).filter(Boolean);

            // 过滤邮政编码 (4-8 位纯数字或类似 160-0022 格式)
            tokens = tokens.filter(t => !/^\d{4,8}$/.test(t) && !/^\d{3}-\d{4}$/.test(t));
            if (tokens.length === 0) return '';

            const lastToken = tokens[tokens.length - 1];
            const isChinaEnd = lastToken === '中国' || lastToken === '中华人民共和国' || lastToken === 'China';
            const firstToken = tokens[0];
            const isChinaStart = firstToken === '中国' || firstToken === '中华人民共和国' || firstToken === 'China';

            if (isChinaEnd) {
                // 倒序转换为正序 (省 -> 市 -> 区 -> 街道 -> POI)
                tokens.pop(); // 移除 "中国"
                tokens.reverse();

                const adminParts = [];
                const detailParts = [];

                tokens.forEach(t => {
                    if (/(省|自治区|特别行政区)$/.test(t) || ['北京市', '上海市', '天津市', '重庆市'].includes(t)) {
                        if (!adminParts.includes(t)) adminParts.push(t);
                    } else if (/(市|自治州|地区|盟)$/.test(t)) {
                        if (!adminParts.includes(t)) adminParts.push(t);
                    } else if (/(区|县|市|旗)$/.test(t) && adminParts.length < 3) {
                        if (!adminParts.includes(t)) adminParts.push(t);
                    } else {
                        if (!detailParts.includes(t)) detailParts.push(t);
                    }
                });

                if (adminParts.length === 0 && tokens.length > 0) {
                    const adminSlice = tokens.slice(0, Math.min(3, tokens.length));
                    const restSlice = tokens.slice(adminSlice.length);
                    return adminSlice.join('·') + (restSlice.length ? ' ' + restSlice.join('·') : '');
                }

                const adminStr = adminParts.join('·');
                const detailStr = detailParts.join('·');
                if (adminStr && detailStr) return `${adminStr} ${detailStr}`;
                return adminStr || detailStr;
            } else if (isChinaStart) {
                tokens.shift(); // 移除起始的 "中国"
                const adminSlice = tokens.slice(0, Math.min(3, tokens.length));
                const restSlice = tokens.slice(adminSlice.length);
                return adminSlice.join('·') + (restSlice.length ? ' ' + restSlice.join('·') : '');
            } else {
                // 非中国地区：保证国家在最前
                const foreignCountries = [
                    '日本', '美国', '法国', '英国', '德国', '韩国', '新加坡', '泰国', '澳大利亚',
                    '加拿大', '俄罗斯', '意大利', '西班牙', '瑞士', '新西兰', '荷兰', '瑞典',
                    'United States', 'Japan', 'France', 'United Kingdom', 'Germany', 'South Korea'
                ];
                if (foreignCountries.includes(lastToken) || /^[a-zA-Z\s]+$/.test(lastToken)) {
                    tokens.reverse(); // 国家翻转到最前面
                }
                return tokens.slice(0, 4).join(' · ');
            }
        }

        // 如果不含逗号，检查是否有邮编需要剔除
        return trimmed.replace(/\b\d{6}\b/g, '').trim();
    }

    return String(input || '');
}

/**
 * 格式化 OpenStreetMap Nominatim 的结构化地址
 */
function formatNominatimAddress(data) {
    if (!data) return '';
    return formatLocationAddress(data.display_name, data);
}

/**
 * 通过高德地图 JS API 进行逆地理编码 (GCJ-02)
 */
function geocodeWithAMap(gcjLat, gcjLng, timeoutMs = 2000) {
    return new Promise((resolve, reject) => {
        if (!window.AMap) {
            return reject(new Error('AMap not loaded'));
        }

        const timer = setTimeout(() => {
            reject(new Error('AMap geocode timeout'));
        }, timeoutMs);

        try {
            window.AMap.plugin('AMap.Geocoder', () => {
                const geocoder = new window.AMap.Geocoder({
                    extensions: 'base'
                });
                geocoder.getAddress([gcjLng, gcjLat], (status, result) => {
                    clearTimeout(timer);
                    if (status === 'complete' && result?.regeocode?.formattedAddress) {
                        resolve(result.regeocode.formattedAddress);
                    } else {
                        reject(new Error('AMap geocode failed with status: ' + status));
                    }
                });
            });
        } catch (err) {
            clearTimeout(timer);
            reject(err);
        }
    });
}

/**
 * 通过 OpenStreetMap Nominatim API 进行逆地理编码 (WGS-84 全球免费，无需 API Key)
 */
async function geocodeWithNominatim(lat, lng, timeoutMs = 2500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
        const res = await fetch(url, {
            headers: {
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            },
            signal: controller.signal
        });
        clearTimeout(timer);

        if (!res.ok) {
            throw new Error(`Nominatim request failed: ${res.status}`);
        }

        const data = await res.json();
        const formatted = formatNominatimAddress(data);
        if (formatted) return formatted;
        throw new Error('Nominatim returned empty address');
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

/**
 * 逆地理编码核心对外函数
 * @param {number} latitude - WGS-84 纬度
 * @param {number} longitude - WGS-84 经度
 * @param {object} options - 选项（可传超时时间）
 * @returns {Promise<string>} 返回位置中文名称，失败则返回空字符串
 */
export async function reverseGeocode(latitude, longitude, options = {}) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        return '';
    }

    // 聚类缓存键（约 11 米范围相同照片全部复用）
    const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;

    // 1. 命中内存缓存直接返回
    if (geoCache.has(cacheKey)) {
        return geoCache.get(cacheKey);
    }

    // 2. 如果同一地点已有正在发起的请求，复用同一个 Promise 避免重复并发
    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey);
    }

    const timeoutMs = options.timeout || 2500;

    const requestPromise = (async () => {
        let locationName = '';

        // 双轨策略：国内优先尝试高德（若已加载 JS SDK 插件），否则优雅降级至 OSM
        const isChina = !outOfChina(lat, lng);

        if (isChina && window.AMap) {
            try {
                const [gcjLat, gcjLng] = wgs84ToGcj02(lat, lng);
                locationName = await geocodeWithAMap(gcjLat, gcjLng, timeoutMs);
            } catch (err) {
                // 高德失败后继续走 Nominatim 兜底
            }
        }

        if (!locationName) {
            try {
                locationName = await geocodeWithNominatim(lat, lng, timeoutMs);
            } catch (err) {
                // 两种引擎均失败，兜底保留经纬度度分格式文本
                const latStr = lat >= 0 ? `${lat.toFixed(3)}°N` : `${Math.abs(lat).toFixed(3)}°S`;
                const lngStr = lng >= 0 ? `${lng.toFixed(3)}°E` : `${Math.abs(lng).toFixed(3)}°W`;
                locationName = `${latStr}, ${lngStr}`;
            }
        }

        // 缓存成功解析的结果
        if (locationName) {
            geoCache.set(cacheKey, locationName);
        }
        pendingRequests.delete(cacheKey);
        return locationName;
    })();

    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
}

export default {
    reverseGeocode,
    formatLocationAddress
};
