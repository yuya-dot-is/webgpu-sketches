import { assertDefined } from "./assert";

export const setupGPU = async () => {
	const gpu: GPU | null = navigator.gpu;
	assertDefined(gpu, 'WebGPU');
	// 「OS組み込みのGPU API」とやりとりをするためのアダプターをリクエスト
	const adapter: GPUAdapter | null = await gpu.requestAdapter();
	assertDefined(adapter, 'GPUAdapter');
	// アダプターに対して各Webアプリケーション用の論理デバイス（GPUDevice）をリクエスト
	const device: GPUDevice = await adapter.requestDevice();
	return { gpu, device }
};

export const setupCanvas = (gpu: GPU, device: GPUDevice) => {
	const canvas: HTMLCanvasElement | null = document.querySelector('#canvas');
	assertDefined(canvas, 'HTMLCanvasElement');
	const context: GPUCanvasContext | null = canvas.getContext('webgpu');
	assertDefined(context, 'GPUCanvasContext');
	context.configure({
		device,
		format: gpu.getPreferredCanvasFormat(),
		// NOTE: opaque: 不透明 | premultiplied: 透過。RBG各値にalpha値が乗算済みである必要がある。
		alphaMode: 'premultiplied', 
	})
	return { canvas, context }
};

export const setupVertexBuffer = (device: GPUDevice, vertices: Float32Array) => {
	const vertexBuffer: GPUBuffer = device.createBuffer({
			size: vertices.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
		});
	device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);
	return vertexBuffer
};

export const setupIndexBuffer = (device: GPUDevice, indexes: Uint32Array) => {
	const indexBuffer: GPUBuffer = device.createBuffer({
			size: indexes.byteLength,
			usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
		});
	device.queue.writeBuffer(indexBuffer, 0, indexes, 0, indexes.length);
	return indexBuffer
};

export const createRenderPipelineDescriptor = (gpu: GPU, shaderModule: GPUShaderModule, vertexBufferLayouts: GPUVertexBufferLayout[]) => {
	const descriptor: GPURenderPipelineDescriptor = {
		vertex: {
			module: shaderModule,
			entryPoint: "vertex_main",
			buffers: vertexBufferLayouts,
		},
		fragment: {
			module: shaderModule,
			entryPoint: "fragment_main",
			targets: [
				{
					format: gpu.getPreferredCanvasFormat(),
				},
			],
		},
		primitive: {
			topology: "triangle-list",
		},
		layout: "auto",
	};
	return descriptor;
};

export const createRenderPassDescriptor = (context: GPUCanvasContext) => {
	const descriptor: GPURenderPassDescriptor = {
		colorAttachments: [
			{
			clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.5 }, // 背景を塗りつぶす色
			loadOp: "clear", // clear: 毎フレームリセット | load: 前の描画状態を引き継ぐ
			storeOp: "store", // store: 計算結果を画面に表示する場合 | discard: 画面に表示しない場合
			view: context.getCurrentTexture().createView(), // 次のフレームの描画先
			},
		],
	};
	return descriptor;
}