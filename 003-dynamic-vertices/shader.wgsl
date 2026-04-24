// 外部（JS）から届くデータの形を定義する
struct MyUniforms {
    time: f32,
    aspect_ratio: f32
};

// 0番のバインドグループの、0番のバインディングに届くデータとして登録
@group(0) @binding(0) var<uniform> u: MyUniforms;

struct VertexOutput {
    @builtin(position) position: vec4f,
    // @location(0) を使って、三角形のIDをフラグメント側に渡す
    // @interpolate(flat) をつけると、三角形内で色が混ざらず「パキッ」と一色になります
    @location(0) @interpolate(flat) triangle_index: u32,
};

const ASPECT_TYPE_CONTAIN = 1u;
const ASPECT_TYPE_COVER   = 2u;

fn to_aspect_vec2f(x: f32, y: f32, aspect_type: u32) -> vec2f {
    // アスペクト比: 高さを1.0とした時の幅
    if(aspect_type == ASPECT_TYPE_CONTAIN) {
        if(u.aspect_ratio < 1f) {
            // アスペクト比が1.0より小さい場合、高さにアスペクト比をかける
            return vec2f(x, y * u.aspect_ratio);
        } else {
            // アスペクト比が1.0より大きい場合、幅をアスペクト比で割る
            return vec2f(x / u.aspect_ratio, y);
        }
    } else {
        if(u.aspect_ratio < 1f) {
            // アスペクト比が1.0より小さい場合、高さをアスペクト比で割る
            return vec2f(x / u.aspect_ratio, y);
        } else {
            // アスペクト比が1.0より大きい場合、幅にアスペクト比をかける
            return vec2f(x, y * u.aspect_ratio);
        }
    }
}

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
            let aspect_vec2f = to_aspect_vec2f(cos(side_angle), sin(side_angle), ASPECT_TYPE_CONTAIN);
            out.position = vec4f(aspect_vec2f, 0.0, 1.0);
        } else {
            // 動く三角形の2辺目の角度
            let aspect_vec2f = to_aspect_vec2f(cos(moving_side_angle), sin(moving_side_angle), ASPECT_TYPE_CONTAIN);
            out.position = vec4f(aspect_vec2f, 0.0, 1.0);
        }
        return out;
    }

    // 動かない三角形
    if(triangle_vertex_index == 1u) {
        // 六角形の1辺目の角度
        let first_side_angle: f32 = f32(triangle_index) * central_angle;
        let aspect_vec2f = to_aspect_vec2f(cos(first_side_angle), sin(first_side_angle), ASPECT_TYPE_CONTAIN);
        out.position = vec4f(aspect_vec2f, 0.0, 1.0);
    } else {
        // 六角形の2辺目の角度
        let second_side_angle: f32 = f32(triangle_index) * central_angle + central_angle;
        let aspect_vec2f = to_aspect_vec2f(cos(second_side_angle), sin(second_side_angle), ASPECT_TYPE_CONTAIN);
        out.position = vec4f(aspect_vec2f, 0.0, 1.0);
    }
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    const PI: f32 = 3.14159265359;
    // 三角形1つ分の色の変化量
    const color_change_amount_per_triangle: f32 = 1f / 6f;
    // 1周にかかる時間（秒）
    const period: f32 = 2f * PI;
    // 三角形1つ分にかかる時間（秒)
    let triangle_period: f32 =  period / 6f;
    // 現在、何個目の三角形まで色が変わったか
    let changed_triangle_count: u32 = u32(floor(u.time / triangle_period));
    // 最後に色が変わった三角形のインデックス
    let last_changed_triangle_index: u32 = changed_triangle_count % 6u;
    let current_triangle_count: u32 = changed_triangle_count - last_changed_triangle_index + in.triangle_index;
    var change_amount: f32;
    if(in.triangle_index == 6u) {
        // 動く三角形の色の元
        change_amount = f32(changed_triangle_count) * color_change_amount_per_triangle;
    } else if(in.triangle_index < last_changed_triangle_index) {
        // 今の周回で既に色が変わった三角形の色の元
        change_amount = f32(current_triangle_count) * color_change_amount_per_triangle;
    } else {
        // 今の周回でまだ色が変わっていない三角形の色の元
        change_amount = (f32(current_triangle_count) - 6f) * color_change_amount_per_triangle ;
    }
    let r: f32 = sin(change_amount / 0.9) * 0.5 + 0.5;
    let g: f32 = sin(change_amount / 0.95) * 0.5 + 0.5;
    let b: f32 = sin(change_amount / 1.0) * 0.5 + 0.5; 
    return vec4f(r, g, b, 1.0);
}