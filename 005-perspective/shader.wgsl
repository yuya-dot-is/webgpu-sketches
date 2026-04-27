// 円周率
const PI: f32 = 3.14159265359;

// アスペクト比タイプ： 全体を表示するように縮小
const ASPECT_TYPE_CONTAIN: u32 = 1u;
// アスペクト比タイプ： 画面いっぱいに表示するように拡大
const ASPECT_TYPE_COVER: u32 = 2u;

// 外部（JS）から届くデータの型定義
struct Context {
    matrix: mat4x4<f32>,
    time: f32,
    aspect_ratio: f32,
    mouse_x: f32,
    side_count: u32,
};

// 0番のバインドグループの、0番のバインディングに届くデータとして登録
@group(0) @binding(0) var<uniform> ctx: Context;

/**
 * vertexからfragmentに渡すデータの型定義
 */
struct VertexOutput {
    @builtin(position) position: vec4f,
    // @location(0) を使って、三角形のindexをフラグメント側に渡す
    // @interpolate(flat) をつけると、三角形内で色が混ざらず「パキッ」と一色になる
    @location(0) @interpolate(flat) triangle_local_index: u32,
};

/**
 * マウスの動きに応じて座標を回転させる
 */
fn rotate_vec2f_by_mouse_x(x: f32, y: f32) -> vec2f {
    let angle: f32 = ctx.mouse_x * PI * 2f;
    let cos_angle: f32 = cos(angle);
    let sin_angle: f32 = sin(angle);
    // 回転行列 [[cos, -sin], [sin, cos]] * [x, y] = [x * cos - y + sin, y * sin + y * cos]
    return vec2f(x * cos_angle - y * sin_angle, x * sin_angle + y * cos_angle);
}

/**
 * 頂点の座標を変換する
 */
fn transform_vertex(x: f32, y: f32) -> vec2f {
    let rotated_vec2f:vec2f = rotate_vec2f_by_mouse_x(x, y);
    return rotated_vec2f;
}

/**
 * パースペクティブ変換を適用したvec4fを作成する
 */
fn create_perspective_vec4f(x: f32, y: f32, z: f32) -> vec4f {
    let transformed_vec2f = transform_vertex(x, y);
    let transformed_vec4f = vec4f(transformed_vec2f.x, transformed_vec2f.y, z, 1.0);
    return ctx.matrix * transformed_vec4f;
}

@vertex
fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> VertexOutput {

    var out: VertexOutput;
    // 三角形のindex
    out.triangle_local_index = in_vertex_index / 3u;
    // 各三角形における頂点のindex(0~2)
    let triangle_vertex_index: u32 = in_vertex_index % 3u;

    // 全ての三角形の共通の中心の頂点
    if(triangle_vertex_index == 0u) {
        out.position = create_perspective_vec4f(0.0, 0.0, -3.0);
        return out;
    }

    // 三角形1つ分の中心の角度
    let central_angle: f32 = 2f * PI / f32(ctx.side_count);
    // 動く三角形のインデックス
    let moving_triangle_local_index = ctx.side_count;

    // 動く三角形の2つの頂点
    if(out.triangle_local_index == moving_triangle_local_index) {
        // 動く頂点が成す角度(ベース)
        let base_angle: f32 = ctx.time % (2f * PI);
        // イージング
        let easing: f32 = (1f / f32(ctx.side_count + 1u)) * sin(base_angle * f32(ctx.side_count));
        // 頂点の動きにイージングをかける
        let moving_side_angle: f32 = base_angle - easing;
        if(triangle_vertex_index == 1u) {
            // 1辺目の角度
            let first_side_angle: f32 = floor(moving_side_angle / central_angle) * central_angle;
            // 1辺目の頂点
            out.position = create_perspective_vec4f(cos(first_side_angle), sin(first_side_angle), -4.0);
        } else {
            // 2辺目の頂点
            out.position = create_perspective_vec4f(cos(moving_side_angle), sin(moving_side_angle), -4.0);
        }
        return out;
    }

    // 動かない三角形の2つの頂点
    {
        // 1辺目の角度
        let first_side_angle: f32 = f32(out.triangle_local_index) * central_angle;
        if(triangle_vertex_index == 1u) {
            // 1辺目の頂点
            out.position = create_perspective_vec4f(cos(first_side_angle), sin(first_side_angle), -4.0);
        } else {
            // 2辺目の角度
            let second_side_angle: f32 = first_side_angle + central_angle;
            // 2辺目の頂点
            out.position = create_perspective_vec4f(cos(second_side_angle), sin(second_side_angle), -4.0);
        }
        return out;
    }
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {

    // 1周にかかる時間（秒）
    const period: f32 = 2f * PI;
    // 三角形1つ分にかかる時間（秒)
    let triangle_period: f32 =  period / f32(ctx.side_count);

    // 現在、色変え中の三角形の通算のインデックス(0〜)
    let active_triangle_total_index: u32 = u32(floor(ctx.time / triangle_period));
    // 現在、色変え中の三角形のインデックス(0〜5)
    let active_triangle_local_index: u32 = active_triangle_total_index % ctx.side_count;
    // 今回のターゲットの頂点が属する三角形の通算のインデックス(0〜)
    let target_triangle_total_index: u32 = active_triangle_total_index - active_triangle_local_index + in.triangle_local_index;

    // 色の素となる数値
    var color_change_amount: f32;
    // 三角形1つ分の色の変化量
    let color_change_amount_per_triangle: f32 = 1f / f32(ctx.side_count);
    // 動く三角形のインデックス
    let moving_triangle_local_index = ctx.side_count;

    if(in.triangle_local_index == moving_triangle_local_index) {
        // 動く三角形の色の素
        color_change_amount = f32(active_triangle_total_index) * color_change_amount_per_triangle;
    } else if(in.triangle_local_index < active_triangle_local_index) {
        // 今回の周回で既に色が変わった三角形の色の素
        color_change_amount = f32(target_triangle_total_index) * color_change_amount_per_triangle;
    } else {
        // 今回の周回でまだ色が変わっていない三角形の色の素
        color_change_amount = (f32(target_triangle_total_index) - f32(ctx.side_count)) * color_change_amount_per_triangle ;
    }

    // 各色を計算（少しずつずらすことで、彩度のあるグラデーションになるように調整）
    let r: f32 = sin(color_change_amount / 0.9) * 0.5 + 0.5;
    let g: f32 = sin(color_change_amount / 0.95) * 0.5 + 0.5;
    let b: f32 = sin(color_change_amount / 1.0) * 0.5 + 0.5; 
    return vec4f(r, g, b, 1.0);
}