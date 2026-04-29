import { setupGPU, setupCanvas, setupVertexBuffer, createRenderPipelineDescriptor, createRenderPassDescriptor } from './setup';
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

const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

const vertexBufferLayouts: GPUVertexBufferLayout[]  = [{
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
}];

const main = async () => {
    const { gpu, device } = await setupGPU();
    const { context } = setupCanvas(gpu, device);
    const vertexBuffer = setupVertexBuffer(device, vertices);
    const shaderModule = device.createShaderModule({ code: shaderCode });
    const renderPipelineDescriptor = createRenderPipelineDescriptor(gpu, shaderModule, vertexBufferLayouts);
    const renderPipeline = device.createRenderPipeline(renderPipelineDescriptor);
    const renderPassDescriptor = createRenderPassDescriptor(context, clearColor);
    const commandEncoder = device.createCommandEncoder();
    const passEncoder: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(3);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}

main();