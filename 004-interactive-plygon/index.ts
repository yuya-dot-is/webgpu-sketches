import shaderCode from "./shader.wgsl?raw";

/**
 * マウスカーソルの位置
 */
type MousePosition = {
    x: number;
    y: number;
}


/**
 * GPUDeviceを取得する
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
 * CanvasContextを取得する
 */
const getContext = (): GPUCanvasContext => {
    const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    return context;
}

/*
 * シェーダーモジュールを作成する
 */
const createShaderModule = (device: GPUDevice): GPUShaderModule => {
    return device.createShaderModule({
        code: shaderCode
    });
}

/*
 * パイプラインを作成する
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

/**
 * WGSLに渡す値を設定する
 */
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

/**
 * WGSLに渡す命令をエンコードする
 */
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

/**
 * 描画ループを開始する
 */
function startRenderLoop(device: GPUDevice, context: GPUCanvasContext, pipeline: GPURenderPipeline, drawCommands: (passEncoder: GPURenderPassEncoder) => void) {
    const render = () => {
        encode(device, context, pipeline, drawCommands);
        requestAnimationFrame(render);
    }
    render();
}

/**
 * CanvasのサイズをWindowサイズに合わせる
 */
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

/**
 * マウスカーソルの位置を追跡する
 */
const setupMouseTracker = (): MousePosition => {
    const mousePosition = { x: 0, y: 0 };
    window.addEventListener('mousemove', (evt: MouseEvent) => {
        mousePosition.x = evt.offsetX;
        mousePosition.y = evt.offsetY;
    });
    return mousePosition;
}

/**
 * メインの処理
 */
async function main() {
    // 初期化
    const device = await getDevice();
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    const context = getContext();

    // Canvasサイズの設定
    fitCanvasToWindow(context, device, canvasFormat);

    // シェーダーの生成
    const shaderModule = createShaderModule(device);

    // パイプラインの生成
    const pipeline = createPipline(device, shaderModule, canvasFormat);

    // マウスカーソルの位置の追跡
    const mousePosition = setupMouseTracker();

    // WGSLに渡す値を設定する
    const buffer = createBuffer(device, pipeline, 4 * 4, () => {
        const time = performance.now() / 1000;
        const aspectRatio = context.canvas.width / context.canvas.height;
        const mouseX = mousePosition.x / context.canvas.width - 0.5;
        const mouseY = - (mousePosition.y / context.canvas.height - 0.5);
        return new Float32Array([time, aspectRatio, mouseX, mouseY]);
    });

    // 描画処理
    startRenderLoop(device, context, pipeline, (passEncoder) => {
        buffer.update(); // WGSLに渡す値を更新する
        // WGSLに値を渡す
        passEncoder.setBindGroup(buffer.bindGroupIndex, buffer.bindGroup);
        passEncoder.draw(21); // 3 * 7個の頂点を描画
    });
}

main().catch(console.error);