import { setupGPU, setupCanvas, setupVertexBuffer, setupIndexBuffer, createRenderPipelineDescriptor, createRenderPassDescriptor } from './setup';
import shaderCode from './shader.wgsl?raw';
import * as data from './data';
import UniformBuffer from './UniformBuffer';

const main = async () => {
    const { gpu, device } = await setupGPU();
    const { context } = setupCanvas(gpu, device);
    const posBuffer = setupVertexBuffer(device, data.positions);
    const indexBuffer = setupIndexBuffer(device, data.indexes);
    const colorBuffer = setupVertexBuffer(device, data.colors);
    const shaderModule = device.createShaderModule({ code: shaderCode });
    const renderPipelineDescriptor = createRenderPipelineDescriptor(gpu, shaderModule, data.vertexBufferLayouts);
    const renderPipeline = device.createRenderPipeline(renderPipelineDescriptor);
	const uniformBuffer = new UniformBuffer(device, renderPipeline);
	// TODO: 仮
	const mvpMatrix = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1,
	]);
	uniformBuffer.setDataProvider(() => {
		return { mvpMatrix };
	}).update(device);
    const renderPassDescriptor = createRenderPassDescriptor(context);
    const commandEncoder = device.createCommandEncoder();
    const passEncoder: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, posBuffer);
    passEncoder.setVertexBuffer(1, colorBuffer);
	passEncoder.setIndexBuffer(indexBuffer, 'uint32');
	passEncoder.setBindGroup(uniformBuffer.getBindGroupIndex(), uniformBuffer.getBindGroup());
    passEncoder.drawIndexed(data.indexes.length);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}

main();