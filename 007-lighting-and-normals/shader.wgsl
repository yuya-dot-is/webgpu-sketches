struct Uniforms {
  mvp : mat4x4f,
  model : mat4x4f,
}
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

struct VertexInput {
    @location(0) position: vec4f,
    @location(1) normal: vec3f,
    @location(2) color: vec4f,
};

struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0) normal: vec3f,
  @location(1) color: vec4f,
  @location(2) world_pos: vec3f, // 光の計算のためにワールド座標が必要
}

@vertex
fn vertex_main(
	input: VertexInput,
) -> VertexOutput {
  var output : VertexOutput;
  
  // 描画用の座標（クリップ空間）
  output.position = uniforms.mvp * input.position;
  
  // 光計算用の座標（ワールド空間）
  output.world_pos = (uniforms.model * input.position).xyz;
  
  // 法線の変換（回転だけ適用）
  output.normal = (uniforms.model * vec4f(input.normal, 0.0)).xyz;
  
  output.color = input.color;
  return output;
}

@fragment
fn fragment_main(
	in: VertexOutput
) -> @location(0) vec4f
{
  // 光の定義（仮に右斜め上から）
  let light_pos = vec3f(5.0, 5.0, 5.0);
  let light_dir = normalize(light_pos - in.world_pos);
  
  // 法線の正規化（補間されると長さが1でなくなるため）
  let N = normalize(in.normal);
  
  // ランバート反射（内積）の計算
  let diffuse_intensity = max(dot(N, light_dir), 0.0);
  
  // 環境光（真っ暗にしないための底上げ）
  let ambient = 0.1;
  
  // 最終的な色の合成
  let light_factor = diffuse_intensity + ambient;
  return vec4f(in.color.rgb * light_factor, in.color.a);;
}