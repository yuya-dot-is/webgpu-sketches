import { setupGPU, setupCanvas, setupVertexBuffer, createRenderPipelineDescriptor, createRenderPassDescriptor } from './setup';
import shaderCode from './shader.wgsl?raw';

// 頂点座標
const positions = new Float32Array([
   0.0,  0.6, 0.0, 1.0, // 頂点1
  -0.5, -0.6, 0.0, 1.0, // 頂点2
   0.5, -0.6, 0.0, 1.0  // 頂点3
]);

// 頂点の色
const colors = new Float32Array([
  1.0, 0.0, 0.0, 1.0, // 赤
  0.0, 1.0, 0.0, 1.0, // 緑
  0.0, 0.0, 1.0, 1.0  // 青
]);

const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

const vertexBufferLayouts: GPUVertexBufferLayout[]  = [
    {
        arrayStride: 16, // float32 * 4 = 4 bytes * 4 = 16 bytes
        attributes: [{
            shaderLocation: 0, // WGSL @location(0)
            offset: 0,
            format: "float32x4",
        }],
    },
    {
        arrayStride: 16, // float32 * 4 = 4 bytes * 4 = 16 bytes
        attributes: [{
            shaderLocation: 1, // WGSL @location(1)
            offset: 0,
            format: "float32x4",
        }],
    }
];

const main = async () => {
    const { gpu, device } = await setupGPU();
    const { context } = setupCanvas(gpu, device);
    const posBuffer = setupVertexBuffer(device, positions);
    const colorBuffer = setupVertexBuffer(device, colors);
    const shaderModule = device.createShaderModule({ code: shaderCode });
    const renderPipelineDescriptor = createRenderPipelineDescriptor(gpu, shaderModule, vertexBufferLayouts);
    const renderPipeline = device.createRenderPipeline(renderPipelineDescriptor);
    const renderPassDescriptor = createRenderPassDescriptor(context, clearColor);
    const commandEncoder = device.createCommandEncoder();
    const passEncoder: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, posBuffer);
    passEncoder.setVertexBuffer(1, colorBuffer);
    passEncoder.draw(3);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}

main();