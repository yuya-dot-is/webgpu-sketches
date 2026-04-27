/**
 * Uniform Buffer Objectの並び順
 */
const UBO_LAYOUT = {
    MATRIX: 0, // 0〜15番目 mat4x4<f32>
    TIME: 16, // f32
    ASPECT_RATIO: 17, // f32
    MOUSE_X: 18, // f32
    SIDE_COUNT: 19, // u32
} as const;

/**
 * Uniform Buffer Objectのサイズ
 */
const UBO_SIZE = 20 * 4;

/**
 * Uniform Buffer Objectのバインドグループのインデックス
 */
const BIND_GROUP_INDEX = 0;

/**
 * Uniform Buffer Objectのバインドインデックス
 */
const BIND_INDEX = 0;

/**
 * Uniform Buffer Objectのコンテキスト
 */
interface UBOData {
    matrix: Float32Array;
    time: number;
    aspectRatio: number;
    mouseX: number;
    sideCount: number;
}

export default class UBO {
    // bufferデータのキャッシュ
    private _cachedArrayBuffer = new ArrayBuffer(UBO_SIZE);
    private _cachedF32 = new Float32Array(this._cachedArrayBuffer);
    private _cachedU32 = new Uint32Array(this._cachedArrayBuffer);

    // GPUリソース
    private _bindGroup: GPUBindGroup;
    private _buffer: GPUBuffer;

    // データ更新用関数
    private _dataProvider: () => UBOData | null = () => null;

    // データ
    public data: UBOData = {
        matrix: new Float32Array(16),
        time: 0,
        aspectRatio: 0,
        mouseX: 0,
        sideCount: 0,
    };

    constructor(device: GPUDevice, pipeline: GPURenderPipeline) {
        this._buffer = device.createBuffer({
            size: UBO_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this._bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(BIND_GROUP_INDEX),
            entries: [{
                binding: BIND_INDEX,
                resource: { buffer: this._buffer }
            }]
        });
    }

    /**
     * getter
     */
    public getBindGroupIndex() {
        return BIND_GROUP_INDEX;
    }

    public getBindGroup() {
        return this._bindGroup;
    }

    /**
     * setter
     */
    public setDataProvider(dataProvider: () => UBOData) {
        this._dataProvider = dataProvider;
        return this;
    }

    /**
     * バッファを更新する
     */
    public update(device: GPUDevice) {
        const data = this._dataProvider();
        if (data) {
            this.data = data;
            device.queue.writeBuffer(this._buffer, 0, this.getBytes());
        }
        return this;
    }

    /**
     * バッファに書き込むためのバイトデータを返す
     */
    private getBytes(): BufferSource {
        this._cachedF32.set(this.data.matrix, UBO_LAYOUT.MATRIX); // setメソッドで一括コピー
        this._cachedF32[UBO_LAYOUT.TIME] = this.data.time;
        this._cachedF32[UBO_LAYOUT.ASPECT_RATIO] = this.data.aspectRatio;
        this._cachedF32[UBO_LAYOUT.MOUSE_X] = this.data.mouseX;
        this._cachedU32[UBO_LAYOUT.SIDE_COUNT] = this.data.sideCount;
        return this._cachedF32;
    }
}