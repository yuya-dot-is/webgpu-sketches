import { setupGPU, setupCanvas, setupVertexBuffer, setupIndexBuffer, createRenderPipelineDescriptor, createRenderPassDescriptor, createDepthTexture } from './setup';
import shaderCode from './shader.wgsl?raw';
import * as data from './data';
import UniformBuffer from './UniformBuffer';
import { mat4 } from 'wgpu-matrix';

const createMatrix = (context: GPUCanvasContext, dist: { mvp: Float32Array, model: Float32Array }) => {
    // Projection Matrix (WebGPUの 0~1 Z-rangeに自動対応)
    const aspect = context.canvas.width / context.canvas.height;
    // TODO: 行列の内容をコメントで記載
    const projection = mat4.perspective(Math.PI / 4, aspect, 0.1, 100);

    // View Matrix (カメラの位置)
    // TODO: 行列の内容をコメントで記載
    const view = mat4.lookAt(
        [0, 3, 3], // カメラの位置 (eye)
        [0, 0, 0], // 注視点 (target)
        [0, 5, 0]  // 上方向 (up)
    );

    // Model Matrix (回転)
    // TODO: 行列の内容をコメントで記載
    mat4.rotationY(performance.now() / 1000, dist.model);
    mat4.rotateX(dist.model, performance.now() / 900, dist.model);

    // MVPを統合 (計算順序は右から左: P * V * M)
    mat4.multiply(projection, mat4.multiply(view, dist.model), dist.mvp);
    return dist;
}

const main = async () => {
    const { device, textureFormat } = await setupGPU();
    const { context } = setupCanvas(device, textureFormat);
    const vertexBuffer = setupVertexBuffer(device, data.vertices);
    const indexBuffer = setupIndexBuffer(device, data.indexes);
    const shaderModule = device.createShaderModule({ code: shaderCode });
    const depthTexture = createDepthTexture(device, context);
    const renderPipelineDescriptor = createRenderPipelineDescriptor(shaderModule, data.vertexBufferLayouts, textureFormat);
    const renderPipeline = device.createRenderPipeline(renderPipelineDescriptor);
	const uniformBuffer = new UniformBuffer(device, renderPipeline);

    const mvpMatrix = { data: { mvp: new Float32Array(16), model: new Float32Array(16) } };
	uniformBuffer.setDataProvider(() => {
        const { mvp, model } = createMatrix(context, mvpMatrix.data);
		return { 
            mvp,
            model,
        };
	});

    function render() {
        uniformBuffer.update(device);
        const renderPassDescriptor = createRenderPassDescriptor(context, depthTexture.current);
        const commandEncoder = device.createCommandEncoder();
        const passEncoder: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setVertexBuffer(0, vertexBuffer);
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