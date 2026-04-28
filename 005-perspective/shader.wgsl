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
    angle: f32,
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
 * ベクトル(u, v)を、u軸を基準(angle=0)としてv軸の方向に回転させる。
 */
fn rotate2d(u: f32, v: f32, angle: f32) -> array<f32, 2> {
    let cos = cos(angle);
    let sin = sin(angle);
    return array<f32, 2>(u * cos - v * sin, u * sin + v * cos);
}

/**
 * 頂点の座標を変換する
 */
fn transform_vertex(v: vec3f) -> vec3f {
    // z軸周りに回転
    let xy: array<f32, 2> = rotate2d(v.x, v.y, ctx.angle);
    // x軸周りに回転
    let zy: array<f32, 2> = rotate2d(v.z, xy[1], PI / 8.0);
    return vec3f(xy[0], zy[1], zy[0]);
}

/**
 * パースペクティブ変換を適用したvec4fを作成する
 */
fn create_perspective_vec4f(v: vec3f) -> vec4f {
    let transformed_vec3f = transform_vertex(v);
    // 回転した後に、物体全体を奥に押し出す
    let world_pos = vec4f(transformed_vec3f.x, transformed_vec3f.y, transformed_vec3f.z - 3.0, 1.0);
    return ctx.matrix * world_pos;
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
        out.position = create_perspective_vec4f(vec3f(0.0, 0.0, 0.5));
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
            out.position = create_perspective_vec4f(vec3f(cos(first_side_angle), sin(first_side_angle), -0.5));
        } else {
            // 2辺目の頂点
            out.position = create_perspective_vec4f(vec3f(cos(moving_side_angle), sin(moving_side_angle), -0.5));
        }
        return out;
    }

    // 動かない三角形の2つの頂点
    {
        // 1辺目の角度
        let first_side_angle: f32 = f32(out.triangle_local_index) * central_angle;
        if(triangle_vertex_index == 1u) {
            // 1辺目の頂点
            out.position = create_perspective_vec4f(vec3f(cos(first_side_angle), sin(first_side_angle), -0.5));
        } else {
            // 2辺目の角度
            let second_side_angle: f32 = first_side_angle + central_angle;
            // 2辺目の頂点
            out.position = create_perspective_vec4f(vec3f(cos(second_side_angle), sin(second_side_angle), -0.5));
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