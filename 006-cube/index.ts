import { setupGPU, setupCanvas, setupVertexBuffer, setupIndexBuffer, createRenderPipelineDescriptor, createRenderPassDescriptor } from './setup';
import shaderCode from './shader.wgsl?raw';

// 頂点座標
const positions = new Float32Array([
    // 手前
    -0.5,  0.5,  0.5, 1.0, // 0: 左上
     0.5,  0.5,  0.5, 1.0, // 1: 右上
    -0.5, -0.5,  0.5, 1.0, // 2: 左下
     0.5, -0.5,  0.5, 1.0, // 3: 右下
     // 奥
    -0.5,  0.5, -0.5, 1.0, // 4: 左上
     0.5,  0.5, -0.5, 1.0, // 5: 右上
    -0.5, -0.5, -0.5, 1.0, // 6: 左下
     0.5, -0.5, -0.5, 1.0, // 7: 右下
]);

// 頂点の組み合わせ
const indexes = new Uint32Array([
    0, 1, 2, // 手前1
    3, 1, 2, // 手前2
    4, 5, 6, // 奥1
    7, 5, 6, // 奥2
    0, 1, 4, // 上1
    5, 1, 4, // 上2
    2, 3, 6, // 下1
    7, 3, 6, // 下2
    0, 2, 4,// 左1
    6, 2, 4,// 左2
    1, 3, 5,// 右1
    7, 3, 5,// 右2
]);

// 頂点の色
const colors = new Float32Array([
    // 手前
    1.0, 0.0, 0.0, 1.0, // 赤
    0.0, 1.0, 0.0, 1.0, // 緑
    0.0, 0.0, 1.0, 1.0, // 青
    1.0, 0.0, 1.0, 1.0, // 紫
    // 奥
    1.0, 1.0, 0.0, 1.0, // 黄
    0.0, 1.0, 1.0, 1.0, // シアン
    1.0, 0.5, 0.5, 1.0, // マゼンタ
    0.5, 1.0, 0.5, 1.0, // 黄緑
]);

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
    const indexBuffer = setupIndexBuffer(device, indexes);
    const colorBuffer = setupVertexBuffer(device, colors);
    const shaderModule = device.createShaderModule({ code: shaderCode });
    const renderPipelineDescriptor = createRenderPipelineDescriptor(gpu, shaderModule, vertexBufferLayouts);
    const renderPipeline = device.createRenderPipeline(renderPipelineDescriptor);
    const renderPassDescriptor = createRenderPassDescriptor(context);
    const commandEncoder = device.createCommandEncoder();
    const passEncoder: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, posBuffer);
    passEncoder.setVertexBuffer(1, colorBuffer);
	passEncoder.setIndexBuffer(indexBuffer, 'uint32');
    passEncoder.drawIndexed(indexes.length);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}

main();