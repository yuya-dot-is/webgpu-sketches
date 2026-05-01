/**
 * 法線バッファ
 * @param indexes インデックス（vec3）の配列
 * @param positions 座標（vec4）の配列
 * @param dist 法線バッファ
 * @returns
 */
export const computeNormal = (indexes: Uint32Array, positions: Float32Array, dist?: Float32Array) => {
    const EPSILON = 1e-10;
    const out = dist || new Float32Array(positions.length);
    for(let i = 0; i < indexes.length; i += 3) {
        // 三角形の3つの頂点のindex
        const idxA = indexes[i    ] * 4;
        const idxB = indexes[i + 1] * 4;
        const idxC = indexes[i + 2] * 4;
        // 三角形の2辺のベクトル
        const p1x = positions[idxA    ] - positions[idxC    ];
        const p1y = positions[idxA + 1] - positions[idxC + 1];
        const p1z = positions[idxA + 2] - positions[idxC + 2];
        const p2x = positions[idxB    ] - positions[idxC    ];
        const p2y = positions[idxB + 1] - positions[idxC + 1];
        const p2z = positions[idxB + 2] - positions[idxC + 2];
        // 外積（三角形の垂線）
        let nx = p1y * p2z - p1z * p2y;
        let ny = p1z * p2x - p1x * p2z;
        let nz = p1x * p2y - p1y * p2x;
        // ノルムを計算
        const squaredNorm = nx * nx + ny * ny + nz * nz;
        if(squaredNorm > EPSILON) {
            // 外積の正規化
            const invNorm = 1.0 / Math.sqrt(squaredNorm)
            nx *= invNorm;
            ny *= invNorm;
            nz *= invNorm;
        }
        // 結果の配列に格納
        out[idxA    ] = nx;
        out[idxA + 1] = ny;
        out[idxA + 2] = nz;
        out[idxB    ] = nx;
        out[idxB + 1] = ny;
        out[idxB + 2] = nz;
        out[idxC    ] = nx;
        out[idxC + 1] = ny;
        out[idxC + 2] = nz;
    }
    return out;
}