// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // #[cfg(desktop)]
    // {
    //     builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
    //       println!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
    //       // when defining deep link schemes at runtime, you must also check `argv` here
    //     }));
    // } 
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_m3::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
