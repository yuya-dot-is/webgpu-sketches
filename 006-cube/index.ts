import { setupGPU, setupCanvas, setupVertexBuffer, setupIndexBuffer, createRenderPipelineDescriptor, createRenderPassDescriptor } from './setup';
import shaderCode from './shader.wgsl?raw';
import * as data from './data';
import UniformBuffer from './UniformBuffer';
import { mat4 } from 'wgpu-matrix';




const createMvpMatrix = (context: GPUCanvasContext) => {
    // 1. Projection Matrix (WebGPUの 0~1 Z-rangeに自動対応)
    const aspect = context.canvas.width / context.canvas.height;
    const projection = mat4.perspective(Math.PI / 4, aspect, 0.1, 100);

    // 2. View Matrix (カメラの位置)
    const view = mat4.lookAt(
        [0, 0, 5], // カメラの位置 (eye)
        [0, 0, 0], // 注視点 (target)
        [0, 5, 0]  // 上方向 (up)
    );

    // 3. Model Matrix (回転)
    const model = mat4.rotationY(performance.now() / 1000);

    // 4. MVPを統合 (計算順序は右から左: P * V * M)
    const mvpMatrix = mat4.multiply(projection, mat4.multiply(view, model));
    return mvpMatrix;
}

const main = async () => {
    const { device, textureFormat } = await setupGPU();
    const { context } = setupCanvas(device, textureFormat);
    const posBuffer = setupVertexBuffer(device, data.positions);
    const indexBuffer = setupIndexBuffer(device, data.indexes);
    const colorBuffer = setupVertexBuffer(device, data.colors);
    const shaderModule = device.createShaderModule({ code: shaderCode });
    const renderPipelineDescriptor = createRenderPipelineDescriptor(shaderModule, data.vertexBufferLayouts, textureFormat);
    const renderPipeline = device.createRenderPipeline(renderPipelineDescriptor);
	const uniformBuffer = new UniformBuffer(device, renderPipeline);

	uniformBuffer.setDataProvider(() => {
		return { mvpMatrix: createMvpMatrix(context) };
	});

    function render() {
        uniformBuffer.update(device);
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
        window.requestAnimationFrame(render)
    }
    render();
}

main();