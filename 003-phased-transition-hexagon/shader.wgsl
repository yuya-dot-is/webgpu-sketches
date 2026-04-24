// 円周率
const PI: f32 = 3.14159265359;

// アスペクト比タイプ： 全体を表示するように縮小
const ASPECT_TYPE_CONTAIN: u32 = 1u;
// アスペクト比タイプ： 画面いっぱいに表示するように拡大
const ASPECT_TYPE_COVER: u32 = 2u;

// 動く三角形のインデックス
const MOVING_TRIANGLE_LOCAL_INDEX: u32 = 6u;

// 多角形の分割数
const POLYGON_DIVISION_COUNT: u32 = 6u;

// 外部（JS）から届くデータの型定義
struct Context {
    time: f32,
    aspect_ratio: f32,
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
 * アスペクト比を考慮して座標を変換する
 */
fn to_aspect_vec2f(x: f32, y: f32, aspect_type: u32) -> vec2f {
    // アスペクト比: 高さを1.0とした時の幅
    if(aspect_type == ASPECT_TYPE_CONTAIN) {
        if(ctx.aspect_ratio < 1f) {
            // 高さが大きい場合、高さにアスペクト比(< 1.0)をかけて小さくする。
            return vec2f(x, y * ctx.aspect_ratio);
        } else {
            // 幅が大きい場合、幅をアスペクト比(>= 1.0)で割って小さくする。
            return vec2f(x / ctx.aspect_ratio, y);
        }
    } else {
        if(ctx.aspect_ratio < 1f) {
            // 幅が小さい場合、幅をアスペクト比(< 1.0)で割って大きくする。
            return vec2f(x / ctx.aspect_ratio, y);
        } else {
            // 高さが小さい場合、高さにアスペクト比(>= 1.0)をかけて大きくする。
            return vec2f(x, y * ctx.aspect_ratio);
        }
    }
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
        out.position = vec4f(0.0, 0.0, 0.0, 1.0);
        return out;
    }

    // 三角形1つ分の中心の角度
    const central_angle: f32 = 2f * PI / f32(POLYGON_DIVISION_COUNT);

    // 動く三角形の2つの頂点
    if(out.triangle_local_index == MOVING_TRIANGLE_LOCAL_INDEX) {
        // 動く頂点が成す角度
        let moving_side_angle: f32 = ctx.time % (2f * PI);
        if(triangle_vertex_index == 1u) {
            // 1辺目の角度
            let first_side_angle: f32 = floor(moving_side_angle / central_angle) * central_angle;
            // 1辺目の頂点
            let aspect_vec2f = to_aspect_vec2f(cos(first_side_angle), sin(first_side_angle), ASPECT_TYPE_CONTAIN);
            out.position = vec4f(aspect_vec2f, 0.0, 1.0);
        } else {
            // 2辺目の頂点
            let aspect_vec2f = to_aspect_vec2f(cos(moving_side_angle), sin(moving_side_angle), ASPECT_TYPE_CONTAIN);
            out.position = vec4f(aspect_vec2f, 0.0, 1.0);
        }
        return out;
    }

    // 動かない三角形の2つの頂点
    {
        // 1辺目の角度
        let first_side_angle: f32 = f32(out.triangle_local_index) * central_angle;
        if(triangle_vertex_index == 1u) {
            // 1辺目の頂点
            let aspect_vec2f = to_aspect_vec2f(cos(first_side_angle), sin(first_side_angle), ASPECT_TYPE_CONTAIN);
            out.position = vec4f(aspect_vec2f, 0.0, 1.0);
        } else {
            // 2辺目の角度
            let second_side_angle: f32 = first_side_angle + central_angle;
            // 2辺目の頂点
            let aspect_vec2f = to_aspect_vec2f(cos(second_side_angle), sin(second_side_angle), ASPECT_TYPE_CONTAIN);
            out.position = vec4f(aspect_vec2f, 0.0, 1.0);
        }
        return out;
    }
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {

    // 1周にかかる時間（秒）
    const period: f32 = 2f * PI;
    // 三角形1つ分にかかる時間（秒)
    let triangle_period: f32 =  period / f32(POLYGON_DIVISION_COUNT);

    // 現在、色変え中の三角形の通算のインデックス(0〜)
    let active_triangle_total_index: u32 = u32(floor(ctx.time / triangle_period));
    // 現在、色変え中の三角形のインデックス(0〜5)
    let active_triangle_local_index: u32 = active_triangle_total_index % POLYGON_DIVISION_COUNT;
    // 今回のターゲットの頂点が属する三角形の通算のインデックス(0〜)
    let target_triangle_total_index: u32 = active_triangle_total_index - active_triangle_local_index + in.triangle_local_index;

    // 色の素となる数値
    var color_change_amount: f32;
    // 三角形1つ分の色の変化量
    const color_change_amount_per_triangle: f32 = 1f / f32(POLYGON_DIVISION_COUNT);

    if(in.triangle_local_index == MOVING_TRIANGLE_LOCAL_INDEX) {
        // 動く三角形の色の素
        color_change_amount = f32(active_triangle_total_index) * color_change_amount_per_triangle;
    } else if(in.triangle_local_index < active_triangle_local_index) {
        // 今回の周回で既に色が変わった三角形の色の素
        color_change_amount = f32(target_triangle_total_index) * color_change_amount_per_triangle;
    } else {
        // 今回の周回でまだ色が変わっていない三角形の色の素
        color_change_amount = (f32(target_triangle_total_index) - f32(POLYGON_DIVISION_COUNT)) * color_change_amount_per_triangle ;
    }

    // 各色を計算（少しずつずらすことで、彩度のあるグラデーションになるように調整）
    let r: f32 = sin(color_change_amount / 0.9) * 0.5 + 0.5;
    let g: f32 = sin(color_change_amount / 0.95) * 0.5 + 0.5;
    let b: f32 = sin(color_change_amount / 1.0) * 0.5 + 0.5; 
    return vec4f(r, g, b, 1.0);
}