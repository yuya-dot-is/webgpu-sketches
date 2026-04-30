import { assertDefined } from "./assert";

/**
 * CanvasのサイズをWindowサイズに合わせる
 */
export const fitCanvasToWindow = (device: GPUDevice, context: GPUCanvasContext, textureFormat: GPUTextureFormat) => {
	const handleResize = () => {
		context.canvas.width = window.innerWidth * window.devicePixelRatio;
		context.canvas.height = window.innerHeight * window.devicePixelRatio;
		// WebGPUのコンテキストを新しいサイズで再構成
		context.configure({
			device: device,
			format: textureFormat,
			// NOTE: opaque: 不透明 | premultiplied: 透過。RBG各値にalpha値が乗算済みである必要がある。
			alphaMode: 'opaque',
		});
	}
	handleResize();
	addEventListener('resize', handleResize);
}

export const setupGPU = async () => {
	const gpu: GPU | null = navigator.gpu;
	assertDefined(gpu, 'WebGPU');
	// 「OS組み込みのGPU API」とやりとりをするためのアダプターをリクエスト
	const adapter: GPUAdapter | null = await gpu.requestAdapter();
	assertDefined(adapter, 'GPUAdapter');
	// アダプターに対して各Webアプリケーション用の論理デバイス（GPUDevice）をリクエスト
	const device: GPUDevice = await adapter.requestDevice();
	const textureFormat: GPUTextureFormat = gpu.getPreferredCanvasFormat();
	return { device, textureFormat }
};

export const setupCanvas = (device: GPUDevice, textureFormat: GPUTextureFormat) => {
	const canvas: HTMLCanvasElement | null = document.querySelector('#canvas');
	assertDefined(canvas, 'HTMLCanvasElement');
	const context: GPUCanvasContext | null = canvas.getContext('webgpu');
	assertDefined(context, 'GPUCanvasContext');
	fitCanvasToWindow(device, context, textureFormat)
	return { context }
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

export const createDepthTexture = (device: GPUDevice, context: GPUCanvasContext) => {
	const createDescriptor = (width: number, height: number) => {
		return {
			size: [width, height],
			format: 'depth24plus' as const, // 一般的な深さフォーマット
			usage: GPUTextureUsage.RENDER_ATTACHMENT,
		}
	};
	const depthTexture = {
		current: device.createTexture(createDescriptor(context.canvas.width, context.canvas.height)),
	};
	const handleResize = () => {
		depthTexture.current.destroy();
		depthTexture.current = device.createTexture(createDescriptor(context.canvas.width, context.canvas.height));
	};
	addEventListener('resize', handleResize);
	return depthTexture;
}

export const createRenderPipelineDescriptor = (shaderModule: GPUShaderModule, vertexBufferLayouts: GPUVertexBufferLayout[], textureFormat: GPUTextureFormat) => {
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
					format: textureFormat,
				},
			],
		},
		primitive: {
			topology: "triangle-list",
		},
		depthStencil: {
			format: 'depth24plus',
			depthWriteEnabled: true, // 描いたピクセルの深さを記録する
			depthCompare: 'less',    // 「今あるものより手前なら描く」というルール
		},
		layout: "auto",
	};
	return descriptor;
};

export const createRenderPassDescriptor = (context: GPUCanvasContext, depthTexture: GPUTexture) => {
	const descriptor: GPURenderPassDescriptor = {
		colorAttachments: [
			{
			clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }, // 背景を塗りつぶす色
			loadOp: "clear", // clear: 毎フレームリセット | load: 前の描画状態を引き継ぐ
			storeOp: "store", // store: 計算結果を画面に表示する場合 | discard: 画面に表示しない場合
			view: context.getCurrentTexture().createView(), // 次のフレームの描画先
			},
		],
		depthStencilAttachment: {
			view: depthTexture.createView(),
			depthClearValue: 1.0,  // 一番奥を1.0としてリセット
			depthLoadOp: 'clear',
			depthStoreOp: 'store', // storeOpは'store'でも'discard'でもOK（後で使わないなら）
		},
	};	
	return descriptor;
}