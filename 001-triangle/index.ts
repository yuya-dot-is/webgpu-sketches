/**
 * GPUDeviceの取得
 */
const getDevice = async (): Promise<GPUDevice> => {
    if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
    }

    const device = await adapter.requestDevice();
    return device;
}

/*
 * CanvasContextの取得
 */
const getContext = (device: GPUDevice, canvasFormat: GPUTextureFormat): GPUCanvasContext => {
    const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    context.configure({
        device: device,
        format: canvasFormat,
        alphaMode: 'opaque',
    });
    return context;
}

/*
 * シェーダーの作成
 */
const createShaderModule = (device: GPUDevice): GPUShaderModule => {
    const shaderCode = `
        @vertex
        fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> @builtin(position) vec4f {
            var pos = array<vec2f, 3>(
                vec2f(0.0, 0.5),   // 上
                vec2f(-0.5, -0.5), // 左下
                vec2f(0.5, -0.5)   // 右下
            );
            return vec4f(pos[in_vertex_index], 0.0, 1.0);
        }

        @fragment
        fn fs_main() -> @location(0) vec4f {
            return vec4f(1.0, 0.5, 0.0, 1.0);
        }
    `;

    return device.createShaderModule({
        code: shaderCode
    });
}

/*
 * パイプラインの作成
 */
const createPipline = (device: GPUDevice, shaderModule: GPUShaderModule, canvasFormat: GPUTextureFormat) => {
    return device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
        },
        fragment: {
            module: shaderModule,
            entryPoint: 'fs_main',
            targets: [{
                format: canvasFormat
            }],
        },
        primitive: {
            topology: 'triangle-list',
        }
    });
}


async function main() {
    // 初期化
    const device = await getDevice();
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    const context = getContext(device, canvasFormat);

    // シェーダーの生成
    const shaderModule = createShaderModule(device);

    // パイプラインの生成
    const pipeline = createPipline(device, shaderModule, canvasFormat);

    // 描画処理
    function render() {
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();

        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }, // 背景色
                loadOp: 'clear',
                storeOp: 'store',
            }]
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.draw(3); // 3つの頂点を描画
        passEncoder.end();

        device.queue.submit([commandEncoder.finish()]);
    }

    render();
}

main().catch(console.error);