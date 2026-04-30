/**
 * Uniform Bufferの並び順
 */
const UNIFORM_BUFFER_LAYOUT = {
    MVP_MATRIX: 0, // 0〜15番目 mat4x4<f32>
} as const;

/**
 * Uniform Bufferのサイズ
 */
const UNIFORM_BUFFER_SIZE = 4 * 16;

/**
 * Uniform Bufferのバインドグループのインデックス
 */
const BIND_GROUP_INDEX = 0;

/**
 * Uniform Bufferのバインドインデックス
 */
const BIND_INDEX = 0;

/**
 * Uniform Bufferのコンテキスト
 */
interface UniformBufferData {
    mvpMatrix: Float32Array;
}

export default class UniformBuffer {
    // bufferデータのキャッシュ
    private _cachedArrayBuffer = new ArrayBuffer(UNIFORM_BUFFER_SIZE);
    private _cachedF32 = new Float32Array(this._cachedArrayBuffer);

    // GPUリソース
    private _bindGroup: GPUBindGroup;
    private _buffer: GPUBuffer;

    // データ更新用関数
    private _dataProvider: () => UniformBufferData | null = () => null;

    // データ
    public data: UniformBufferData = {
        mvpMatrix: new Float32Array(16),
    };

    constructor(device: GPUDevice, pipeline: GPURenderPipeline) {
        this._buffer = device.createBuffer({
            size: UNIFORM_BUFFER_SIZE,
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
    public setDataProvider(dataProvider: () => UniformBufferData) {
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
        this._cachedF32.set(this.data.mvpMatrix, UNIFORM_BUFFER_LAYOUT.MVP_MATRIX);
        return this._cachedF32;
    }
}