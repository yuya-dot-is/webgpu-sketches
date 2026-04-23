// 外部（JS）から届くデータの形を定義する
struct MyUniforms {
    time: f32,
};

// 0番のバインドグループの、0番のバインディングに届くデータとして登録
@group(0) @binding(0) var<uniform> u: MyUniforms;

@vertex
fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> @builtin(position) vec4f {
    var pos = array<vec2f, 3>(
        vec2f(0.0, 0.5),   // 上
        vec2f(-0.5, -0.5), // 左下
        vec2f(0.5, -0.5)   // 右下
    );

    var p = pos[in_vertex_index];

    let offset_x = sin(u.time) * 0.5;
    let offset_y = cos(u.time) * 0.5;
    p.x += offset_x;
    p.y += offset_y;
    return vec4f(p, 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
    let r = sin(u.time * 2);
    let g = cos(u.time * 3);
    let b = sin(u.time * 5) * cos(u.time * 7);
    return vec4f(r, g, b, 1.0);
}