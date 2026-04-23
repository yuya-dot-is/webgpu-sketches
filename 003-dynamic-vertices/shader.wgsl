// 外部（JS）から届くデータの形を定義する
struct MyUniforms {
    time: f32,
};

// 0番のバインドグループの、0番のバインディングに届くデータとして登録
@group(0) @binding(0) var<uniform> u: MyUniforms;

struct VertexOutput {
    @builtin(position) position: vec4f,
    // @location(0) を使って、三角形のIDをフラグメント側に渡す
    // @interpolate(flat) をつけると、三角形内で色が混ざらず「パキッ」と一色になります
    @location(0) @interpolate(flat) triangle_index: u32,
};

@vertex
fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> VertexOutput {

    let triangle_index: u32 = in_vertex_index / 3u;
    let triangle_vertex_index: u32 = in_vertex_index % 3u;
    var out: VertexOutput;
    out.triangle_index = triangle_index;

    // 全ての三角形の共通の中心の頂点
    if(triangle_vertex_index == 0u) {
        out.position = vec4f(0.0, 0.0, 0.0, 1.0);
        return out;
    }

    const PI: f32 = 3.14159265359;
    const triangle_count: u32 = 6u;
    
    const central_angle: f32 = 2f * PI / f32(triangle_count);

    // 動く三角形
    if(triangle_index == triangle_count){
        let moving_side_angle: f32 = u.time % (2f * PI);
        // 動く三角形の1辺目の角度
        if(triangle_vertex_index == 1u) {
            let side_angle: f32 = floor(moving_side_angle / central_angle) * central_angle;
            out.position = vec4f(cos(side_angle), sin(side_angle), 0.0, 1.0);
        } else {
            // 動く三角形の2辺目の角度
            out.position = vec4f(cos(moving_side_angle), sin(moving_side_angle), 0.0, 1.0);
        }
        return out;
    }

    // 動かない三角形
    if(triangle_vertex_index == 1u) {
        // 六角形の1辺目の角度
        let first_side_angle: f32 = f32(triangle_index) * central_angle;
        out.position = vec4f(cos(first_side_angle), sin(first_side_angle), 0.0, 1.0);
    } else {
    // 六角形の2辺目の角度
    let second_side_angle: f32 = f32(triangle_index) * central_angle + central_angle;
        out.position = vec4f(cos(second_side_angle), sin(second_side_angle), 0.0, 1.0);
    }
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    const PI: f32 = 3.14159265359;
    return vec4f(r, g, b, 1.0);
}