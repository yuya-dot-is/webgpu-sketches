# webgpu-sketches

A collection of graphics programming sketches using WebGPU and WGSL. Focusing on the progression from core rendering engine fundamentals to advanced visual techniques.

WebGPUおよびWGSLを用いたグラフィックスプログラミングの学習・実験ログです。レンダリングエンジンの基礎構築から応用的な表現までを段階的に実装します。

## 🚀 Live Demo
[https://webgpu-sketches.yuya.is](https://webgpu-sketches.yuya.is)

## 🛠 Tech Stack
- **Language:** TypeScript
- **Graphics API:** WebGPU / WGSL
- **Build Tool:** Vite
- **Math Library:** wgpu-matrix

## 🗺️ Roadmap
- [x] **001: triangle** - GPUAdapter, GPUDevice, Pipeline Layout, Render Pipeline
- [x] **002: moving-triangle** - `requestAnimationFrame`, Dynamic Buffer Update (`writeBuffer`)
- [x] **003: phased-transition** - Geometry logic, Interpolation (Step-based transition)
- [x] **004: interactive-polygon** - DOM Event Sync, GPU Buffer feedback
- [x] **005: perspective** - Projection Matrix (3D Depth Math), Uniform Buffer
- [x] **006: cube** - Index Buffer, MVP Matrix, Depth Buffer (Z-Buffer), Resize Handling
- [x] **007: Lighting** - Normals, Lambert/Phong shading
- [ ] **008: Texture Mapping** - Samplers, UV coordinates
- [ ] **009: Instancing** - Efficiently rendering many objects
- [ ] **010: Compute Shader** - Non-rendering parallel calculation

## 🏗 Setup

```bash
# Clone the repository
git clone https://github.com/yuya-dot-is/webgpu-sketches.git

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build