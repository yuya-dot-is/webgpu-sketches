type TypeMap = {
    float32: Float32Array;
    int32: Int32Array;
};

type Layout = {
    readonly name: string,
    readonly length: number,
    readonly type: keyof TypeMap
}

type UniformBufferData = {
    [T in typeof CONFIG.LAYOUT[number] as T['name']]: TypeMap[T['type']];
};

const CONFIG = {
    BIND_GROUP_INDEX: 0,
    BIND_INDEX: 0,
    LAYOUT: [
        { name: 'mvp', length: 16, type: 'float32' },
        { name: 'model', length: 16, type: 'float32' },
        { name: 'eyePos', length: 3, type: 'float32' },
    ] as const satisfies Layout[],
} as const;

const uniformIBufferInfo = (<T extends readonly { name: string, length: number }[]>(layouts: T) => {
    type Name = T[number]['name'];
    const layout = {} as Record<Name, { offset: number, length: number }>;
    let offset = 0;
    for(let i = 0; i < layouts.length; i+= 1) {
        const item = layouts[i];
        layout[item.name as Name] = {
            offset,
            length: item.length
        };
        offset += Math.ceil(item.length / 4) * 4;
    }
    return { size: offset * 4, layout };
})(CONFIG.LAYOUT);

const cachedArrayBuffer =  new ArrayBuffer(uniformIBufferInfo.size);
const bytes = {
    f32: new Float32Array(cachedArrayBuffer),
}

let dataProvider: () => UniformBufferData | null = () => null;

export default function UniformBuffer(device: GPUDevice, pipeline: GPURenderPipeline) {
    const _device = device;
    const _buffer = device.createBuffer({
        size: uniformIBufferInfo.size,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const _bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(CONFIG.BIND_GROUP_INDEX),
        entries: [{
            binding: CONFIG.BIND_INDEX,
            resource: { buffer: _buffer }
        }]
    });
    return {
        BIND_GROUP_INDEX: CONFIG.BIND_GROUP_INDEX,
        BIND_INDEX: CONFIG.BIND_INDEX,
        getBindGroup() {
            return _bindGroup;
        },
        /**
         * バッファを更新する
         */
        update() {
            const provided = dataProvider();
            if (!provided) {
                return;
            }
            for (const [name, layout] of Object.entries(uniformIBufferInfo.layout)) {
                type Name = keyof UniformBufferData;
                const key = name as Name;
                bytes.f32.set(provided[key], layout.offset);
            }
            _device.queue.writeBuffer(_buffer, 0, bytes.f32);
        },
        /**
         * データ更新用関数をセットする
         */
        setDataProvider(provider: () => UniformBufferData) {
            dataProvider = provider;
        }
    } as const;
};
