struct Uniforms {
  mvpMatrix : mat4x4f,
}
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@vertex
fn vertex_main(
	@location(0) position: vec4f,
	@location(1) color: vec4f
) -> VertexOut {
  var output : VertexOut;
  output.position = uniforms.mvpMatrix * position;
  output.color = color;
  return output;
}

@fragment
fn fragment_main(
	fragData: VertexOut
) -> @location(0) vec4f {
  return fragData.color;
}