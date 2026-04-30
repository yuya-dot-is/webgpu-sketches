import shaderCode from "./shader.wgsl?raw";
import UBO from "./UBO";

/**
 * マウスカーソルの位置
 */
type Mouse = {
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
const setupMouseTracker = (): Mouse => {
    const mouse = { x: 0, y: 0 };
    window.addEventListener('pointermove', (evt: MouseEvent) => {
        mouse.x = evt.offsetX;
        mouse.y = evt.offsetY;
    });
    return mouse;
}

/**
 * マウスカーソルの位置から角度を計算する
 */
const mapMousePosToAngle = (mouse: Mouse, canvasWidth: number, canvasHeight: number) => {
    const x = (mouse.x / canvasWidth - 0.5) / (canvasWidth / canvasHeight);
    const y = - (mouse.y / canvasHeight - 0.5);
    return Math.atan2(y, x);
}

/**
 * マウスカーソルの位置から多角形の辺の数を計算する
 */
const mapMouseYToSideCount = (mouseY: number, canvasHeight: number) => {
    const y = - (mouseY / canvasHeight - 0.5);
    // (y + 0.5)が[ 0.0 〜 1.0 ]の範囲なので、全体は[ 3 〜 103 ]の範囲になる。
    // 4乗することで、角の少ない多角形を表示しやすくしている。
    return Math.floor((y + 0.5) ** 4 * 100) + 3;
}

/**
 * 4x4 透視投影行列 (Perspective Projection Matrix)
 * @param fovDegree 視野角 (例: 45)
 * @param aspect アスペクト比 (width / height)
 * @param near 前方クリップ面 (これより近いと映らない)
 * @param far 後方クリップ面 (これより遠いと映らない)
 */
const createPerspectiveMatrix = (fovDegree: number, aspect: number, near: number, far: number): Float32Array => {
    const f = 1.0 / Math.tan((fovDegree * Math.PI) / 180 / 2);
    const rangeInv = 1.0 / (near - far);

    // NOTE: WebGPU/WGSL は列優先
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeInv, -1, // ZをWに押し込むための -1
        0, 0, near * far * rangeInv * 2, 0
    ]);
};

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
    const mouse = setupMouseTracker();

    // WGSLに渡す値を設定する
    const ubo = new UBO(device, pipeline);
    ubo.setDataProvider(() => ({
        matrix: createPerspectiveMatrix(60, context.canvas.width / context.canvas.height, 0.1, 100),
        time: performance.now() / 1000,
        aspectRatio: context.canvas.width / context.canvas.height,
        angle: mapMousePosToAngle(mouse, context.canvas.width, context.canvas.height),
        sideCount: mapMouseYToSideCount(mouse.y, context.canvas.height),
    }));

    // 描画処理
    startRenderLoop(device, context, pipeline, (passEncoder) => {
        // WGSLに渡す値を更新する
        ubo.update(device);
        // WGSLに値を渡す
        passEncoder.setBindGroup(ubo.getBindGroupIndex(), ubo.getBindGroup());
        // (n + 1) * 3 個の頂点を描画
        const vertexCount = (ubo.data.sideCount + 1) * 3;
        passEncoder.draw(vertexCount);
    });
}

main().catch(console.error);