import shaderCode from './shader.wgsl?raw';

const vertices = new Float32Array([
     // 上の頂点
    0.0, 0.6, 0, 1, // 座標
    1, 0, 0, 1, // 色: 赤
  
    // 左下の頂点
    -0.5, -0.6, 0, 1,
    0, 1, 0, 1, // 色: 緑
  
    // 右下の頂点
    0.5, -0.6, 0, 1, 
    0, 0, 1, 1, // 色: 青
]);

const vertexBuffers: GPUVertexBufferLayout[]  = [
    {
        attributes: [
            {
                shaderLocation: 0, // 位置
                offset: 0,
                format: "float32x4",
            },
            {
                shaderLocation: 1, // 色
                offset: 16,
                format: "float32x4",
            },
        ],
        arrayStride: 32,
        stepMode: "vertex",
    },
];

const main = async () => {

    if (!navigator.gpu) {
        throw Error("WebGPU に対応していません。");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw Error("WebGPU アダプターの要求に失敗しました。");
    }

    const device = await adapter.requestDevice();

    const shaderModule = device.createShaderModule({
        code: shaderCode,
    });

    const canvas: HTMLCanvasElement | null = document.querySelector("#canvas");
    if (!canvas) {
        throw Error("Canvas要素の取得に失敗しました。");
    }
    const context = canvas.getContext("webgpu");
    if (!context) {
        throw Error("Canvasのコンテキストの取得に失敗しました。");
    }

    context.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat(),
    alphaMode: "premultiplied",
    });

    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

    const pipelineDescriptor: GPURenderPipelineDescriptor = {
        vertex: {
            module: shaderModule,
            entryPoint: "vertex_main",
            buffers: vertexBuffers,
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fragment_main",
            targets: [
            {
                format: navigator.gpu.getPreferredCanvasFormat(),
            },
            ],
        },
        primitive: {
            topology: "triangle-list",
        },
        layout: "auto",
    };
    const renderPipeline = device.createRenderPipeline(pipelineDescriptor);
    const commandEncoder = device.createCommandEncoder();
    const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
            {
            clearValue: clearColor,
            loadOp: "clear",
            storeOp: "store",
            view: context.getCurrentTexture().createView(),
            },
        ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(3);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}

main();