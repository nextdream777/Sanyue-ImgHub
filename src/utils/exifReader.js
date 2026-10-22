/**
 * 轻量纯前端 EXIF 全能解析器 (Zero Dependency EXIF Reader)
 * 只读取文件前 128KB，快速嗅探相机型号、镜头规格、快门/光圈/ISO曝光三要素、GPS坐标、海拔及拍摄时间
 */

function parseRational(dataView, offset, littleEndian) {
    const num = dataView.getUint32(offset, littleEndian);
    const den = dataView.getUint32(offset + 4, littleEndian);
    return den === 0 ? 0 : num / den;
}

function parseSRational(dataView, offset, littleEndian) {
    const num = dataView.getInt32(offset, littleEndian);
    const den = dataView.getInt32(offset + 4, littleEndian);
    return den === 0 ? 0 : num / den;
}

function parseString(dataView, offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
        const charCode = dataView.getUint8(offset + i);
        if (charCode === 0) break;
        str += String.fromCharCode(charCode);
    }
    return str.trim();
}

function parseTags(dataView, tiffStart, dirStart, littleEndian) {
    const tags = {};
    if (dirStart + 2 > dataView.byteLength) return tags;
    const entries = dataView.getUint16(dirStart, littleEndian);
    
    for (let i = 0; i < entries; i++) {
        const entryOffset = dirStart + 2 + i * 12;
        if (entryOffset + 12 > dataView.byteLength) break;
        
        const tag = dataView.getUint16(entryOffset, littleEndian);
        const type = dataView.getUint16(entryOffset + 2, littleEndian);
        const count = dataView.getUint32(entryOffset + 4, littleEndian);
        let valueOffset = entryOffset + 8;
        
        // 如果数据大小 > 4 字节，值存储在偏移位置
        const typeSize = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8][type] || 1;
        const totalBytes = count * typeSize;
        if (totalBytes > 4) {
            valueOffset = tiffStart + dataView.getUint32(entryOffset + 8, littleEndian);
        }
        
        if (valueOffset + totalBytes > dataView.byteLength) continue;

        if (type === 2) {
            // ASCII 字符串
            tags[tag] = parseString(dataView, valueOffset, count);
        } else if (type === 3) {
            // SHORT (16-bit)
            tags[tag] = dataView.getUint16(valueOffset, littleEndian);
        } else if (type === 4) {
            // LONG (32-bit)
            tags[tag] = dataView.getUint32(valueOffset, littleEndian);
        } else if (type === 5) {
            // RATIONAL (2x 32-bit unsigned)
            if (count === 1) {
                tags[tag] = parseRational(dataView, valueOffset, littleEndian);
            } else {
                const rationals = [];
                for (let j = 0; j < count; j++) {
                    rationals.push(parseRational(dataView, valueOffset + j * 8, littleEndian));
                }
                tags[tag] = rationals;
            }
        } else if (type === 10) {
            // SRATIONAL (2x 32-bit signed)
            if (count === 1) {
                tags[tag] = parseSRational(dataView, valueOffset, littleEndian);
            } else {
                const srationals = [];
                for (let j = 0; j < count; j++) {
                    srationals.push(parseSRational(dataView, valueOffset + j * 8, littleEndian));
                }
                tags[tag] = srationals;
            }
        }
    }
    return tags;
}

// 格式化辅助函数
function formatExposureTime(val) {
    if (!val || typeof val !== 'number' || isNaN(val) || val <= 0) return '';
    if (val < 1) {
        const denom = Math.round(1 / val);
        return `1/${denom}s`;
    }
    return `${val.toFixed(1).replace(/\.0$/, '')}s`;
}

function formatFNumber(val) {
    if (!val || typeof val !== 'number' || isNaN(val) || val <= 0) return '';
    return `f/${val.toFixed(1).replace(/\.0$/, '')}`;
}

function formatIso(val) {
    if (!val) return '';
    return `ISO ${val}`;
}

function formatFocalLength(val) {
    if (!val || typeof val !== 'number' || isNaN(val) || val <= 0) return '';
    return `${Math.round(val)}mm`;
}

function formatExposureBias(val) {
    if (val === undefined || val === null || isNaN(val)) return '';
    const rounded = Math.round(val * 10) / 10;
    if (rounded === 0) return '0 EV';
    return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)} EV`;
}

function formatDateTime(str) {
    if (!str || typeof str !== 'string') return '';
    const match = str.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}:\d{2}:\d{2})/);
    if (match) {
        return `${match[1]}-${match[2]}-${match[3]} ${match[4]}`;
    }
    return str.trim();
}

/**
 * 完整解析照片 EXIF 元数据
 * @param {Blob|File} file
 * @returns {Promise<Object>}
 */
export async function extractExif(file) {
    const emptyResult = {
        hasGps: false,
        latitude: null,
        longitude: null,
        altitude: null,
        altitudeText: '',
        camera: '',
        make: '',
        model: '',
        lensModel: '',
        lensMake: '',
        dateTime: '',
        subSecTime: '',
        exposureTime: '',
        fNumber: '',
        iso: '',
        focalLength: '',
        focalLength35mm: '',
        exposureBias: '',
        software: '',
        orientation: 1
    };

    if (!file || !(file instanceof Blob)) {
        return emptyResult;
    }

    // 读取前 512KB 以完整覆盖现代手机与相机的 APP1 EXIF 头及各 IFD 偏移
    const slice = file.slice(0, 524288);

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const buffer = e.target.result;
                const view = new DataView(buffer);

                // 检查 JPEG 魔数: 0xFFD8
                if (view.getUint16(0) !== 0xFFD8) {
                    return resolve(emptyResult);
                }

                let offset = 2;
                let app1Offset = -1;

                while (offset < view.byteLength - 4) {
                    const marker = view.getUint16(offset);
                    if (marker === 0xFFE1) {
                        // 找到 APP1 标记
                        app1Offset = offset;
                        break;
                    }
                    if ((marker & 0xFF00) !== 0xFF00) break;
                    const length = view.getUint16(offset + 2);
                    offset += 2 + length;
                }

                if (app1Offset === -1) {
                    return resolve(emptyResult);
                }

                // 检查 Exif 标识符: "Exif\0\0"
                const exifHeader = parseString(view, app1Offset + 4, 6);
                if (exifHeader !== 'Exif') {
                    return resolve(emptyResult);
                }

                const tiffStart = app1Offset + 10;
                // TIFF 字节序: 0x4949 (II = Little Endian) 或 0x4D4D (MM = Big Endian)
                const byteOrder = view.getUint16(tiffStart);
                const littleEndian = (byteOrder === 0x4949);

                // IFD0 偏移
                const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
                const ifd0Tags = parseTags(view, tiffStart, ifd0Offset, littleEndian);

                const make = ifd0Tags[0x010F] || '';
                const model = ifd0Tags[0x0110] || '';
                const software = ifd0Tags[0x0131] || '';
                const orientation = ifd0Tags[0x0112] || 1;

                // 拼接相机名称
                let camera = '';
                if (make && model) {
                    camera = model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`;
                } else {
                    camera = model || make || '';
                }

                let dateTime = '';
                let subSecTime = '';
                let exposureTime = '';
                let fNumber = '';
                let iso = '';
                let focalLength = '';
                let focalLength35mm = '';
                let exposureBias = '';
                let lensModel = '';
                let lensMake = '';

                // Exif IFD
                if (ifd0Tags[0x8769]) {
                    const exifOffset = tiffStart + ifd0Tags[0x8769];
                    const exifTags = parseTags(view, tiffStart, exifOffset, littleEndian);
                    
                    dateTime = formatDateTime(exifTags[0x9003] || exifTags[0x9004] || ifd0Tags[0x0132] || '');
                    subSecTime = exifTags[0x9290] || exifTags[0x9291] || '';
                    exposureTime = formatExposureTime(exifTags[0x829A]);
                    fNumber = formatFNumber(exifTags[0x829D]);
                    iso = formatIso(exifTags[0x8827]);
                    focalLength = formatFocalLength(exifTags[0x920A]);
                    focalLength35mm = formatFocalLength(exifTags[0xA405]);
                    exposureBias = formatExposureBias(exifTags[0x9204]);
                    lensModel = exifTags[0xA434] || '';
                    lensMake = exifTags[0xA433] || '';
                }

                let hasGps = false;
                let latitude = null;
                let longitude = null;
                let altitude = null;
                let altitudeText = '';

                // GPS IFD
                if (ifd0Tags[0x8825]) {
                    const gpsOffset = tiffStart + ifd0Tags[0x8825];
                    const gpsTags = parseTags(view, tiffStart, gpsOffset, littleEndian);

                    const latRationals = gpsTags[0x0002];
                    const latRef = gpsTags[0x0001] || 'N';
                    const lngRationals = gpsTags[0x0004];
                    const lngRef = gpsTags[0x0003] || 'E';

                    if (Array.isArray(latRationals) && Array.isArray(lngRationals) && latRationals.length === 3 && lngRationals.length === 3) {
                        let lat = latRationals[0] + latRationals[1] / 60.0 + latRationals[2] / 3600.0;
                        if (latRef === 'S') lat = -lat;

                        let lng = lngRationals[0] + lngRationals[1] / 60.0 + lngRationals[2] / 3600.0;
                        if (lngRef === 'W') lng = -lng;

                        // 验证经纬度有效性
                        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0)) {
                            hasGps = true;
                            latitude = parseFloat(lat.toFixed(6));
                            longitude = parseFloat(lng.toFixed(6));

                            // 海拔解析
                            if (gpsTags[0x0006] !== undefined) {
                                const rawAlt = gpsTags[0x0006];
                                const altNum = typeof rawAlt === 'number' ? rawAlt : (Array.isArray(rawAlt) ? rawAlt[0] : 0);
                                const altRef = gpsTags[0x0005] === 1 ? -1 : 1;
                                altitude = parseFloat((altNum * altRef).toFixed(1));
                                altitudeText = `${altitude}m`;
                            }
                        }
                    }
                }

                resolve({
                    hasGps,
                    latitude,
                    longitude,
                    altitude,
                    altitudeText,
                    camera,
                    make,
                    model,
                    lensModel,
                    lensMake,
                    dateTime,
                    subSecTime,
                    exposureTime,
                    fNumber,
                    iso,
                    focalLength,
                    focalLength35mm,
                    exposureBias,
                    software,
                    orientation
                });
            } catch (err) {
                console.warn('EXIF parse error:', err);
                resolve(emptyResult);
            }
        };
        reader.onerror = () => resolve(emptyResult);
        reader.readAsArrayBuffer(slice);
    });
}

// 保持向前兼容旧方法名
export const extractExifGps = extractExif;

export default {
    extractExif,
    extractExifGps
};
