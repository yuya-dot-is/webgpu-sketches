import shaderCode from "./shader.wgsl?raw";

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
const getContext = (): GPUCanvasContext => {
    const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    return context;
}

/*
 * シェーダーの作成
 */
const createShaderModule = (device: GPUDevice): GPUShaderModule => {
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

const createBuffer = (device: GPUDevice, pipeline: GPURenderPipeline, size: number, dataProvider: () => Float32Array<ArrayBuffer>) => {
    const bindGroupIndex = 0;
    const buffer = device.createBuffer({
        size,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(bindGroupIndex),
        entries: [{
            binding: 0,
            resource: { buffer }
        }]
    });
    return {
        update: () => {
            device.queue.writeBuffer(buffer, 0, dataProvider());
        },
        bindGroupIndex,
        bindGroup
    };
}

const encode = (device: GPUDevice, context: GPUCanvasContext, pipeline: GPURenderPipeline, drawCommands: (passEncoder: GPURenderPassEncoder) => void) => {
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
    drawCommands(passEncoder);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}

function startRenderLoop(device: GPUDevice, context: GPUCanvasContext, pipeline: GPURenderPipeline, drawCommands: (passEncoder: GPURenderPassEncoder) => void) {
    const render = () => {
        encode(device, context, pipeline, drawCommands);
        requestAnimationFrame(render);
    }
    render();
}

const fitCanvasToWindow = (context: GPUCanvasContext, device: GPUDevice, canvasFormat: GPUTextureFormat) => {
    const handleResize = () => {
        context.canvas.width = window.innerWidth;
        context.canvas.height = window.innerHeight;
        // WebGPUのコンテキストを新しいサイズで再構成
        context.configure({
            device: device,
            format: canvasFormat,
            alphaMode: 'opaque',
        });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
}

async function main() {
    // 初期化
    const device = await getDevice();
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    const context = getContext();
    fitCanvasToWindow(context, device, canvasFormat);

    // シェーダーの生成
    const shaderModule = createShaderModule(device);

    // パイプラインの生成
    const pipeline = createPipline(device, shaderModule, canvasFormat);


    // wgslに渡す値を設定する
    const buffer = createBuffer(device, pipeline, 4 * 2, () => {
        const time = performance.now() / 1000;
        const aspectRatio = context.canvas.width / context.canvas.height;
        return new Float32Array([time, aspectRatio])
    });

    // 描画処理
    startRenderLoop(device, context, pipeline, (passEncoder) => {
        buffer.update(); // wgslに渡す値を更新する
        // wgslに値を渡す
        passEncoder.setBindGroup(buffer.bindGroupIndex, buffer.bindGroup);
        passEncoder.draw(21); // 3 * 7個の頂点を描画
    });
}

main().catch(console.error);