// 外部（JS）から届くデータの形を定義する
struct MyUniforms {
    time: f32,
};

// 0番のバインドグループの、0番のバインディングに届くデータとして登録
@group(0) @binding(0) var<uniform> u: MyUniforms;

@vertex
fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> @builtin(position) vec4f {
    let triangle_vertex_index: u32 = in_vertex_index % 3u;
    // 全ての三角形の共通の中心の頂点
    if(triangle_vertex_index == 0u) {
        return vec4f(0.0, 0.0, 0.0, 1.0);
    }

    const PI: f32 = 3.14159265359;
    const triangle_count: u32 = 6u;
    let triangle_index: u32 = in_vertex_index / 3u;
    const central_angle: f32 = 2f * PI / f32(triangle_count);

    // 動く三角形
    if(triangle_index == triangle_count){
        let moving_side_angle: f32 = u.time % (2f * PI);
        // 動く三角形の1辺目の角度
        if(triangle_vertex_index == 1u) {
            let side_angle: f32 = floor(moving_side_angle / central_angle) * central_angle;
            return vec4f(cos(side_angle), sin(side_angle), 0.0, 1.0);
        }
        // 動く三角形の2辺目の角度
        return vec4f(cos(moving_side_angle), sin(moving_side_angle), 0.0, 1.0);
    }

    // 動かない三角形
    if(triangle_vertex_index == 1u) {
        // 六角形の1辺目の角度
        let first_side_angle: f32 = f32(triangle_index) * central_angle;
        return vec4f(cos(first_side_angle), sin(first_side_angle), 0.0, 1.0);
    }
    // 六角形の2辺目の角度
    let second_side_angle: f32 = f32(triangle_index) * central_angle + central_angle;
    return vec4f(cos(second_side_angle), sin(second_side_angle), 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
    let r = sin(u.time * 2);
    let g = cos(u.time * 3);
    let b = sin(u.time * 5) * cos(u.time * 7);
    return vec4f(r, g, b, 1.0);
}