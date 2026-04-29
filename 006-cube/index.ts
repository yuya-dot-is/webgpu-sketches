import { setupGPU, setupCanvas, setupVertexBuffer, setupIndexBuffer, createRenderPipelineDescriptor, createRenderPassDescriptor } from './setup';
import shaderCode from './shader.wgsl?raw';
import * as data from './data';

const main = async () => {
    const { gpu, device } = await setupGPU();
    const { context } = setupCanvas(gpu, device);
    const posBuffer = setupVertexBuffer(device, data.positions);
    const indexBuffer = setupIndexBuffer(device, data.indexes);
    const colorBuffer = setupVertexBuffer(device, data.colors);
    const shaderModule = device.createShaderModule({ code: shaderCode });
    const renderPipelineDescriptor = createRenderPipelineDescriptor(gpu, shaderModule, data.vertexBufferLayouts);
    const renderPipeline = device.createRenderPipeline(renderPipelineDescriptor);
    const renderPassDescriptor = createRenderPassDescriptor(context);
    const commandEncoder = device.createCommandEncoder();
    const passEncoder: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, posBuffer);
    passEncoder.setVertexBuffer(1, colorBuffer);
	passEncoder.setIndexBuffer(indexBuffer, 'uint32');
    passEncoder.drawIndexed(data.indexes.length);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}

main();