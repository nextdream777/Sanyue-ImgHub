/**
 * 轻量纯前端 EXIF GPS 与元数据解析器 (Zero Dependency EXIF Reader)
 * 只读取文件前 128KB，快速嗅探手机照片中的 GPS 经纬度、拍摄时间与相机型号
 */

function parseRational(dataView, offset, littleEndian) {
    const num = dataView.getUint32(offset, littleEndian);
    const den = dataView.getUint32(offset + 4, littleEndian);
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
            // RATIONAL (2x 32-bit)
            if (count === 1) {
                tags[tag] = parseRational(dataView, valueOffset, littleEndian);
            } else {
                const rationals = [];
                for (let j = 0; j < count; j++) {
                    rationals.push(parseRational(dataView, valueOffset + j * 8, littleEndian));
                }
                tags[tag] = rationals;
            }
        }
    }
    return tags;
}

export async function extractExifGps(file) {
    if (!file || !(file instanceof Blob)) {
        return { hasGps: false };
    }

    // 只读取前 128KB 即可覆盖几乎所有相机的 APP1 EXIF 头
    const slice = file.slice(0, 131072);

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const buffer = e.target.result;
                const view = new DataView(buffer);

                // 检查 JPEG 魔数: 0xFFD8
                if (view.getUint16(0) !== 0xFFD8) {
                    return resolve({ hasGps: false });
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
                    return resolve({ hasGps: false });
                }

                // 检查 Exif 标识符: "Exif\0\0"
                const exifHeader = parseString(view, app1Offset + 4, 6);
                if (exifHeader !== 'Exif') {
                    return resolve({ hasGps: false });
                }

                const tiffStart = app1Offset + 10;
                // TIFF 字节序: 0x4949 (II = Little Endian) 或 0x4D4D (MM = Big Endian)
                const byteOrder = view.getUint16(tiffStart);
                const littleEndian = (byteOrder === 0x4949);

                // IFD0 偏移
                const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
                const ifd0Tags = parseTags(view, tiffStart, ifd0Offset, littleEndian);

                let dateTime = '';
                let make = ifd0Tags[0x010F] || '';
                let model = ifd0Tags[0x0110] || '';

                // Exif IFD
                if (ifd0Tags[0x8769]) {
                    const exifOffset = tiffStart + ifd0Tags[0x8769];
                    const exifTags = parseTags(view, tiffStart, exifOffset, littleEndian);
                    dateTime = exifTags[0x9003] || exifTags[0x9004] || '';
                }

                // GPS IFD
                if (!ifd0Tags[0x8825]) {
                    return resolve({
                        hasGps: false,
                        dateTime,
                        make,
                        model
                    });
                }

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
                        return resolve({
                            hasGps: true,
                            latitude: parseFloat(lat.toFixed(6)),
                            longitude: parseFloat(lng.toFixed(6)),
                            dateTime,
                            make,
                            model
                        });
                    }
                }

                return resolve({
                    hasGps: false,
                    dateTime,
                    make,
                    model
                });
            } catch (err) {
                console.warn('EXIF GPS parse error:', err);
                resolve({ hasGps: false });
            }
        };
        reader.onerror = () => resolve({ hasGps: false });
        reader.readAsArrayBuffer(slice);
    });
}

export default {
    extractExifGps
};
